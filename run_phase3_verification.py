#!/usr/bin/env python3
"""
Command-line runner for Phase 3 Verification

This script provides a simple command-line interface to run the Phase 3 verification
suite and view results in the terminal.

Usage:
    python run_phase3_verification.py [--run] [--view-latest] [--help]
    
Options:
    --run        : Run the verification suite
    --view-latest: View the latest verification report
    --help       : Show this help message
"""

import asyncio
import sys
import argparse
import json
from pathlib import Path
from datetime import datetime

# Add project root to path  
project_root = Path(__file__).parent
sys.path.append(str(project_root))

from tests.phase3_verification import Phase3Verifier

def print_banner():
    """Print application banner"""
    print("=" * 70)
    print("🚀 AutoForwardX Phase 3 Verification Suite")
    print("=" * 70)
    print()

def print_help():
    """Print help information"""
    print(__doc__)

def view_latest_report():
    """View the latest verification report"""
    report_file = project_root / "phase3_verification_report.json"
    
    if not report_file.exists():
        print("❌ No verification report found.")
        print("   Run the verification first with: python run_phase3_verification.py --run")
        return
    
    try:
        with open(report_file, 'r') as f:
            report = json.load(f)
        
        print_banner()
        print_report_summary(report)
        
        # Ask if user wants to see detailed results
        try:
            show_details = input("\nShow detailed results? [y/N]: ").lower().strip()
            if show_details in ['y', 'yes']:
                print_detailed_results(report)
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
        
    except Exception as e:
        print(f"❌ Error reading report: {e}")

def print_report_summary(report):
    """Print report summary"""
    print(f"📋 VERIFICATION REPORT SUMMARY")
    print("-" * 40)
    print(f"⏰ Timestamp: {format_timestamp(report['timestamp'])}")
    print(f"🕐 Duration: {report['duration']:.2f} seconds")
    print(f"📊 Tests: {report['total_tests']} total")
    print(f"✅ Passed: {report['passed_tests']}")
    print(f"❌ Failed: {report['failed_tests']}")
    print(f"📈 Pass Rate: {report['pass_rate']:.1f}%")
    print()
    
    # Status assessment
    pass_rate = report['pass_rate']
    if pass_rate >= 90:
        print("🎉 STATUS: EXCELLENT - Phase 3 implementation is highly functional!")
    elif pass_rate >= 75:
        print("✅ STATUS: GOOD - Phase 3 implementation is mostly working with minor issues.")
    elif pass_rate >= 50:
        print("⚠️ STATUS: PARTIAL - Phase 3 implementation has significant gaps.")
    else:
        print("❌ STATUS: CRITICAL - Phase 3 implementation needs major work.")

def print_detailed_results(report):
    """Print detailed test results"""
    print("\n" + "=" * 70)
    print("📋 DETAILED TEST RESULTS")
    print("=" * 70)
    
    # Group tests by category
    categories = {}
    for result in report['results']:
        category = result['test_name'].split(':')[0].strip() if ':' in result['test_name'] else 'General'
        if category not in categories:
            categories[category] = []
        categories[category].append(result)
    
    for category, results in categories.items():
        print(f"\n📁 {category.upper()}")
        print("-" * 50)
        
        for result in results:
            status = "✅ PASS" if result['passed'] else "❌ FAIL"
            print(f"{status} {result['test_name']}")
            print(f"    Expected: {result['expected']}")
            print(f"    Actual: {result['actual']}")
            print(f"    Time: {result['execution_time']:.3f}s")
            
            if result.get('error'):
                print(f"    Error: {result['error']}")
            print()

async def run_verification():
    """Run the verification suite"""
    print_banner()
    print("Starting Phase 3 verification suite...")
    print("This may take several minutes to complete.")
    print()
    
    verifier = Phase3Verifier()
    
    try:
        report = await verifier.run_verification()
        
        print("\n🎯 Verification completed!")
        print(f"📄 Report saved to: phase3_verification_report.json")
        print()
        
        # Show quick summary
        print_report_summary(report.__dict__)
        
        return 0 if report.pass_rate >= 50 else 1
        
    except KeyboardInterrupt:
        print("\n⏹️ Verification interrupted by user")
        return 130
    except Exception as e:
        print(f"\n💥 Verification failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1

def format_timestamp(timestamp_str):
    """Format timestamp for display"""
    try:
        dt = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        return dt.strftime('%Y-%m-%d %H:%M:%S')
    except:
        return timestamp_str

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='AutoForwardX Phase 3 Verification Suite',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_phase3_verification.py --run           Run verification
  python run_phase3_verification.py --view-latest   View latest report  
  python run_phase3_verification.py --help          Show this help
        """
    )
    
    parser.add_argument('--run', action='store_true', 
                       help='Run the verification suite')
    parser.add_argument('--view-latest', action='store_true',
                       help='View the latest verification report')
    
    args = parser.parse_args()
    
    # If no arguments provided, show help
    if not any(vars(args).values()):
        parser.print_help()
        return 0
    
    if args.run:
        return asyncio.run(run_verification())
    elif args.view_latest:
        view_latest_report()
        return 0
    else:
        parser.print_help()
        return 0

if __name__ == "__main__":
    sys.exit(main())