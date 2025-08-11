from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional
import jwt
from server.config import settings
from server.database import db
from server.utils.logger import logger

auth_router = APIRouter()
security = HTTPBearer()

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    user: dict
    token: str

class User(BaseModel):
    id: str
    username: str
    email: str
    user_type: str

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current authenticated user from JWT token"""
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user from database
        async with db.get_connection() as conn:
            user_record = await conn.fetchrow(
                "SELECT id, username, email, user_type FROM users WHERE username = $1 AND is_active = true",
                username
            )
            
            if not user_record:
                raise HTTPException(status_code=401, detail="User not found")
            
            return User(**dict(user_record))
            
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=settings.jwt_expire_hours)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt

@auth_router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Authenticate user and return JWT token"""
    try:
        async with db.get_connection() as conn:
            user_record = await conn.fetchrow(
                "SELECT id, username, email, password, user_type FROM users WHERE username = $1 AND is_active = true",
                request.username
            )
            
            if not user_record:
                raise HTTPException(status_code=401, detail="Invalid credentials")
            
            # In a real app, verify password hash here
            # For demo purposes, accept any password for admin
            if request.username == "admin":
                access_token = create_access_token(data={"sub": user_record["username"]})
                
                logger.info(f"User {request.username} logged in successfully")
                
                return LoginResponse(
                    user={
                        "id": user_record["id"],
                        "username": user_record["username"],
                        "email": user_record["email"],
                        "userType": user_record["user_type"],
                    },
                    token=access_token
                )
            
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
    except Exception as e:
        logger.error(f"Login error for user {request.username}: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@auth_router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user (in a real app, you'd invalidate the token)"""
    logger.info(f"User {current_user.username} logged out")
    return {"message": "Logged out successfully"}

@auth_router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user
