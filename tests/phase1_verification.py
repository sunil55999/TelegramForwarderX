#!/usr/bin/env python3
"""
AutoForwardX Phase 1 Verification Test Script

This script verifies that all Phase 1 requirements are met according to specifications.
"""

import os
import sys
import subprocess
import requests
import time
from pathlib import Path

class Phase1Verifier:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.passed_tests = []
        self.failed_tests = []
        self.warnings = []
    
    def log_result(self, test_name: str, passed: bool, message: str = ""):
        """Log test result"""
        if passed:
            self.passed_tests.append(f"✓ {test_name}")
            print(f"✓ PASS: {test_name}")
        else:
            self.failed_tests.append(f"✗ {test_name}: {message}")
            print(f"✗ FAIL: {test_name} - {message}")
        
        if message and passed:
            print(f"  → {message}")
    
    def log_warning(self, message: str):
        """Log warning"""
        self.warnings.append(f"⚠ {message}")
        print(f"⚠ WARNING: {message}")
    
    def verify_project_structure(self):
        """Verify base project structure"""
        print("\n=== Verifying Project Structure ===")
        
        required_folders = [
            "server",
            "workers", 
            "client",
            "bot",
            "config",
            "shared",
            "sessions"
        ]
        
        for folder in required_folders:
            folder_path = self.project_root / folder
            self.log_result(
                f"Folder /{folder} exists",
                folder_path.exists(),
                f"Path: {folder_path}"
            )
    
    def verify_env_support(self):
        """Verify .env file support"""
        print("\n=== Verifying Environment Configuration ===")
        
        env_example = self.project_root / ".env.example"
        self.log_result(
            ".env.example exists",
            env_example.exists(),
            "Template for environment variables"
        )
        
        # Check if config loader exists
        config_loader = self.project_root / "config" / "env_loader.py"
        self.log_result(
            "Environment loader exists",
            config_loader.exists(),
            "Config loader for environment variables"
        )
    
    def verify_session_handling(self):
        """Verify session handling capabilities"""
        print("\n=== Verifying Session Handling ===")
        
        sessions_dir = self.project_root / "sessions"
        self.log_result(
            "Sessions directory exists",
            sessions_dir.exists(),
            "Directory for session persistence"
        )
        
        # Check for session service
        session_service = self.project_root / "server" / "services" / "telegram_service.py"
        self.log_result(
            "Telegram service exists",
            session_service.exists(),
            "Service for managing Telegram sessions"
        )
    
    def verify_api_functionality(self):
        """Verify API endpoints"""
        print("\n=== Verifying API Functionality ===")
        
        try:
            # Test health endpoint
            response = requests.get("http://localhost:5000/health", timeout=10)
            self.log_result(
                "Health endpoint responds",
                response.status_code == 200,
                f"Status: {response.status_code}"
            )
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Health endpoint responds",
                False,
                f"Connection error: {str(e)}"
            )
        
        # Check for API route files
        api_routes = self.project_root / "server" / "routes.ts"
        self.log_result(
            "API routes defined",
            api_routes.exists(),
            "TypeScript API routes file"
        )
        
        # Check for auth API
        auth_py = self.project_root / "server" / "api" / "auth.py"
        self.log_result(
            "Authentication API exists",
            auth_py.exists(),
            "Python auth API module"
        )
    
    def verify_worker_communication(self):
        """Verify worker system"""
        print("\n=== Verifying Worker Communication ===")
        
        worker_manager = self.project_root / "workers" / "worker_manager.py"
        self.log_result(
            "Worker manager exists",
            worker_manager.exists(),
            "Worker management system"
        )
        
        message_forwarder = self.project_root / "workers" / "message_forwarder.py"
        self.log_result(
            "Message forwarder exists",
            message_forwarder.exists(),
            "Message forwarding worker"
        )
        
        # Check if worker can import
        try:
            import importlib.util
            spec = importlib.util.spec_from_file_location("worker_manager", worker_manager)
            if spec and spec.loader:
                spec.loader.load_module(spec)
                self.log_result(
                    "Worker manager imports successfully",
                    True,
                    "Python module loads without errors"
                )
        except Exception as e:
            self.log_result(
                "Worker manager imports successfully", 
                False,
                f"Import error: {str(e)}"
            )
    
    def verify_dashboard_ui(self):
        """Verify dashboard UI"""
        print("\n=== Verifying Dashboard UI ===")
        
        # Check React app structure
        client_src = self.project_root / "client" / "src"
        self.log_result(
            "Client source directory exists",
            client_src.exists(),
            "React app source code"
        )
        
        app_tsx = client_src / "App.tsx"
        self.log_result(
            "App.tsx exists",
            app_tsx.exists(),
            "Main React application component"
        )
        
        # Check for pages
        pages_dir = client_src / "pages"
        if pages_dir.exists():
            page_files = list(pages_dir.glob("*.tsx"))
            self.log_result(
                "Dashboard pages exist",
                len(page_files) > 0,
                f"Found {len(page_files)} page components"
            )
        else:
            self.log_result(
                "Dashboard pages exist",
                False,
                "No pages directory found"
            )
    
    def verify_telegram_bot(self):
        """Verify Telegram bot"""
        print("\n=== Verifying Telegram Bot ===")
        
        bot_file = self.project_root / "bot" / "telegram_bot.py"
        self.log_result(
            "Telegram bot exists",
            bot_file.exists(),
            "Bot script for Telegram integration"
        )
        
        # Check if bot has required functions
        if bot_file.exists():
            try:
                with open(bot_file, 'r') as f:
                    bot_content = f.read()
                
                required_handlers = ["/start", "/auth", "/status", "/addsession"]
                for handler in required_handlers:
                    self.log_result(
                        f"Bot has {handler} handler",
                        handler in bot_content,
                        f"Command handler implemented"
                    )
            except Exception as e:
                self.log_warning(f"Could not read bot file: {e}")
    
    def verify_database_schema(self):
        """Verify database schema"""
        print("\n=== Verifying Database Schema ===")
        
        db_file = self.project_root / "server" / "database.py"
        self.log_result(
            "Database module exists",
            db_file.exists(),
            "Database connection and schema"
        )
        
        schema_file = self.project_root / "shared" / "schema.ts"
        self.log_result(
            "Database schema defined",
            schema_file.exists(),
            "TypeScript schema definitions"
        )
        
        # Check if main tables are defined in schema
        if schema_file.exists():
            try:
                with open(schema_file, 'r') as f:
                    schema_content = f.read()
                
                required_tables = ["users", "telegram_sessions", "workers", "forwarding_rules"]
                for table in required_tables:
                    self.log_result(
                        f"Table '{table}' defined",
                        table in schema_content,
                        "Schema includes table definition"
                    )
            except Exception as e:
                self.log_warning(f"Could not read schema file: {e}")
    
    def verify_logging(self):
        """Verify logging implementation"""
        print("\n=== Verifying Logging ===")
        
        logger_file = self.project_root / "server" / "utils" / "logger.py"
        self.log_result(
            "Logger module exists",
            logger_file.exists(),
            "Centralized logging system"
        )
    
    def run_all_verifications(self):
        """Run all verification tests"""
        print("🔍 AutoForwardX Phase 1 Verification")
        print("=" * 50)
        
        self.verify_project_structure()
        self.verify_env_support()
        self.verify_session_handling()
        self.verify_api_functionality()
        self.verify_worker_communication()
        self.verify_dashboard_ui()
        self.verify_telegram_bot()
        self.verify_database_schema()
        self.verify_logging()
        
        self.print_summary()
    
    def print_summary(self):
        """Print verification summary"""
        print("\n" + "=" * 50)
        print("📊 VERIFICATION SUMMARY")
        print("=" * 50)
        
        print(f"\n✅ PASSED TESTS ({len(self.passed_tests)}):")
        for test in self.passed_tests:
            print(f"  {test}")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS ({len(self.failed_tests)}):")
            for test in self.failed_tests:
                print(f"  {test}")
        
        if self.warnings:
            print(f"\n⚠️  WARNINGS ({len(self.warnings)}):")
            for warning in self.warnings:
                print(f"  {warning}")
        
        total_tests = len(self.passed_tests) + len(self.failed_tests)
        pass_rate = (len(self.passed_tests) / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n📈 OVERALL RESULT:")
        print(f"  Pass Rate: {pass_rate:.1f}% ({len(self.passed_tests)}/{total_tests})")
        
        if pass_rate >= 90:
            print("  🎉 Phase 1 is READY FOR PRODUCTION!")
        elif pass_rate >= 75:
            print("  ✅ Phase 1 is MOSTLY COMPLETE - Minor fixes needed")
        elif pass_rate >= 50:
            print("  ⚠️  Phase 1 needs SIGNIFICANT WORK")
        else:
            print("  ❌ Phase 1 is NOT READY - Major components missing")
        
        return len(self.failed_tests) == 0

if __name__ == "__main__":
    verifier = Phase1Verifier()
    success = verifier.run_all_verifications()
    
    if not success:
        sys.exit(1)