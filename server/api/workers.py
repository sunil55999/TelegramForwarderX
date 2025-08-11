"""
Workers API endpoints
"""

from fastapi import APIRouter
from server.utils.logger import logger

router = APIRouter()
workers_router = router  # For compatibility

@router.get("/")
async def get_workers():
    """Get all workers"""
    return [
        {
            "id": "worker_1",
            "status": "running",
            "memory_usage": 45.2,
            "cpu_usage": 23.1,
            "sessions_count": 2,
            "last_heartbeat": "2025-08-11T18:30:00Z"
        }
    ]