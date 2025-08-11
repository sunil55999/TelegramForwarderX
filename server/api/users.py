"""
Users API endpoints
"""

from fastapi import APIRouter
from server.utils.logger import logger

router = APIRouter()
users_router = router  # For compatibility

@router.get("/")
async def get_users():
    """Get all users"""
    return [
        {
            "id": "user_admin",
            "username": "admin",
            "email": "admin@autoforwardx.com",
            "user_type": "admin",
            "status": "active",
            "created_at": "2025-08-11T10:00:00Z"
        }
    ]