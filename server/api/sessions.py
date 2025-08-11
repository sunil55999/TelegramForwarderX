from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from server.api.auth import get_current_user, User
from server.database import db

sessions_router = APIRouter()

class SessionCreate(BaseModel):
    sessionName: str
    phoneNumber: str
    apiId: str
    apiHash: str

class SessionUpdate(BaseModel):
    status: Optional[str] = None
    workerId: Optional[str] = None
    messageCount: Optional[int] = None

class SessionResponse(BaseModel):
    id: str
    userId: str
    sessionName: str
    phoneNumber: str
    status: str
    workerId: Optional[str]
    messageCount: int
    lastActivity: Optional[datetime]
    createdAt: datetime
    userDetails: Optional[dict]
    workerDetails: Optional[dict]

@sessions_router.get("", response_model=List[SessionResponse])
async def get_sessions(current_user: User = Depends(get_current_user)):
    """Get all telegram sessions with user and worker details"""
    async with db.get_connection() as conn:
        sessions = await conn.fetch(
            """
            SELECT 
                s.*,
                u.username as user_username,
                u.user_type as user_type,
                w.name as worker_name
            FROM telegram_sessions s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN workers w ON s.worker_id = w.id
            ORDER BY s.created_at DESC
            """
        )
        
        result = []
        for session in sessions:
            session_data = SessionResponse(
                id=session["id"],
                userId=session["user_id"],
                sessionName=session["session_name"],
                phoneNumber=session["phone_number"],
                status=session["status"],
                workerId=session["worker_id"],
                messageCount=session["message_count"],
                lastActivity=session["last_activity"],
                createdAt=session["created_at"],
                userDetails={
                    "username": session["user_username"],
                    "userType": session["user_type"]
                } if session["user_username"] else None,
                workerDetails={
                    "name": session["worker_name"]
                } if session["worker_name"] else None
            )
            result.append(session_data)
        
        return result

@sessions_router.post("", response_model=SessionResponse)
async def create_session(
    session_data: SessionCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new telegram session"""
    async with db.get_connection() as conn:
        # Insert new session
        session_id = await conn.fetchval(
            """
            INSERT INTO telegram_sessions (
                user_id, session_name, phone_number, api_id, api_hash, status
            )
            VALUES ($1, $2, $3, $4, $5, 'idle')
            RETURNING id
            """,
            current_user.id,
            session_data.sessionName,
            session_data.phoneNumber,
            session_data.apiId,
            session_data.apiHash
        )
        
        # Log the creation
        await conn.execute(
            """
            INSERT INTO system_logs (level, message, component, metadata)
            VALUES ('info', $1, 'session', $2)
            """,
            f"New session created: {session_data.sessionName}",
            f'{{"session_id": "{session_id}", "user_id": "{current_user.id}"}}'
        )
        
        # Fetch the created session with details
        session = await conn.fetchrow(
            """
            SELECT 
                s.*,
                u.username as user_username,
                u.user_type as user_type
            FROM telegram_sessions s
            LEFT JOIN users u ON s.user_id = u.id
            WHERE s.id = $1
            """,
            session_id
        )
        
        return SessionResponse(
            id=session["id"],
            userId=session["user_id"],
            sessionName=session["session_name"],
            phoneNumber=session["phone_number"],
            status=session["status"],
            workerId=session["worker_id"],
            messageCount=session["message_count"],
            lastActivity=session["last_activity"],
            createdAt=session["created_at"],
            userDetails={
                "username": session["user_username"],
                "userType": session["user_type"]
            },
            workerDetails=None
        )

@sessions_router.put("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: str,
    updates: SessionUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a telegram session"""
    async with db.get_connection() as conn:
        # Check if session exists and user has permission
        existing_session = await conn.fetchrow(
            "SELECT user_id FROM telegram_sessions WHERE id = $1",
            session_id
        )
        
        if not existing_session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Allow admin to update any session, otherwise check ownership
        if current_user.user_type != "admin" and existing_session["user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this session")
        
        # Build update query dynamically
        set_clauses = []
        values = []
        param_count = 1
        
        if updates.status is not None:
            set_clauses.append(f"status = ${param_count}")
            values.append(updates.status)
            param_count += 1
        
        if updates.workerId is not None:
            set_clauses.append(f"worker_id = ${param_count}")
            values.append(updates.workerId)
            param_count += 1
        
        if updates.messageCount is not None:
            set_clauses.append(f"message_count = ${param_count}")
            values.append(updates.messageCount)
            param_count += 1
        
        if not set_clauses:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        set_clauses.append(f"updated_at = ${param_count}")
        values.append(datetime.now())
        values.append(session_id)
        
        update_query = f"""
            UPDATE telegram_sessions 
            SET {', '.join(set_clauses)}
            WHERE id = ${param_count + 1}
        """
        
        await conn.execute(update_query, *values)
        
        # Log the update
        await conn.execute(
            """
            INSERT INTO system_logs (level, message, component, metadata)
            VALUES ('info', $1, 'session', $2)
            """,
            f"Session {session_id} updated",
            f'{{"session_id": "{session_id}", "updated_by": "{current_user.id}"}}'
        )
        
        # Fetch updated session
        session = await conn.fetchrow(
            """
            SELECT 
                s.*,
                u.username as user_username,
                u.user_type as user_type,
                w.name as worker_name
            FROM telegram_sessions s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN workers w ON s.worker_id = w.id
            WHERE s.id = $1
            """,
            session_id
        )
        
        return SessionResponse(
            id=session["id"],
            userId=session["user_id"],
            sessionName=session["session_name"],
            phoneNumber=session["phone_number"],
            status=session["status"],
            workerId=session["worker_id"],
            messageCount=session["message_count"],
            lastActivity=session["last_activity"],
            createdAt=session["created_at"],
            userDetails={
                "username": session["user_username"],
                "userType": session["user_type"]
            },
            workerDetails={
                "name": session["worker_name"]
            } if session["worker_name"] else None
        )

@sessions_router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a telegram session"""
    async with db.get_connection() as conn:
        # Check if session exists and user has permission
        existing_session = await conn.fetchrow(
            "SELECT user_id, session_name FROM telegram_sessions WHERE id = $1",
            session_id
        )
        
        if not existing_session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Allow admin to delete any session, otherwise check ownership
        if current_user.user_type != "admin" and existing_session["user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this session")
        
        # Delete the session
        await conn.execute(
            "DELETE FROM telegram_sessions WHERE id = $1",
            session_id
        )
        
        # Log the deletion
        await conn.execute(
            """
            INSERT INTO system_logs (level, message, component, metadata)
            VALUES ('info', $1, 'session', $2)
            """,
            f"Session {existing_session['session_name']} deleted",
            f'{{"session_id": "{session_id}", "deleted_by": "{current_user.id}"}}'
        )
        
        return {"message": "Session deleted successfully"}
