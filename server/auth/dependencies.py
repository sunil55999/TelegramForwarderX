"""
Authentication dependencies for FastAPI
"""

from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any
import jwt
from server.config import settings
from server.database import db
from server.utils.logger import logger

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """Get current authenticated user"""
    try:
        # For development, we'll use a simple approach
        # In production, you'd validate the JWT properly
        token = credentials.credentials
        
        if token == "fake-jwt-token":
            # Return fake admin user for development
            return {
                "id": "user_admin",
                "username": "admin",
                "email": "admin@autoforwardx.com",
                "user_type": "admin"
            }
        
        # If implementing real JWT validation:
        # payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        # user_id = payload.get("user_id")
        # user = await db.fetch_one("SELECT * FROM users WHERE id = ?", [user_id])
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
        
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service error"
        )

async def get_admin_user(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Require admin user"""
    if current_user.get("user_type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user