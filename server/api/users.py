from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from server.api.auth import get_current_user, User
from server.database import db

users_router = APIRouter()

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    userType: str = "free"

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    userType: Optional[str] = None
    isActive: Optional[bool] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    userType: str
    isActive: bool
    createdAt: datetime
    updatedAt: datetime
    sessionsCount: Optional[int] = 0

@users_router.get("", response_model=List[UserResponse])
async def get_users(current_user: User = Depends(get_current_user)):
    """Get all users (admin only)"""
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view all users")
    
    async with db.get_connection() as conn:
        users = await conn.fetch(
            """
            SELECT 
                u.*,
                COUNT(ts.id) as sessions_count
            FROM users u
            LEFT JOIN telegram_sessions ts ON u.id = ts.user_id
            GROUP BY u.id, u.username, u.email, u.user_type, u.is_active, u.created_at, u.updated_at
            ORDER BY u.created_at DESC
            """
        )
        
        result = []
        for user in users:
            user_data = UserResponse(
                id=user["id"],
                username=user["username"],
                email=user["email"],
                userType=user["user_type"],
                isActive=user["is_active"],
                createdAt=user["created_at"],
                updatedAt=user["updated_at"],
                sessionsCount=user["sessions_count"]
            )
            result.append(user_data)
        
        return result

@users_router.post("", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new user (admin only)"""
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create users")
    
    async with db.get_connection() as conn:
        # Check if username or email already exists
        existing_user = await conn.fetchrow(
            "SELECT id FROM users WHERE username = $1 OR email = $2",
            user_data.username,
            user_data.email
        )
        
        if existing_user:
            raise HTTPException(
                status_code=400, 
                detail="User with this username or email already exists"
            )
        
        # In a real app, hash the password here
        # password_hash = hash_password(user_data.password)
        password_hash = user_data.password  # For demo purposes
        
        user_id = await conn.fetchval(
            """
            INSERT INTO users (username, email, password, user_type)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            """,
            user_data.username,
            user_data.email,
            password_hash,
            user_data.userType
        )
        
        # Log the creation
        await conn.execute(
            """
            INSERT INTO system_logs (level, message, component, metadata)
            VALUES ('info', $1, 'auth', $2)
            """,
            f"New user created: {user_data.username}",
            f'{{"user_id": "{user_id}", "created_by": "{current_user.id}"}}'
        )
        
        # Fetch the created user
        user = await conn.fetchrow(
            "SELECT * FROM users WHERE id = $1",
            user_id
        )
        
        return UserResponse(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            userType=user["user_type"],
            isActive=user["is_active"],
            createdAt=user["created_at"],
            updatedAt=user["updated_at"],
            sessionsCount=0
        )

@users_router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    updates: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a user"""
    # Users can update themselves, admins can update anyone
    if current_user.user_type != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this user")
    
    async with db.get_connection() as conn:
        # Check if user exists
        existing_user = await conn.fetchrow(
            "SELECT username FROM users WHERE id = $1",
            user_id
        )
        
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check for username/email conflicts
        if updates.username or updates.email:
            conflict_query = "SELECT id FROM users WHERE id != $1 AND ("
            conflict_params = [user_id]
            conflict_conditions = []
            
            if updates.username:
                conflict_conditions.append(f"username = ${len(conflict_params) + 1}")
                conflict_params.append(updates.username)
            
            if updates.email:
                conflict_conditions.append(f"email = ${len(conflict_params) + 1}")
                conflict_params.append(updates.email)
            
            conflict_query += " OR ".join(conflict_conditions) + ")"
            
            conflict = await conn.fetchrow(conflict_query, *conflict_params)
            if conflict:
                raise HTTPException(
                    status_code=400,
                    detail="User with this username or email already exists"
                )
        
        # Build update query dynamically
        set_clauses = []
        values = []
        param_count = 1
        
        if updates.username is not None:
            set_clauses.append(f"username = ${param_count}")
            values.append(updates.username)
            param_count += 1
        
        if updates.email is not None:
            set_clauses.append(f"email = ${param_count}")
            values.append(updates.email)
            param_count += 1
        
        if updates.userType is not None and current_user.user_type == "admin":
            set_clauses.append(f"user_type = ${param_count}")
            values.append(updates.userType)
            param_count += 1
        
        if updates.isActive is not None and current_user.user_type == "admin":
            set_clauses.append(f"is_active = ${param_count}")
            values.append(updates.isActive)
            param_count += 1
        
        if not set_clauses:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        set_clauses.append(f"updated_at = ${param_count}")
        values.append(datetime.now())
        values.append(user_id)
        
        update_query = f"""
            UPDATE users 
            SET {', '.join(set_clauses)}
            WHERE id = ${param_count + 1}
        """
        
        await conn.execute(update_query, *values)
        
        # Log the update
        await conn.execute(
            """
            INSERT INTO system_logs (level, message, component, metadata)
            VALUES ('info', $1, 'auth', $2)
            """,
            f"User {existing_user['username']} updated",
            f'{{"user_id": "{user_id}", "updated_by": "{current_user.id}"}}'
        )
        
        # Fetch updated user with session count
        user = await conn.fetchrow(
            """
            SELECT 
                u.*,
                COUNT(ts.id) as sessions_count
            FROM users u
            LEFT JOIN telegram_sessions ts ON u.id = ts.user_id
            WHERE u.id = $1
            GROUP BY u.id, u.username, u.email, u.user_type, u.is_active, u.created_at, u.updated_at
            """,
            user_id
        )
        
        return UserResponse(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            userType=user["user_type"],
            isActive=user["is_active"],
            createdAt=user["created_at"],
            updatedAt=user["updated_at"],
            sessionsCount=user["sessions_count"]
        )

@users_router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a user (admin only)"""
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete users")
    
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    async with db.get_connection() as conn:
        # Check if user exists
        existing_user = await conn.fetchrow(
            "SELECT username FROM users WHERE id = $1",
            user_id
        )
        
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if user has active sessions
        active_sessions = await conn.fetchval(
            "SELECT COUNT(*) FROM telegram_sessions WHERE user_id = $1 AND status = 'active'",
            user_id
        )
        
        if active_sessions > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete user with {active_sessions} active sessions. Stop sessions first."
            )
        
        # Delete the user (this will cascade delete sessions due to foreign key)
        await conn.execute(
            "DELETE FROM users WHERE id = $1",
            user_id
        )
        
        # Log the deletion
        await conn.execute(
            """
            INSERT INTO system_logs (level, message, component, metadata)
            VALUES ('info', $1, 'auth', $2)
            """,
            f"User {existing_user['username']} deleted",
            f'{{"user_id": "{user_id}", "deleted_by": "{current_user.id}"}}'
        )
        
        return {"message": "User deleted successfully"}
