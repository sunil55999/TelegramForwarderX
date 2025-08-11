"""
Dashboard API endpoints
"""

from fastapi import APIRouter
from server.utils.logger import logger

router = APIRouter()
dashboard_router = router  # For compatibility

@router.get("/stats")
async def get_dashboard_stats():
    """Get dashboard statistics"""
    return {
        "activeSessions": 3,
        "activeWorkers": 2,
        "messagesToday": 145,
        "totalUsers": 5
    }

@router.get("/health")
async def get_system_health():
    """Get system health status"""
    return {
        "status": "healthy",
        "uptime": "2 hours 15 minutes",
        "memory_usage": 45.2,
        "cpu_usage": 23.1
    }

@router.get("/activity")
async def get_activity_feed():
    """Get recent activity"""
    return [
        {
            "id": "1",
            "type": "message_forwarded",
            "description": "Message forwarded from Channel A to Channel B",
            "timestamp": "2025-08-11T18:30:00Z"
        },
        {
            "id": "2", 
            "type": "session_connected",
            "description": "Telegram session connected",
            "timestamp": "2025-08-11T18:25:00Z"
        }
    ]