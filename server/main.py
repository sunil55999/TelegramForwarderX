import asyncio
import uvicorn
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import sys

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server.config import settings
from server.database import init_database
from server.api.auth import auth_router
from server.api.sessions import sessions_router
from server.api.workers import workers_router
from server.api.users import users_router
from server.api.dashboard import dashboard_router
from server.utils.logger import setup_logging, logger

# Initialize logging
setup_logging()

app = FastAPI(
    title="AutoForwardX API",
    description="Scalable Telegram message forwarding system",
    version="1.0.0",
    debug=settings.debug
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
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

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    logger.info("Starting AutoForwardX application...")
    
    try:
        # Initialize database
        await init_database()
        logger.info("Database initialized successfully")
        
        # Start background services
        # asyncio.create_task(start_worker_manager())
        # asyncio.create_task(start_telegram_bot())
        
        logger.info("AutoForwardX started successfully")
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "AutoForwardX"}

# Serve static files (React build)
if not settings.debug:
    # In production, serve the built React app
    app.mount("/static", StaticFiles(directory="dist/public/static"), name="static")
    
    @app.get("/{path:path}")
    async def serve_react_app(path: str):
        """Serve React app for all non-API routes"""
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        # Check if file exists in build directory
        file_path = f"dist/public/{path}"
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Default to index.html for React routing
        return FileResponse("dist/public/index.html")

if __name__ == "__main__":
    uvicorn.run(
        "server.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )
