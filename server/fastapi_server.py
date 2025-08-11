"""
FastAPI server for AutoForwardX Phase 3
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.config import settings
from server.database import init_database
from server.api.auth import auth_router
from server.api.sessions import sessions_router
from server.api.workers import workers_router
from server.api.users import users_router
from server.api.dashboard import dashboard_router
# Phase 3 routers
from server.api.regex_rules import router as regex_rules_router
from server.api.statistics import router as statistics_router
from server.api.pending_messages import router as pending_messages_router

app = FastAPI(
    title="AutoForwardX API",
    description="Advanced Telegram Message Forwarding System - Phase 3",
    version="3.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(auth_router, prefix="/api/auth", tags=["authentication"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(sessions_router, prefix="/api/sessions", tags=["sessions"])
app.include_router(workers_router, prefix="/api/workers", tags=["workers"])
app.include_router(users_router, prefix="/api/users", tags=["users"])
# Phase 3 routes
app.include_router(regex_rules_router, prefix="/api/regex-rules", tags=["regex-rules"])
app.include_router(statistics_router, prefix="/api/statistics", tags=["statistics"])
app.include_router(pending_messages_router, prefix="/api/pending-messages", tags=["pending-messages"])

@app.on_event("startup")
async def startup_event():
    """Initialize database connection on startup"""
    print("Starting AutoForwardX FastAPI server...")
    await init_database()
    print("FastAPI server initialized successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("Shutting down AutoForwardX FastAPI server...")

@app.get("/")
async def root():
    return {"message": "AutoForwardX Phase 3 API is running", "version": "3.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "phase": 3}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)