#!/usr/bin/env python3
"""
Phase 3 startup script for AutoForwardX
Starts the FastAPI backend server
"""

import subprocess
import sys
import os

def main():
    print("Starting AutoForwardX Phase 3...")
    print("Initializing FastAPI backend server...")
    
    try:
        # Start FastAPI server
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "server.fastapi_server:app", 
            "--host", "0.0.0.0", 
            "--port", "8000",
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\nShutting down AutoForwardX Phase 3...")
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()