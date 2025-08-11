"""
Sessions API endpoints
"""

from fastapi import APIRouter
from server.utils.logger import logger

router = APIRouter()
sessions_router = router  # For compatibility

@router.get("/")
async def get_sessions():
    """Get all sessions"""
    return [
        {
            "id": "session_1",
            "phone_number": "+1234567890",
            "status": "connected",
            "worker_id": "worker_1",
            "last_activity": "2025-08-11T18:30:00Z"
        }
    ]