from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from server.api.auth import get_current_user, User
from server.database import db
from server.utils.logger import logger

sources_router = APIRouter()

class SourceRequest(BaseModel):
    sessionId: str
    chatId: str
    chatTitle: str
    chatType: str
    chatUsername: Optional[str] = None

class SourceResponse(BaseModel):
    id: str
    sessionId: str
    chatId: str
    chatTitle: str
    chatType: str
    chatUsername: Optional[str]
    isActive: bool
    lastMessageTime: Optional[str]
    totalMessages: int
    createdAt: str

@sources_router.get("/", response_model=List[SourceResponse])
async def get_sources(current_user: User = Depends(get_current_user)):
    """Get all sources for current user"""
    async with db.get_connection() as conn:
        sources = await conn.fetch(
            """
            SELECT s.*, ts.session_name
            FROM sources s
            JOIN telegram_sessions ts ON s.session_id = ts.id
            WHERE s.user_id = $1
            ORDER BY s.created_at DESC
            """,
            current_user["id"]
        )
        
        return [
            SourceResponse(
                id=source["id"],
                sessionId=source["session_id"],
                chatId=source["chat_id"],
                chatTitle=source["chat_title"],
                chatType=source["chat_type"],
                chatUsername=source["chat_username"],
                isActive=source["is_active"],
                lastMessageTime=source["last_message_time"].isoformat() if source["last_message_time"] else None,
                totalMessages=source["total_messages"],
                createdAt=source["created_at"].isoformat()
            )
            for source in sources
        ]

@sources_router.post("/", response_model=SourceResponse)
async def add_source(source_data: SourceRequest, current_user: User = Depends(get_current_user)):
    """Add a new source channel/group"""
    try:
        # Verify session belongs to user
        async with db.get_connection() as conn:
            session = await conn.fetchrow(
                "SELECT id FROM telegram_sessions WHERE id = $1 AND user_id = $2",
                source_data.sessionId, current_user["id"]
            )
            
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            
            # Check if source already exists
            existing = await conn.fetchrow(
                "SELECT id FROM sources WHERE chat_id = $1 AND session_id = $2",
                source_data.chatId, source_data.sessionId
            )
            
            if existing:
                raise HTTPException(status_code=409, detail="Source already exists")
            
            # Insert new source
            source_id = await conn.fetchval(
                """
                INSERT INTO sources (user_id, session_id, chat_id, chat_title, chat_type, chat_username)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
                """,
                current_user["id"], source_data.sessionId, source_data.chatId,
                source_data.chatTitle, source_data.chatType, source_data.chatUsername
            )
            
            # Get created source
            source = await conn.fetchrow(
                "SELECT * FROM sources WHERE id = $1", source_id
            )
            
            logger.info(f"Source added: {source_data.chatTitle} ({source_data.chatId}) by user {current_user['username']}")
            
            return SourceResponse(
                id=source["id"],
                sessionId=source["session_id"],
                chatId=source["chat_id"],
                chatTitle=source["chat_title"],
                chatType=source["chat_type"],
                chatUsername=source["chat_username"],
                isActive=source["is_active"],
                lastMessageTime=source["last_message_time"].isoformat() if source["last_message_time"] else None,
                totalMessages=source["total_messages"],
                createdAt=source["created_at"].isoformat()
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding source: {e}")
        raise HTTPException(status_code=500, detail="Failed to add source")

@sources_router.delete("/{source_id}")
async def delete_source(source_id: str, current_user: User = Depends(get_current_user)):
    """Delete a source"""
    async with db.get_connection() as conn:
        # Verify ownership
        source = await conn.fetchrow(
            "SELECT * FROM sources WHERE id = $1 AND user_id = $2",
            source_id, current_user["id"]
        )
        
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")
        
        # Delete source (cascades to mappings)
        await conn.execute("DELETE FROM sources WHERE id = $1", source_id)
        
        logger.info(f"Source deleted: {source['chat_title']} by user {current_user['username']}")
        
        return {"message": "Source deleted successfully"}

@sources_router.patch("/{source_id}/toggle")
async def toggle_source(source_id: str, current_user: User = Depends(get_current_user)):
    """Toggle source active status"""
    async with db.get_connection() as conn:
        # Verify ownership and get current status
        source = await conn.fetchrow(
            "SELECT is_active FROM sources WHERE id = $1 AND user_id = $2",
            source_id, current_user["id"]
        )
        
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")
        
        # Toggle status
        new_status = not source["is_active"]
        await conn.execute(
            "UPDATE sources SET is_active = $1, updated_at = now() WHERE id = $2",
            new_status, source_id
        )
        
        return {"isActive": new_status}