import asyncio
import os
from typing import Optional, Dict, Any, List
from telethon import TelegramClient, events
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError
from telethon.sessions import StringSession
from server.config import settings
from server.utils.logger import logger
from server.database import db

class TelegramService:
    """Service for managing Telegram client connections using Telethon"""
    
    def __init__(self):
        self.clients: Dict[str, TelegramClient] = {}
        self.active_sessions: Dict[str, dict] = {}
    
    async def create_session(self, session_id: str, api_id: str, api_hash: str, 
                           phone_number: str, session_data: Optional[str] = None) -> TelegramClient:
        """Create a new Telegram client session"""
        try:
            # Use existing session data or create new session
            session = StringSession(session_data) if session_data else StringSession()
            
            client = TelegramClient(session, int(api_id), api_hash)
            
            # Connect to Telegram
            await client.connect()
            
            if not await client.is_user_authorized():
                logger.info(f"Starting authorization for session {session_id}")
                # Send code request
                sent_code = await client.send_code_request(phone_number)
                
                # Store client temporarily for code verification
                self.clients[f"temp_{session_id}"] = client
                
                return client
            else:
                # Already authorized, store and return
                self.clients[session_id] = client
                self.active_sessions[session_id] = {
                    "client": client,
                    "phone": phone_number,
                    "status": "active",
                    "message_count": 0
                }
                
                logger.info(f"Session {session_id} connected successfully")
                return client
                
        except Exception as e:
            logger.error(f"Failed to create session {session_id}: {e}")
            raise
    
    async def verify_code(self, session_id: str, code: str, password: Optional[str] = None) -> bool:
        """Verify phone code and complete authorization"""
        try:
            client = self.clients.get(f"temp_{session_id}")
            if not client:
                raise ValueError("Session not found or expired")
            
            try:
                await client.sign_in(code=code)
            except SessionPasswordNeededError:
                if not password:
                    raise ValueError("Two-factor authentication password required")
                await client.sign_in(password=password)
            
            # Authorization successful, move to active sessions
            session_string = client.session.save()
            self.clients[session_id] = client
            self.active_sessions[session_id] = {
                "client": client,
                "status": "active",
                "message_count": 0,
                "session_string": session_string
            }
            
            # Remove temporary client
            del self.clients[f"temp_{session_id}"]
            
            # Update database with session string
            async with db.get_connection() as conn:
                await conn.execute(
                    "UPDATE telegram_sessions SET session_data = $1, status = 'active' WHERE id = $2",
                    session_string, session_id
                )
            
            logger.info(f"Session {session_id} authorized successfully")
            return True
            
        except PhoneCodeInvalidError:
            logger.error(f"Invalid phone code for session {session_id}")
            return False
        except Exception as e:
            logger.error(f"Failed to verify code for session {session_id}: {e}")
            return False
    
    async def disconnect_session(self, session_id: str) -> bool:
        """Disconnect a Telegram session"""
        try:
            if session_id in self.clients:
                await self.clients[session_id].disconnect()
                del self.clients[session_id]
            
            if session_id in self.active_sessions:
                del self.active_sessions[session_id]
            
            # Update database
            async with db.get_connection() as conn:
                await conn.execute(
                    "UPDATE telegram_sessions SET status = 'idle' WHERE id = $1",
                    session_id
                )
            
            logger.info(f"Session {session_id} disconnected")
            return True
            
        except Exception as e:
            logger.error(f"Failed to disconnect session {session_id}: {e}")
            return False
    
    async def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a session"""
        if session_id not in self.active_sessions:
            return None
        
        session = self.active_sessions[session_id]
        client = session["client"]
        
        try:
            me = await client.get_me()
            return {
                "id": session_id,
                "user_id": me.id,
                "username": me.username,
                "first_name": me.first_name,
                "last_name": me.last_name,
                "phone": me.phone,
                "status": session["status"],
                "message_count": session["message_count"]
            }
        except Exception as e:
            logger.error(f"Failed to get session info for {session_id}: {e}")
            return None
    
    async def start_forwarding(self, session_id: str, source_chat: str, target_chat: str, 
                             filters: Optional[Dict] = None) -> bool:
        """Start message forwarding for a session"""
        try:
            if session_id not in self.active_sessions:
                raise ValueError("Session not active")
            
            client = self.active_sessions[session_id]["client"]
            
            # Set up message handler
            @client.on(events.NewMessage(chats=source_chat))
            async def message_handler(event):
                try:
                    # Apply filters if specified
                    if filters:
                        if not self._apply_filters(event.message, filters):
                            return
                    
                    # Forward message
                    await client.forward_messages(target_chat, event.message)
                    
                    # Update message count
                    self.active_sessions[session_id]["message_count"] += 1
                    
                    # Update database
                    async with db.get_connection() as conn:
                        await conn.execute(
                            "UPDATE telegram_sessions SET message_count = message_count + 1, last_activity = now() WHERE id = $1",
                            session_id
                        )
                    
                    logger.debug(f"Message forwarded from {source_chat} to {target_chat}")
                    
                except Exception as e:
                    logger.error(f"Error forwarding message: {e}")
            
            logger.info(f"Started forwarding for session {session_id}: {source_chat} -> {target_chat}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start forwarding for session {session_id}: {e}")
            return False
    
    def _apply_filters(self, message, filters: Dict) -> bool:
        """Apply message filters"""
        # Basic filter implementation
        if "keywords" in filters:
            keywords = filters["keywords"]
            if keywords and message.text:
                for keyword in keywords:
                    if keyword.lower() in message.text.lower():
                        return True
                return False
        
        if "media_only" in filters and filters["media_only"]:
            return bool(message.media)
        
        if "text_only" in filters and filters["text_only"]:
            return bool(message.text and not message.media)
        
        return True
    
    async def get_chat_info(self, session_id: str, chat_identifier: str) -> Optional[Dict]:
        """Get information about a chat"""
        try:
            if session_id not in self.active_sessions:
                return None
            
            client = self.active_sessions[session_id]["client"]
            entity = await client.get_entity(chat_identifier)
            
            return {
                "id": entity.id,
                "title": getattr(entity, "title", None),
                "username": getattr(entity, "username", None),
                "type": entity.__class__.__name__
            }
            
        except Exception as e:
            logger.error(f"Failed to get chat info: {e}")
            return None
    
    async def cleanup_inactive_sessions(self):
        """Clean up inactive or crashed sessions"""
        try:
            inactive_sessions = []
            for session_id, session in self.active_sessions.items():
                client = session["client"]
                try:
                    # Try to get updates to check if session is still alive
                    await client.get_me()
                except Exception:
                    inactive_sessions.append(session_id)
            
            for session_id in inactive_sessions:
                await self.disconnect_session(session_id)
                
            if inactive_sessions:
                logger.info(f"Cleaned up {len(inactive_sessions)} inactive sessions")
                
        except Exception as e:
            logger.error(f"Error during session cleanup: {e}")

# Global service instance
telegram_service = TelegramService()
