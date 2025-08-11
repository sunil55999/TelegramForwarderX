from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from server.api.auth import get_current_user, User
from server.database import db
from server.utils.logger import logger

destinations_router = APIRouter()

class DestinationRequest(BaseModel):
    sessionId: str
    chatId: str
    chatTitle: str
    chatType: str
    chatUsername: Optional[str] = None

class DestinationResponse(BaseModel):
    id: str
    sessionId: str
    chatId: str
    chatTitle: str
    chatType: str
    chatUsername: Optional[str]
    isActive: bool
    lastForwardTime: Optional[str]
    totalForwarded: int
    createdAt: str

@destinations_router.get("/", response_model=List[DestinationResponse])
async def get_destinations(current_user: User = Depends(get_current_user)):
    """Get all destinations for current user"""
    async with db.get_connection() as conn:
        destinations = await conn.fetch(
            """
            SELECT d.*, ts.session_name
            FROM destinations d
            JOIN telegram_sessions ts ON d.session_id = ts.id
            WHERE d.user_id = $1
            ORDER BY d.created_at DESC
            """,
            current_user["id"]
        )
        
        return [
            DestinationResponse(
                id=dest["id"],
                sessionId=dest["session_id"],
                chatId=dest["chat_id"],
                chatTitle=dest["chat_title"],
                chatType=dest["chat_type"],
                chatUsername=dest["chat_username"],
                isActive=dest["is_active"],
                lastForwardTime=dest["last_forward_time"].isoformat() if dest["last_forward_time"] else None,
                totalForwarded=dest["total_forwarded"],
                createdAt=dest["created_at"].isoformat()
            )
            for dest in destinations
        ]

@destinations_router.post("/", response_model=DestinationResponse)
async def add_destination(dest_data: DestinationRequest, current_user: User = Depends(get_current_user)):
    """Add a new destination channel/group"""
    try:
        # Verify session belongs to user
        async with db.get_connection() as conn:
            session = await conn.fetchrow(
                "SELECT id FROM telegram_sessions WHERE id = $1 AND user_id = $2",
                dest_data.sessionId, current_user["id"]
            )
            
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            
            # Check if destination already exists
            existing = await conn.fetchrow(
                "SELECT id FROM destinations WHERE chat_id = $1 AND session_id = $2",
                dest_data.chatId, dest_data.sessionId
            )
            
            if existing:
                raise HTTPException(status_code=409, detail="Destination already exists")
            
            # Insert new destination
            dest_id = await conn.fetchval(
                """
                INSERT INTO destinations (user_id, session_id, chat_id, chat_title, chat_type, chat_username)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
                """,
                current_user["id"], dest_data.sessionId, dest_data.chatId,
                dest_data.chatTitle, dest_data.chatType, dest_data.chatUsername
            )
            
            # Get created destination
            destination = await conn.fetchrow(
                "SELECT * FROM destinations WHERE id = $1", dest_id
            )
            
            logger.info(f"Destination added: {dest_data.chatTitle} ({dest_data.chatId}) by user {current_user['username']}")
            
            return DestinationResponse(
                id=destination["id"],
                sessionId=destination["session_id"],
                chatId=destination["chat_id"],
                chatTitle=destination["chat_title"],
                chatType=destination["chat_type"],
                chatUsername=destination["chat_username"],
                isActive=destination["is_active"],
                lastForwardTime=destination["last_forward_time"].isoformat() if destination["last_forward_time"] else None,
                totalForwarded=destination["total_forwarded"],
                createdAt=destination["created_at"].isoformat()
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding destination: {e}")
        raise HTTPException(status_code=500, detail="Failed to add destination")

@destinations_router.delete("/{destination_id}")
async def delete_destination(destination_id: str, current_user: User = Depends(get_current_user)):
    """Delete a destination"""
    async with db.get_connection() as conn:
        # Verify ownership
        destination = await conn.fetchrow(
            "SELECT * FROM destinations WHERE id = $1 AND user_id = $2",
            destination_id, current_user["id"]
        )
        
        if not destination:
            raise HTTPException(status_code=404, detail="Destination not found")
        
        # Delete destination (cascades to mappings)
        await conn.execute("DELETE FROM destinations WHERE id = $1", destination_id)
        
        logger.info(f"Destination deleted: {destination['chat_title']} by user {current_user['username']}")
        
        return {"message": "Destination deleted successfully"}

@destinations_router.patch("/{destination_id}/toggle")
async def toggle_destination(destination_id: str, current_user: User = Depends(get_current_user)):
    """Toggle destination active status"""
    async with db.get_connection() as conn:
        # Verify ownership and get current status
        destination = await conn.fetchrow(
            "SELECT is_active FROM destinations WHERE id = $1 AND user_id = $2",
            destination_id, current_user["id"]
        )
        
        if not destination:
            raise HTTPException(status_code=404, detail="Destination not found")
        
        # Toggle status
        new_status = not destination["is_active"]
        await conn.execute(
            "UPDATE destinations SET is_active = $1, updated_at = now() WHERE id = $2",
            new_status, destination_id
        )
        
        return {"isActive": new_status}