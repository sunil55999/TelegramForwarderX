"""
Core Message Forwarding Engine for AutoForwardX Phase 3

Handles advanced message processing, filtering, editing, and forwarding with 
Phase 3 features: regex editing rules, message sync, delay/approval system.
"""

import asyncio
import re
import time
import hashlib
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from telethon import TelegramClient, events
from telethon.tl.types import Message, MessageMediaPhoto, MessageMediaDocument, MessageMediaVideo
from server.database import db
from server.utils.logger import logger

@dataclass
class ProcessingResult:
    """Result of message processing"""
    success: bool
    status: str  # "success" | "filtered" | "error" | "test" | "delayed" | "pending_approval"
    processed_text: Optional[str] = None
    filter_reason: Optional[str] = None
    error_message: Optional[str] = None
    processing_time: int = 0
    delay_until: Optional[datetime] = None
    requires_approval: bool = False
    message_hash: Optional[str] = None

class MessageProcessor:
    """Core message processing logic with filters, editing, and Phase 3 features"""
    
    def __init__(self):
        self.url_pattern = re.compile(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+')
        self.hashtag_pattern = re.compile(r'#\w+')
        self.mention_pattern = re.compile(r'@\w+')
        self.message_cache: Dict[str, Dict] = {}  # For tracking message updates
    
    async def process_message(self, message: Message, mapping_config: Dict[str, Any], user_id: str) -> ProcessingResult:
        """Process a message through filters, editing, and Phase 3 features"""
        start_time = time.time()
        
        try:
            # Extract message content
            message_text = message.message or ""
            message_type = self._get_message_type(message)
            
            # Create message hash for tracking
            message_hash = self._create_message_hash(message)
            
            # Apply filters
            filter_result = self._apply_filters(message, message_text, message_type, mapping_config["filters"])
            if not filter_result["passed"]:
                return ProcessingResult(
                    success=False,
                    status="filtered",
                    filter_reason=filter_result["reason"],
                    processing_time=int((time.time() - start_time) * 1000),
                    message_hash=message_hash
                )
            
            # Apply editing (including Phase 3 regex rules)
            processed_text = await self._apply_editing(message, message_text, mapping_config["editing"], user_id, mapping_config.get("mapping_id"))
            
            # Check delay/approval settings
            delay_config = mapping_config.get("delay_settings", {})
            if delay_config.get("enableDelay", False):
                delay_seconds = delay_config.get("delaySeconds", 10)
                requires_approval = delay_config.get("requireApproval", False)
                
                if requires_approval:
                    # Store message for approval
                    await self._store_pending_message(message, processed_text, mapping_config, user_id)
                    return ProcessingResult(
                        success=True,
                        status="pending_approval",
                        processed_text=processed_text,
                        processing_time=int((time.time() - start_time) * 1000),
                        requires_approval=True,
                        message_hash=message_hash
                    )
                else:
                    # Simple delay
                    delay_until = datetime.now() + timedelta(seconds=delay_seconds)
                    return ProcessingResult(
                        success=True,
                        status="delayed",
                        processed_text=processed_text,
                        processing_time=int((time.time() - start_time) * 1000),
                        delay_until=delay_until,
                        message_hash=message_hash
                    )
            
            return ProcessingResult(
                success=True,
                status="success",
                processed_text=processed_text,
                processing_time=int((time.time() - start_time) * 1000),
                message_hash=message_hash
            )
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            return ProcessingResult(
                success=False,
                status="error",
                error_message=str(e),
                processing_time=int((time.time() - start_time) * 1000)
            )
    
    def _get_message_type(self, message: Message) -> str:
        """Determine message type"""
        if message.media:
            if isinstance(message.media, MessageMediaPhoto):
                return "photo"
            elif isinstance(message.media, MessageMediaDocument):
                # Check document attributes for specific types
                if message.media.document.mime_type:
                    if message.media.document.mime_type.startswith("video/"):
                        return "video"
                    elif message.media.document.mime_type.startswith("audio/"):
                        return "voice"
                return "document"
            elif isinstance(message.media, MessageMediaVideo):
                return "video"
            else:
                return "media"
        elif message.sticker:
            return "sticker"
        else:
            return "text"
    
    def _apply_filters(self, message: Message, text: str, message_type: str, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Apply all message filters"""
        
        # Message type filter
        allowed_types = filters.get("allowedMessageTypes", [])
        if allowed_types and message_type not in allowed_types:
            return {"passed": False, "reason": f"Message type '{message_type}' not allowed"}
        
        # URL filter
        if filters.get("blockUrls", False) and self.url_pattern.search(text):
            return {"passed": False, "reason": "Message contains URLs"}
        
        # Forward filter
        if filters.get("blockForwards", False) and message.fwd_from:
            return {"passed": False, "reason": "Forwarded messages blocked"}
        
        # Length filters
        min_length = filters.get("minMessageLength", 0)
        max_length = filters.get("maxMessageLength", 4096)
        if len(text) < min_length:
            return {"passed": False, "reason": f"Message too short (min: {min_length})"}
        if len(text) > max_length:
            return {"passed": False, "reason": f"Message too long (max: {max_length})"}
        
        # Keyword filters
        include_keywords = filters.get("includeKeywords", [])
        exclude_keywords = filters.get("excludeKeywords", [])
        case_sensitive = filters.get("caseSensitive", False)
        match_mode = filters.get("keywordMatchMode", "any")
        
        search_text = text if case_sensitive else text.lower()
        
        # Include keywords check
        if include_keywords:
            keywords = include_keywords if case_sensitive else [k.lower() for k in include_keywords]
            
            if match_mode == "all":
                # All keywords must be present
                missing_keywords = [k for k in keywords if k not in search_text]
                if missing_keywords:
                    return {"passed": False, "reason": f"Missing required keywords: {missing_keywords}"}
            else:
                # At least one keyword must be present
                if not any(k in search_text for k in keywords):
                    return {"passed": False, "reason": "No required keywords found"}
        
        # Exclude keywords check
        if exclude_keywords:
            keywords = exclude_keywords if case_sensitive else [k.lower() for k in exclude_keywords]
            found_excluded = [k for k in keywords if k in search_text]
            if found_excluded:
                return {"passed": False, "reason": f"Contains excluded keywords: {found_excluded}"}
        
        # User filters (if sender info available)
        if message.sender_id:
            allowed_users = filters.get("allowedUserIds", [])
            blocked_users = filters.get("blockedUserIds", [])
            
            sender_id_str = str(message.sender_id)
            
            if allowed_users and sender_id_str not in allowed_users:
                return {"passed": False, "reason": "Sender not in allowed users list"}
            
            if blocked_users and sender_id_str in blocked_users:
                return {"passed": False, "reason": "Sender is blocked"}
        
        return {"passed": True, "reason": None}
    
    async def _apply_editing(self, message: Message, text: str, editing: Dict[str, Any], user_id: str, mapping_id: Optional[str] = None) -> str:
        """Apply message editing rules including Phase 3 regex rules"""
        processed_text = text
        
        # Phase 3: Apply regex editing rules first
        processed_text = await self._apply_regex_rules(processed_text, user_id, mapping_id)
        
        # Remove sender info
        if editing.get("removeSenderInfo", False) and message.sender:
            # This would typically remove forwarded sender info
            # For now, we'll just note that sender info should be removed
            pass
        
        # Remove URLs
        if editing.get("removeUrls", False):
            processed_text = self.url_pattern.sub("", processed_text)
        
        # Remove hashtags
        if editing.get("removeHashtags", False):
            processed_text = self.hashtag_pattern.sub("", processed_text)
        
        # Remove mentions
        if editing.get("removeMentions", False):
            processed_text = self.mention_pattern.sub("", processed_text)
        
        # Apply text replacements
        replacements = editing.get("textReplacements", {})
        if replacements:
            for find_text, replace_text in replacements.items():
                processed_text = processed_text.replace(find_text, replace_text)
        
        # Clean up extra whitespace
        processed_text = re.sub(r'\s+', ' ', processed_text).strip()
        
        # Add header
        header = editing.get("headerText")
        if header:
            processed_text = f"{header}\n\n{processed_text}"
        
        # Add footer
        footer = editing.get("footerText")
        if footer:
            processed_text = f"{processed_text}\n\n{footer}"
        
        return processed_text
    
    def _create_message_hash(self, message: Message) -> str:
        """Create a unique hash for message tracking"""
        content = f"{message.chat_id}_{message.id}_{message.message or ''}_{getattr(message, 'date', '')}"
        return hashlib.md5(content.encode()).hexdigest()
    
    async def _apply_regex_rules(self, text: str, user_id: str, mapping_id: Optional[str] = None) -> str:
        """Apply regex editing rules from Phase 3"""
        try:
            # Fetch regex rules from database
            if mapping_id:
                query = "SELECT * FROM regex_editing_rules WHERE mapping_id = ? AND is_active = true ORDER BY order_index"
                rules = await db.fetch_all(query, [mapping_id])
            else:
                query = "SELECT * FROM regex_editing_rules WHERE user_id = ? AND is_active = true ORDER BY order_index"
                rules = await db.fetch_all(query, [user_id])
            
            processed_text = text
            
            for rule in rules:
                try:
                    # Apply regex transformation
                    pattern = re.compile(rule['pattern'], re.IGNORECASE if not rule['case_sensitive'] else 0)
                    
                    if rule['rule_type'] == 'find_replace':
                        processed_text = pattern.sub(rule['replacement'] or '', processed_text)
                    elif rule['rule_type'] == 'remove':
                        processed_text = pattern.sub('', processed_text)
                    elif rule['rule_type'] == 'extract':
                        matches = pattern.findall(processed_text)
                        if matches:
                            processed_text = ' '.join(matches)
                    elif rule['rule_type'] == 'conditional_replace':
                        # Apply replacement only if condition is met
                        if pattern.search(processed_text):
                            processed_text = pattern.sub(rule['replacement'] or '', processed_text)
                    
                except re.error as e:
                    logger.warning(f"Invalid regex pattern in rule {rule['id']}: {e}")
                    continue
            
            return processed_text
            
        except Exception as e:
            logger.error(f"Error applying regex rules: {e}")
            return text
    
    async def _store_pending_message(self, message: Message, processed_text: str, mapping_config: Dict[str, Any], user_id: str):
        """Store message for approval workflow"""
        try:
            query = """
                INSERT INTO pending_messages (
                    user_id, mapping_id, source_chat_id, message_id, original_text,
                    processed_text, status, created_at, media_type
                ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
            """
            
            await db.execute(query, [
                user_id,
                mapping_config.get("mapping_id"),
                str(message.chat_id),
                str(message.id),
                message.message or "",
                processed_text,
                datetime.now(),
                self._get_message_type(message)
            ])
            
            logger.info(f"Stored pending message {message.id} for approval")
            
        except Exception as e:
            logger.error(f"Failed to store pending message: {e}")
    
    async def handle_message_update(self, message: Message, user_id: str, mapping_id: str):
        """Handle message updates/edits for sync feature"""
        try:
            message_hash = self._create_message_hash(message)
            
            # Check if we have sync settings for this mapping
            query = "SELECT * FROM message_sync_settings WHERE mapping_id = ? AND sync_updates = true"
            sync_setting = await db.fetch_one(query, [mapping_id])
            
            if not sync_setting:
                return
            
            # Track the original message for sync
            query = """
                INSERT OR REPLACE INTO message_tracker (
                    source_chat_id, source_message_id, destination_chat_id,
                    destination_message_id, mapping_id, user_id, message_hash,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            await db.execute(query, [
                str(message.chat_id),
                str(message.id),
                None,  # Will be set when message is forwarded
                None,  # Will be set when message is forwarded
                mapping_id,
                user_id,
                message_hash,
                datetime.now(),
                datetime.now()
            ])
            
        except Exception as e:
            logger.error(f"Error handling message update: {e}")
    
    async def handle_message_deletion(self, message_id: str, chat_id: str, user_id: str):
        """Handle message deletions for sync feature"""
        try:
            # Find tracked messages that should be deleted
            query = """
                SELECT * FROM message_tracker mt
                JOIN message_sync_settings mss ON mt.mapping_id = mss.mapping_id
                WHERE mt.source_chat_id = ? AND mt.source_message_id = ?
                AND mss.sync_deletions = true AND mt.user_id = ?
            """
            
            tracked_messages = await db.fetch_all(query, [chat_id, message_id, user_id])
            
            for tracked in tracked_messages:
                if tracked['destination_message_id']:
                    # Delete the forwarded message
                    # This would require the Telegram client to delete the destination message
                    logger.info(f"Should delete forwarded message {tracked['destination_message_id']} in chat {tracked['destination_chat_id']}")
                
                # Update tracker
                query = "UPDATE message_tracker SET deleted_at = ? WHERE id = ?"
                await db.execute(query, [datetime.now(), tracked['id']])
            
        except Exception as e:
            logger.error(f"Error handling message deletion: {e}")

class ForwardingEngine:
    """Main forwarding engine that monitors sources and forwards messages"""
    
    def __init__(self, session_id: str, client: TelegramClient):
        self.session_id = session_id
        self.client = client
        self.processor = MessageProcessor()
        self.is_running = False
        self.test_mode = False
        self.mappings_cache = {}
        self.last_config_update = 0
        
    async def start(self, test_mode: bool = False):
        """Start the forwarding engine"""
        self.test_mode = test_mode
        self.is_running = True
        
        logger.info(f"Starting forwarding engine for session {self.session_id} (test_mode: {test_mode})")
        
        # Load initial configuration
        await self.reload_config()
        
        # Set up message handler
        @self.client.on(events.NewMessage)
        async def message_handler(event):
            if not self.is_running:
                return
            
            try:
                await self.handle_message(event.message)
            except Exception as e:
                logger.error(f"Error handling message in session {self.session_id}: {e}")
        
        # Start config refresh task
        asyncio.create_task(self.config_refresh_task())
        
        logger.info(f"Forwarding engine started for session {self.session_id}")
    
    async def stop(self):
        """Stop the forwarding engine"""
        self.is_running = False
        logger.info(f"Forwarding engine stopped for session {self.session_id}")
    
    async def reload_config(self):
        """Reload forwarding configuration from database"""
        try:
            async with db.get_connection() as conn:
                # Get active mappings for this session
                mappings = await conn.fetch(
                    """
                    SELECT 
                        fm.id, fm.source_id, fm.destination_id, fm.priority,
                        s.chat_id as source_chat_id,
                        d.chat_id as destination_chat_id,
                        mf.include_keywords, mf.exclude_keywords, mf.keyword_match_mode,
                        mf.case_sensitive, mf.allowed_message_types, mf.block_urls,
                        mf.block_forwards, mf.min_message_length, mf.max_message_length,
                        me.header_text, me.footer_text, me.remove_sender_info,
                        me.remove_urls, me.remove_hashtags, me.remove_mentions,
                        me.text_replacements, me.preserve_formatting
                    FROM forwarding_mappings fm
                    JOIN sources s ON fm.source_id = s.id
                    JOIN destinations d ON fm.destination_id = d.id
                    LEFT JOIN message_filters mf ON fm.id = mf.mapping_id AND mf.is_active = true
                    LEFT JOIN message_editing me ON fm.id = me.mapping_id AND me.is_active = true
                    WHERE (s.session_id = $1 OR d.session_id = $1)
                    AND fm.is_active = true
                    AND s.is_active = true
                    AND d.is_active = true
                    ORDER BY fm.priority DESC
                    """,
                    self.session_id
                )
                
                # Organize mappings by source chat ID
                new_mappings = {}
                for mapping in mappings:
                    source_chat = mapping["source_chat_id"]
                    if source_chat not in new_mappings:
                        new_mappings[source_chat] = []
                    
                    new_mappings[source_chat].append({
                        "id": mapping["id"],
                        "source_id": mapping["source_id"],
                        "destination_id": mapping["destination_id"],
                        "destination_chat_id": mapping["destination_chat_id"],
                        "priority": mapping["priority"],
                        "filters": {
                            "includeKeywords": mapping["include_keywords"] or [],
                            "excludeKeywords": mapping["exclude_keywords"] or [],
                            "keywordMatchMode": mapping["keyword_match_mode"] or "any",
                            "caseSensitive": mapping["case_sensitive"] or False,
                            "allowedMessageTypes": mapping["allowed_message_types"] or [],
                            "blockUrls": mapping["block_urls"] or False,
                            "blockForwards": mapping["block_forwards"] or False,
                            "minMessageLength": mapping["min_message_length"] or 0,
                            "maxMessageLength": mapping["max_message_length"] or 4096,
                        },
                        "editing": {
                            "headerText": mapping["header_text"],
                            "footerText": mapping["footer_text"],
                            "removeSenderInfo": mapping["remove_sender_info"] or False,
                            "removeUrls": mapping["remove_urls"] or False,
                            "removeHashtags": mapping["remove_hashtags"] or False,
                            "removeMentions": mapping["remove_mentions"] or False,
                            "textReplacements": mapping["text_replacements"] or {},
                            "preserveFormatting": mapping["preserve_formatting"] or True,
                        }
                    })
                
                self.mappings_cache = new_mappings
                self.last_config_update = time.time()
                
                logger.info(f"Reloaded config: {len(mappings)} mappings for {len(new_mappings)} sources")
                
        except Exception as e:
            logger.error(f"Error reloading config for session {self.session_id}: {e}")
    
    async def config_refresh_task(self):
        """Periodically refresh configuration"""
        while self.is_running:
            try:
                await asyncio.sleep(30)  # Refresh every 30 seconds
                if self.is_running:
                    await self.reload_config()
            except Exception as e:
                logger.error(f"Error in config refresh task: {e}")
    
    async def handle_message(self, message: Message):
        """Handle incoming message from monitored source"""
        try:
            # Get source chat ID
            source_chat_id = str(message.chat_id if message.chat_id else message.peer_id.channel_id)
            
            # Check if we have mappings for this source
            mappings = self.mappings_cache.get(source_chat_id, [])
            if not mappings:
                return
            
            logger.info(f"Processing message from chat {source_chat_id}, {len(mappings)} mappings")
            
            # Process message for each mapping
            for mapping in mappings:
                await self.process_mapping(message, mapping)
                
        except Exception as e:
            logger.error(f"Error handling message: {e}")
    
    async def process_mapping(self, message: Message, mapping: Dict[str, Any]):
        """Process message for a specific mapping"""
        start_time = time.time()
        
        try:
            # Process message through filters and editing
            result = await self.processor.process_message(message, mapping)
            
            # Log the processing result
            await self.log_processing_result(message, mapping, result)
            
            # Forward message if successful and not in test mode
            if result.success and not self.test_mode:
                await self.forward_message(message, mapping, result.processed_text)
            
        except Exception as e:
            logger.error(f"Error processing mapping {mapping['id']}: {e}")
            await self.log_processing_result(
                message, mapping,
                ProcessingResult(
                    success=False,
                    status="error",
                    error_message=str(e),
                    processing_time=int((time.time() - start_time) * 1000)
                )
            )
    
    async def forward_message(self, original_message: Message, mapping: Dict[str, Any], processed_text: str):
        """Forward processed message to destination"""
        try:
            destination_chat_id = int(mapping["destination_chat_id"])
            
            # Send the processed message
            if original_message.media:
                # Forward media with processed caption
                sent_message = await self.client.send_file(
                    destination_chat_id,
                    original_message.media,
                    caption=processed_text
                )
            else:
                # Send text message
                sent_message = await self.client.send_message(
                    destination_chat_id,
                    processed_text
                )
            
            # Update destination stats
            await self.update_destination_stats(mapping["destination_id"])
            
            logger.info(f"Message forwarded: {original_message.id} -> {sent_message.id}")
            
        except Exception as e:
            logger.error(f"Error forwarding message: {e}")
            raise
    
    async def log_processing_result(self, message: Message, mapping: Dict[str, Any], result: ProcessingResult):
        """Log processing result to database"""
        try:
            message_type = self.processor._get_message_type(message)
            original_text = message.message or ""
            
            status = "test" if self.test_mode else result.status
            
            async with db.get_connection() as conn:
                await conn.execute(
                    """
                    INSERT INTO forwarding_logs (
                        mapping_id, source_id, destination_id, original_message_id,
                        message_type, original_text, processed_text, status,
                        filter_reason, error_message, processing_time, worker_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    """,
                    mapping["id"], mapping["source_id"], mapping["destination_id"],
                    str(message.id), message_type, original_text, result.processed_text,
                    status, result.filter_reason, result.error_message,
                    result.processing_time, f"session_{self.session_id}"
                )
                
        except Exception as e:
            logger.error(f"Error logging processing result: {e}")
    
    async def update_destination_stats(self, destination_id: str):
        """Update destination forwarding statistics"""
        try:
            async with db.get_connection() as conn:
                await conn.execute(
                    """
                    UPDATE destinations 
                    SET total_forwarded = total_forwarded + 1,
                        last_forward_time = now(),
                        updated_at = now()
                    WHERE id = $1
                    """,
                    destination_id
                )
        except Exception as e:
            logger.error(f"Error updating destination stats: {e}")