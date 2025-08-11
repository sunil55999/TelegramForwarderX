"""
Authentication API endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from server.utils.logger import logger

router = APIRouter()
auth_router = router  # For compatibility

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    user: dict

@router.post("/login")
async def login(login_data: LoginRequest):
    """Login endpoint - simplified for development"""
    try:
        # For development, accept any credentials
        if login_data.username and login_data.password:
            return LoginResponse(
                access_token="fake-jwt-token",
                user={
                    "id": "user_admin",
                    "username": login_data.username,
                    "email": f"{login_data.username}@autoforwardx.com",
                    "user_type": "admin"
                }
            )
        else:
            raise HTTPException(status_code=400, detail="Username and password required")
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@router.post("/logout")
async def logout():
    """Logout endpoint"""
    return {"message": "Logged out successfully"}