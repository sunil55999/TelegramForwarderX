import asyncio
import time
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from telethon import TelegramClient, events
from telethon.tl.types import Message
from server.config import settings
from server.services.telegram_service import telegram_service
from server.database import db
from server.utils.logger import logger

class MessageForwarder:
    """Handles message forwarding logic with filtering and rate limiting"""
    
    def __init__(self, worker_id: str):
        self.worker_id = worker_id
        self.active_forwarders: Dict[str, dict] = {}
        self.message_handlers: Dict[str, Callable] = {}
        self.rate_limiters: Dict[str, dict] = {}
        self.is_running = False
    
    async def start_forwarding(self, session_id: str, forwarding_rules: List[Dict[str, Any]]) -> bool:
        """Start forwarding for a session with given rules"""
        try:
            if session_id in self.active_forwarders:
                logger.warning(f"Forwarding already active for session {session_id}")
                return False
            
            # Get session client
            session_info = await telegram_service.get_session_info(session_id)
            if not session_info:
                logger.error(f"Session {session_id} not found or not active")
                return False
            
            client = telegram_service.active_sessions[session_id]["client"]
            
            # Initialize forwarder
            self.active_forwarders[session_id] = {
                "client": client,
                "rules": forwarding_rules,
                "started_at": datetime.now(),
                "message_count": 0,
                "last_message_time": None,
                "rate_limiter": self._create_rate_limiter(session_id)
            }
            
            # Register message handlers for each rule
            for rule in forwarding_rules:
                await self._register_message_handler(session_id, rule)
            
            logger.info(f"Started forwarding for session {session_id} with {len(forwarding_rules)} rules")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start forwarding for session {session_id}: {e}")
            return False
    
    async def stop_forwarding(self, session_id: str) -> bool:
        """Stop forwarding for a session"""
        try:
            if session_id not in self.active_forwarders:
                return True
            
            # Remove message handlers
            await self._unregister_message_handlers(session_id)
            
            # Clean up forwarder data
            del self.active_forwarders[session_id]
            
            if session_id in self.rate_limiters:
                del self.rate_limiters[session_id]
            
            logger.info(f"Stopped forwarding for session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop forwarding for session {session_id}: {e}")
            return False
    
    async def _register_message_handler(self, session_id: str, rule: Dict[str, Any]):
        """Register message handler for a forwarding rule"""
        try:
            forwarder_data = self.active_forwarders[session_id]
            client = forwarder_data["client"]
            
            source_chat = rule["source_chat"]
            target_chat = rule["target_chat"]
            filters = rule.get("filters", {})
            rule_id = rule.get("id", f"{session_id}_{source_chat}_{target_chat}")
            
            @client.on(events.NewMessage(chats=source_chat))
            async def message_handler(event):
                await self._handle_message(
                    session_id, rule_id, event, target_chat, filters
                )
            
            # Store handler reference for cleanup
            handler_key = f"{session_id}_{rule_id}"
            self.message_handlers[handler_key] = message_handler
            
            logger.debug(f"Registered handler for {source_chat} -> {target_chat}")
            
        except Exception as e:
            logger.error(f"Failed to register message handler: {e}")
    
    async def _handle_message(self, session_id: str, rule_id: str, event, 
                            target_chat: str, filters: Dict[str, Any]):
        """Handle incoming message and forward if it passes filters"""
        try:
            message = event.message
            forwarder_data = self.active_forwarders.get(session_id)
            
            if not forwarder_data:
                return
            
            # Apply rate limiting
            if not await self._check_rate_limit(session_id):
                logger.debug(f"Rate limit exceeded for session {session_id}")
                return
            
            # Apply message filters
            if not await self._apply_message_filters(message, filters):
                logger.debug(f"Message filtered out by rules")
                return
            
            # Get user priority for delay
            user_priority = await self._get_user_priority(session_id)
            if user_priority == "free" and settings.free_user_delay > 0:
                await asyncio.sleep(settings.free_user_delay)
            
            # Forward the message
            success = await self._forward_message(
                forwarder_data["client"], message, target_chat
            )
            
            if success:
                # Update statistics
                forwarder_data["message_count"] += 1
                forwarder_data["last_message_time"] = datetime.now()
                
                # Update database
                await self._update_session_stats(session_id)
                
                logger.debug(f"Message forwarded: {rule_id}")
            
        except Exception as e:
            logger.error(f"Error handling message for session {session_id}: {e}")
    
    async def _forward_message(self, client: TelegramClient, message: Message, 
                             target_chat: str) -> bool:
        """Forward a message to target chat"""
        try:
            await client.forward_messages(target_chat, message)
            return True
            
        except Exception as e:
            logger.error(f"Failed to forward message: {e}")
            return False
    
    async def _apply_message_filters(self, message: Message, filters: Dict[str, Any]) -> bool:
        """Apply filters to determine if message should be forwarded"""
        try:
            # Text content filters
            if "keywords" in filters:
                keywords = filters["keywords"]
                if keywords and message.text:
                    # Include keywords (OR logic)
                    if "include" in keywords:
                        include_words = [kw.lower() for kw in keywords["include"]]
                        if not any(word in message.text.lower() for word in include_words):
                            return False
                    
                    # Exclude keywords (AND logic)
                    if "exclude" in keywords:
                        exclude_words = [kw.lower() for kw in keywords["exclude"]]
                        if any(word in message.text.lower() for word in exclude_words):
                            return False
            
            # Media type filters
            if "media_types" in filters:
                media_types = filters["media_types"]
                if media_types:
                    message_has_media = bool(message.media)
                    
                    if "photos" in media_types and message.photo:
                        pass  # Allow photos
                    elif "videos" in media_types and message.video:
                        pass  # Allow videos
                    elif "documents" in media_types and message.document:
                        pass  # Allow documents
                    elif "text_only" in media_types and not message_has_media:
                        pass  # Allow text only
                    else:
                        return False
            
            # Media only filter
            if filters.get("media_only", False):
                if not message.media:
                    return False
            
            # Text only filter
            if filters.get("text_only", False):
                if message.media:
                    return False
            
            # Minimum length filter
            if "min_length" in filters and message.text:
                if len(message.text) < filters["min_length"]:
                    return False
            
            # Maximum length filter
            if "max_length" in filters and message.text:
                if len(message.text) > filters["max_length"]:
                    return False
            
            # Sender filters
            if "allowed_senders" in filters:
                allowed_senders = filters["allowed_senders"]
                if allowed_senders:
                    sender = await message.get_sender()
                    if sender:
                        sender_username = getattr(sender, "username", None)
                        sender_id = getattr(sender, "id", None)
                        
                        if not (sender_username in allowed_senders or 
                               str(sender_id) in allowed_senders):
                            return False
            
            # Time-based filters
            if "time_restrictions" in filters:
                time_restrictions = filters["time_restrictions"]
                current_time = datetime.now().time()
                
                if "start_time" in time_restrictions and "end_time" in time_restrictions:
                    start_time = datetime.strptime(time_restrictions["start_time"], "%H:%M").time()
                    end_time = datetime.strptime(time_restrictions["end_time"], "%H:%M").time()
                    
                    if start_time <= end_time:
                        # Same day range
                        if not (start_time <= current_time <= end_time):
                            return False
                    else:
                        # Overnight range
                        if not (current_time >= start_time or current_time <= end_time):
                            return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error applying message filters: {e}")
            return True  # Default to allowing message if filter fails
    
    def _create_rate_limiter(self, session_id: str) -> Dict[str, Any]:
        """Create rate limiter for a session"""
        return {
            "messages": [],
            "max_per_minute": 30,  # Max 30 messages per minute
            "max_per_hour": 1000,  # Max 1000 messages per hour
        }
    
    async def _check_rate_limit(self, session_id: str) -> bool:
        """Check if rate limit allows forwarding"""
        try:
            if session_id not in self.rate_limiters:
                self.rate_limiters[session_id] = self._create_rate_limiter(session_id)
            
            rate_limiter = self.rate_limiters[session_id]
            current_time = time.time()
            
            # Clean old messages
            rate_limiter["messages"] = [
                msg_time for msg_time in rate_limiter["messages"]
                if current_time - msg_time < 3600  # Keep last hour
            ]
            
            # Check per minute limit
            minute_ago = current_time - 60
            recent_messages = [
                msg_time for msg_time in rate_limiter["messages"]
                if msg_time > minute_ago
            ]
            
            if len(recent_messages) >= rate_limiter["max_per_minute"]:
                return False
            
            # Check per hour limit
            if len(rate_limiter["messages"]) >= rate_limiter["max_per_hour"]:
                return False
            
            # Add current message to rate limiter
            rate_limiter["messages"].append(current_time)
            return True
            
        except Exception as e:
            logger.error(f"Error checking rate limit: {e}")
            return True  # Default to allowing if check fails
    
    async def _get_user_priority(self, session_id: str) -> str:
        """Get user priority level for the session"""
        try:
            async with db.get_connection() as conn:
                result = await conn.fetchrow(
                    """
                    SELECT u.user_type FROM users u
                    JOIN telegram_sessions ts ON u.id = ts.user_id
                    WHERE ts.id = $1
                    """,
                    session_id
                )
                
                return result["user_type"] if result else "free"
                
        except Exception as e:
            logger.error(f"Error getting user priority: {e}")
            return "free"
    
    async def _update_session_stats(self, session_id: str):
        """Update session statistics in database"""
        try:
            async with db.get_connection() as conn:
                await conn.execute(
                    """
                    UPDATE telegram_sessions 
                    SET message_count = message_count + 1, last_activity = now() 
                    WHERE id = $1
                    """,
                    session_id
                )
                
        except Exception as e:
            logger.error(f"Error updating session stats: {e}")
    
    async def _unregister_message_handlers(self, session_id: str):
        """Unregister all message handlers for a session"""
        try:
            handlers_to_remove = [
                key for key in self.message_handlers.keys()
                if key.startswith(session_id)
            ]
            
            for handler_key in handlers_to_remove:
                # Remove handler from client
                forwarder_data = self.active_forwarders.get(session_id)
                if forwarder_data:
                    client = forwarder_data["client"]
                    handler = self.message_handlers[handler_key]
                    client.remove_event_handler(handler)
                
                # Remove from our tracking
                del self.message_handlers[handler_key]
            
            logger.debug(f"Unregistered {len(handlers_to_remove)} handlers for session {session_id}")
            
        except Exception as e:
            logger.error(f"Error unregistering handlers: {e}")
    
    async def get_forwarder_stats(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get forwarding statistics for a session"""
        if session_id not in self.active_forwarders:
            return None
        
        forwarder_data = self.active_forwarders[session_id]
        return {
            "session_id": session_id,
            "worker_id": self.worker_id,
            "started_at": forwarder_data["started_at"],
            "message_count": forwarder_data["message_count"],
            "last_message_time": forwarder_data["last_message_time"],
            "rules_count": len(forwarder_data["rules"]),
            "is_active": True
        }
    
    async def pause_forwarding(self, session_id: str) -> bool:
        """Temporarily pause forwarding for a session"""
        try:
            if session_id in self.active_forwarders:
                await self._unregister_message_handlers(session_id)
                self.active_forwarders[session_id]["paused"] = True
                logger.info(f"Paused forwarding for session {session_id}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error pausing forwarding: {e}")
            return False
    
    async def resume_forwarding(self, session_id: str) -> bool:
        """Resume paused forwarding for a session"""
        try:
            if session_id in self.active_forwarders:
                forwarder_data = self.active_forwarders[session_id]
                if forwarder_data.get("paused", False):
                    # Re-register handlers
                    for rule in forwarder_data["rules"]:
                        await self._register_message_handler(session_id, rule)
                    
                    forwarder_data["paused"] = False
                    logger.info(f"Resumed forwarding for session {session_id}")
                    return True
            return False
            
        except Exception as e:
            logger.error(f"Error resuming forwarding: {e}")
            return False
    
    def get_active_sessions(self) -> List[str]:
        """Get list of active session IDs"""
        return list(self.active_forwarders.keys())
    
    async def cleanup_inactive_sessions(self):
        """Clean up inactive or crashed sessions"""
        try:
            inactive_sessions = []
            
            for session_id in self.active_forwarders.keys():
                try:
                    # Check if session is still active in telegram service
                    session_info = await telegram_service.get_session_info(session_id)
                    if not session_info:
                        inactive_sessions.append(session_id)
                except Exception:
                    inactive_sessions.append(session_id)
            
            for session_id in inactive_sessions:
                await self.stop_forwarding(session_id)
                logger.info(f"Cleaned up inactive forwarding session {session_id}")
                
        except Exception as e:
            logger.error(f"Error during forwarder cleanup: {e}")
