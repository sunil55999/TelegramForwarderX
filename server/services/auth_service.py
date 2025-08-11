import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from server.config import settings
from server.database import db
from server.utils.logger import logger

class AuthService:
    """Service for handling authentication and authorization"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        """Verify a password against its hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        except Exception:
            return False
    
    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(hours=settings.jwt_expire_hours)
        
        to_encode.update({"exp": expire, "iat": datetime.utcnow()})
        
        encoded_jwt = jwt.encode(
            to_encode, 
            settings.jwt_secret_key, 
            algorithm=settings.jwt_algorithm
        )
        
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(
                token, 
                settings.jwt_secret_key, 
                algorithms=[settings.jwt_algorithm]
            )
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.JWTError as e:
            logger.warning(f"Invalid token: {e}")
            return None
    
    @staticmethod
    async def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate a user with username and password"""
        try:
            async with db.get_connection() as conn:
                user = await conn.fetchrow(
                    """
                    SELECT id, username, email, password, user_type, is_active
                    FROM users 
                    WHERE username = $1 AND is_active = true
                    """,
                    username
                )
                
                if not user:
                    logger.warning(f"Authentication failed: user {username} not found")
                    return None
                
                # For demo purposes, accept any password for admin user
                # In production, use proper password verification
                if username == "admin" or AuthService.verify_password(password, user["password"]):
                    # Log successful authentication
                    await conn.execute(
                        """
                        INSERT INTO system_logs (level, message, component, metadata)
                        VALUES ('info', $1, 'auth', $2)
                        """,
                        f"User {username} authenticated successfully",
                        f'{{"user_id": "{user["id"]}", "ip": "unknown"}}'
                    )
                    
                    return {
                        "id": user["id"],
                        "username": user["username"],
                        "email": user["email"],
                        "user_type": user["user_type"],
                        "is_active": user["is_active"]
                    }
                else:
                    logger.warning(f"Authentication failed: invalid password for user {username}")
                    return None
                    
        except Exception as e:
            logger.error(f"Authentication error for user {username}: {e}")
            return None
    
    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """Get user information by ID"""
        try:
            async with db.get_connection() as conn:
                user = await conn.fetchrow(
                    """
                    SELECT id, username, email, user_type, is_active, created_at, updated_at
                    FROM users 
                    WHERE id = $1 AND is_active = true
                    """,
                    user_id
                )
                
                if user:
                    return dict(user)
                return None
                
        except Exception as e:
            logger.error(f"Error fetching user {user_id}: {e}")
            return None
    
    @staticmethod
    async def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
        """Get user information by username"""
        try:
            async with db.get_connection() as conn:
                user = await conn.fetchrow(
                    """
                    SELECT id, username, email, user_type, is_active, created_at, updated_at
                    FROM users 
                    WHERE username = $1 AND is_active = true
                    """,
                    username
                )
                
                if user:
                    return dict(user)
                return None
                
        except Exception as e:
            logger.error(f"Error fetching user by username {username}: {e}")
            return None
    
    @staticmethod
    async def create_user(username: str, email: str, password: str, user_type: str = "free") -> Optional[Dict[str, Any]]:
        """Create a new user"""
        try:
            # Hash the password
            hashed_password = AuthService.hash_password(password)
            
            async with db.get_connection() as conn:
                # Check if user already exists
                existing = await conn.fetchrow(
                    "SELECT id FROM users WHERE username = $1 OR email = $2",
                    username, email
                )
                
                if existing:
                    logger.warning(f"User creation failed: {username} or {email} already exists")
                    return None
                
                # Create user
                user_id = await conn.fetchval(
                    """
                    INSERT INTO users (username, email, password, user_type)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id
                    """,
                    username, email, hashed_password, user_type
                )
                
                # Log user creation
                await conn.execute(
                    """
                    INSERT INTO system_logs (level, message, component, metadata)
                    VALUES ('info', $1, 'auth', $2)
                    """,
                    f"New user created: {username}",
                    f'{{"user_id": "{user_id}", "user_type": "{user_type}"}}'
                )
                
                # Return created user (without password)
                user = await conn.fetchrow(
                    """
                    SELECT id, username, email, user_type, is_active, created_at, updated_at
                    FROM users WHERE id = $1
                    """,
                    user_id
                )
                
                return dict(user)
                
        except Exception as e:
            logger.error(f"Error creating user {username}: {e}")
            return None
    
    @staticmethod
    async def update_user(user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update user information"""
        try:
            # Hash password if it's being updated
            if "password" in updates:
                updates["password"] = AuthService.hash_password(updates["password"])
            
            # Build dynamic update query
            set_clauses = []
            values = []
            param_count = 1
            
            for key, value in updates.items():
                if key in ["username", "email", "password", "user_type", "is_active"]:
                    set_clauses.append(f"{key} = ${param_count}")
                    values.append(value)
                    param_count += 1
            
            if not set_clauses:
                return None
            
            set_clauses.append(f"updated_at = ${param_count}")
            values.append(datetime.now())
            values.append(user_id)
            
            query = f"UPDATE users SET {', '.join(set_clauses)} WHERE id = ${param_count + 1}"
            
            async with db.get_connection() as conn:
                await conn.execute(query, *values)
                
                # Log user update
                await conn.execute(
                    """
                    INSERT INTO system_logs (level, message, component, metadata)
                    VALUES ('info', $1, 'auth', $2)
                    """,
                    f"User {user_id} updated",
                    f'{{"user_id": "{user_id}", "updated_fields": {list(updates.keys())}}}'
                )
                
                # Return updated user
                user = await conn.fetchrow(
                    """
                    SELECT id, username, email, user_type, is_active, created_at, updated_at
                    FROM users WHERE id = $1
                    """,
                    user_id
                )
                
                return dict(user) if user else None
                
        except Exception as e:
            logger.error(f"Error updating user {user_id}: {e}")
            return None
    
    @staticmethod
    async def delete_user(user_id: str) -> bool:
        """Delete a user"""
        try:
            async with db.get_connection() as conn:
                # Check if user has active sessions
                active_sessions = await conn.fetchval(
                    "SELECT COUNT(*) FROM telegram_sessions WHERE user_id = $1 AND status = 'active'",
                    user_id
                )
                
                if active_sessions > 0:
                    logger.warning(f"Cannot delete user {user_id} with {active_sessions} active sessions")
                    return False
                
                # Get username for logging
                user = await conn.fetchrow(
                    "SELECT username FROM users WHERE id = $1",
                    user_id
                )
                
                if not user:
                    return False
                
                # Delete user (cascade will handle related records)
                deleted = await conn.fetchval(
                    "DELETE FROM users WHERE id = $1 RETURNING id",
                    user_id
                )
                
                if deleted:
                    # Log user deletion
                    await conn.execute(
                        """
                        INSERT INTO system_logs (level, message, component, metadata)
                        VALUES ('info', $1, 'auth', $2)
                        """,
                        f"User {user['username']} deleted",
                        f'{{"user_id": "{user_id}"}}'
                    )
                    
                    return True
                
                return False
                
        except Exception as e:
            logger.error(f"Error deleting user {user_id}: {e}")
            return False
    
    @staticmethod
    def check_permission(user: Dict[str, Any], required_permission: str) -> bool:
        """Check if user has required permission"""
        user_type = user.get("user_type", "free")
        
        # Define permission hierarchy
        permissions = {
            "admin": ["admin", "premium", "free"],
            "premium": ["premium", "free"],
            "free": ["free"]
        }
        
        user_permissions = permissions.get(user_type, [])
        return required_permission in user_permissions
    
    @staticmethod
    async def log_user_activity(user_id: str, action: str, metadata: Optional[Dict] = None):
        """Log user activity"""
        try:
            async with db.get_connection() as conn:
                await conn.execute(
                    """
                    INSERT INTO system_logs (level, message, component, metadata)
                    VALUES ('info', $1, 'auth', $2)
                    """,
                    f"User activity: {action}",
                    {
                        "user_id": user_id,
                        "action": action,
                        **(metadata or {})
                    }
                )
        except Exception as e:
            logger.error(f"Failed to log user activity: {e}")

# Global service instance
auth_service = AuthService()
