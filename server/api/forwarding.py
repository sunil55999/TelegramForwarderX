from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from server.api.auth import get_current_user, User
from server.database import db
from server.utils.logger import logger

forwarding_router = APIRouter()

class CreateMappingRequest(BaseModel):
    sourceId: str
    destinationId: str
    priority: int = 1
    
    # Filter settings
    includeKeywords: Optional[List[str]] = None
    excludeKeywords: Optional[List[str]] = None
    keywordMatchMode: str = "any"  # "any" | "all"
    caseSensitive: bool = False
    allowedMessageTypes: Optional[List[str]] = None
    blockUrls: bool = False
    blockForwards: bool = False
    minMessageLength: int = 0
    maxMessageLength: int = 4096
    
    # Editing settings
    headerText: Optional[str] = None
    footerText: Optional[str] = None
    removeSenderInfo: bool = False
    removeUrls: bool = False
    removeHashtags: bool = False
    removeMentions: bool = False
    textReplacements: Optional[Dict[str, str]] = None
    preserveFormatting: bool = True

class MappingResponse(BaseModel):
    id: str
    sourceId: str
    destinationId: str
    sourceName: str
    destinationName: str
    isActive: bool
    priority: int
    filters: Dict[str, Any]
    editing: Dict[str, Any]
    createdAt: str

class ForwardingLogResponse(BaseModel):
    id: str
    mappingId: Optional[str]
    sourceName: Optional[str]
    destinationName: Optional[str]
    messageType: str
    originalText: Optional[str]
    processedText: Optional[str]
    status: str
    filterReason: Optional[str]
    errorMessage: Optional[str]
    processingTime: Optional[int]
    createdAt: str

@forwarding_router.get("/mappings", response_model=List[MappingResponse])
async def get_mappings(current_user: User = Depends(get_current_user)):
    """Get all forwarding mappings for current user"""
    async with db.get_connection() as conn:
        mappings = await conn.fetch(
            """
            SELECT 
                fm.*,
                s.chat_title as source_name,
                d.chat_title as destination_name,
                mf.include_keywords, mf.exclude_keywords, mf.keyword_match_mode,
                mf.case_sensitive, mf.allowed_message_types, mf.block_urls,
                mf.block_forwards, mf.min_message_length, mf.max_message_length,
                me.header_text, me.footer_text, me.remove_sender_info,
                me.remove_urls, me.remove_hashtags, me.remove_mentions,
                me.text_replacements, me.preserve_formatting
            FROM forwarding_mappings fm
            JOIN sources s ON fm.source_id = s.id
            JOIN destinations d ON fm.destination_id = d.id
            LEFT JOIN message_filters mf ON fm.id = mf.mapping_id
            LEFT JOIN message_editing me ON fm.id = me.mapping_id
            WHERE fm.user_id = $1
            ORDER BY fm.priority DESC, fm.created_at DESC
            """,
            current_user["id"]
        )
        
        return [
            MappingResponse(
                id=mapping["id"],
                sourceId=mapping["source_id"],
                destinationId=mapping["destination_id"],
                sourceName=mapping["source_name"],
                destinationName=mapping["destination_name"],
                isActive=mapping["is_active"],
                priority=mapping["priority"],
                filters={
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
                editing={
                    "headerText": mapping["header_text"],
                    "footerText": mapping["footer_text"],
                    "removeSenderInfo": mapping["remove_sender_info"] or False,
                    "removeUrls": mapping["remove_urls"] or False,
                    "removeHashtags": mapping["remove_hashtags"] or False,
                    "removeMentions": mapping["remove_mentions"] or False,
                    "textReplacements": mapping["text_replacements"] or {},
                    "preserveFormatting": mapping["preserve_formatting"] or True,
                },
                createdAt=mapping["created_at"].isoformat()
            )
            for mapping in mappings
        ]

@forwarding_router.post("/mappings", response_model=MappingResponse)
async def create_mapping(mapping_data: CreateMappingRequest, current_user: User = Depends(get_current_user)):
    """Create a new forwarding mapping with filters and editing rules"""
    async with db.get_connection() as conn:
        async with conn.transaction():
            # Verify source and destination ownership
            source = await conn.fetchrow(
                "SELECT chat_title FROM sources WHERE id = $1 AND user_id = $2",
                mapping_data.sourceId, current_user["id"]
            )
            
            destination = await conn.fetchrow(
                "SELECT chat_title FROM destinations WHERE id = $1 AND user_id = $2",
                mapping_data.destinationId, current_user["id"]
            )
            
            if not source or not destination:
                raise HTTPException(status_code=404, detail="Source or destination not found")
            
            # Check for existing mapping
            existing = await conn.fetchrow(
                "SELECT id FROM forwarding_mappings WHERE source_id = $1 AND destination_id = $2",
                mapping_data.sourceId, mapping_data.destinationId
            )
            
            if existing:
                raise HTTPException(status_code=409, detail="Mapping already exists")
            
            # Create mapping
            mapping_id = await conn.fetchval(
                """
                INSERT INTO forwarding_mappings (user_id, source_id, destination_id, priority)
                VALUES ($1, $2, $3, $4)
                RETURNING id
                """,
                current_user["id"], mapping_data.sourceId, mapping_data.destinationId, mapping_data.priority
            )
            
            # Create filters
            await conn.execute(
                """
                INSERT INTO message_filters (
                    mapping_id, include_keywords, exclude_keywords, keyword_match_mode,
                    case_sensitive, allowed_message_types, block_urls, block_forwards,
                    min_message_length, max_message_length
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                """,
                mapping_id, mapping_data.includeKeywords, mapping_data.excludeKeywords,
                mapping_data.keywordMatchMode, mapping_data.caseSensitive,
                mapping_data.allowedMessageTypes, mapping_data.blockUrls,
                mapping_data.blockForwards, mapping_data.minMessageLength, mapping_data.maxMessageLength
            )
            
            # Create editing rules
            await conn.execute(
                """
                INSERT INTO message_editing (
                    mapping_id, header_text, footer_text, remove_sender_info,
                    remove_urls, remove_hashtags, remove_mentions, text_replacements,
                    preserve_formatting
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """,
                mapping_id, mapping_data.headerText, mapping_data.footerText,
                mapping_data.removeSenderInfo, mapping_data.removeUrls,
                mapping_data.removeHashtags, mapping_data.removeMentions,
                mapping_data.textReplacements, mapping_data.preserveFormatting
            )
            
            logger.info(f"Forwarding mapping created: {source['chat_title']} -> {destination['chat_title']} by user {current_user['username']}")
            
            # Get created mapping
            mapping = await conn.fetchrow(
                "SELECT * FROM forwarding_mappings WHERE id = $1", mapping_id
            )
            
            return MappingResponse(
                id=mapping["id"],
                sourceId=mapping["source_id"],
                destinationId=mapping["destination_id"],
                sourceName=source["chat_title"],
                destinationName=destination["chat_title"],
                isActive=mapping["is_active"],
                priority=mapping["priority"],
                filters={
                    "includeKeywords": mapping_data.includeKeywords or [],
                    "excludeKeywords": mapping_data.excludeKeywords or [],
                    "keywordMatchMode": mapping_data.keywordMatchMode,
                    "caseSensitive": mapping_data.caseSensitive,
                    "allowedMessageTypes": mapping_data.allowedMessageTypes or [],
                    "blockUrls": mapping_data.blockUrls,
                    "blockForwards": mapping_data.blockForwards,
                    "minMessageLength": mapping_data.minMessageLength,
                    "maxMessageLength": mapping_data.maxMessageLength,
                },
                editing={
                    "headerText": mapping_data.headerText,
                    "footerText": mapping_data.footerText,
                    "removeSenderInfo": mapping_data.removeSenderInfo,
                    "removeUrls": mapping_data.removeUrls,
                    "removeHashtags": mapping_data.removeHashtags,
                    "removeMentions": mapping_data.removeMentions,
                    "textReplacements": mapping_data.textReplacements or {},
                    "preserveFormatting": mapping_data.preserveFormatting,
                },
                createdAt=mapping["created_at"].isoformat()
            )

@forwarding_router.get("/logs", response_model=List[ForwardingLogResponse])
async def get_forwarding_logs(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get forwarding logs for current user"""
    async with db.get_connection() as conn:
        where_clause = "WHERE fm.user_id = $1"
        params = [current_user["id"]]
        
        if status:
            where_clause += " AND fl.status = $2"
            params.append(status)
        
        logs = await conn.fetch(
            f"""
            SELECT 
                fl.*,
                s.chat_title as source_name,
                d.chat_title as destination_name
            FROM forwarding_logs fl
            LEFT JOIN forwarding_mappings fm ON fl.mapping_id = fm.id
            LEFT JOIN sources s ON fl.source_id = s.id
            LEFT JOIN destinations d ON fl.destination_id = d.id
            {where_clause}
            ORDER BY fl.created_at DESC
            LIMIT $3 OFFSET $4
            """,
            *params, limit, offset
        )
        
        return [
            ForwardingLogResponse(
                id=log["id"],
                mappingId=log["mapping_id"],
                sourceName=log["source_name"],
                destinationName=log["destination_name"],
                messageType=log["message_type"],
                originalText=log["original_text"],
                processedText=log["processed_text"],
                status=log["status"],
                filterReason=log["filter_reason"],
                errorMessage=log["error_message"],
                processingTime=log["processing_time"],
                createdAt=log["created_at"].isoformat()
            )
            for log in logs
        ]

@forwarding_router.delete("/mappings/{mapping_id}")
async def delete_mapping(mapping_id: str, current_user: User = Depends(get_current_user)):
    """Delete a forwarding mapping"""
    async with db.get_connection() as conn:
        # Verify ownership
        mapping = await conn.fetchrow(
            "SELECT * FROM forwarding_mappings WHERE id = $1 AND user_id = $2",
            mapping_id, current_user["id"]
        )
        
        if not mapping:
            raise HTTPException(status_code=404, detail="Mapping not found")
        
        # Delete mapping (cascades to filters and editing)
        await conn.execute("DELETE FROM forwarding_mappings WHERE id = $1", mapping_id)
        
        logger.info(f"Forwarding mapping deleted by user {current_user['username']}")
        
        return {"message": "Mapping deleted successfully"}

@forwarding_router.patch("/mappings/{mapping_id}/toggle")
async def toggle_mapping(mapping_id: str, current_user: User = Depends(get_current_user)):
    """Toggle mapping active status"""
    async with db.get_connection() as conn:
        # Verify ownership and get current status
        mapping = await conn.fetchrow(
            "SELECT is_active FROM forwarding_mappings WHERE id = $1 AND user_id = $2",
            mapping_id, current_user["id"]
        )
        
        if not mapping:
            raise HTTPException(status_code=404, detail="Mapping not found")
        
        # Toggle status
        new_status = not mapping["is_active"]
        await conn.execute(
            "UPDATE forwarding_mappings SET is_active = $1, updated_at = now() WHERE id = $2",
            new_status, mapping_id
        )
        
        return {"isActive": new_status}


@forwarding_router.get("/mappings/{mapping_id}/rules")
async def get_advanced_rules(mapping_id: str, current_user: User = Depends(get_current_user)):
    """Get advanced message rules for a specific mapping"""
    async with db.get_connection() as conn:
        # Verify ownership
        mapping = await conn.fetchrow(
            "SELECT * FROM forwarding_mappings WHERE id = $1 AND user_id = $2",
            mapping_id, current_user["id"]
        )
        
        if not mapping:
            raise HTTPException(status_code=404, detail="Mapping not found")
        
        # Get existing rules
        filters = await conn.fetchrow(
            "SELECT * FROM message_filters WHERE mapping_id = $1",
            mapping_id
        )
        
        editing = await conn.fetchrow(
            "SELECT * FROM message_editing WHERE mapping_id = $1",
            mapping_id
        )
        
        # Get regex rules
        regex_rules = await conn.fetch(
            "SELECT * FROM regex_editing_rules WHERE mapping_id = $1 ORDER BY created_at",
            mapping_id
        )
        
        return {
            "regexRules": [
                {
                    "id": str(rule["id"]),
                    "findPattern": rule["find_pattern"],
                    "replaceWith": rule["replace_with"],
                    "isEnabled": rule["is_enabled"],
                    "flags": rule["flags"] or "gi",
                }
                for rule in regex_rules
            ],
            "blockWords": filters["block_words"] if filters else [],
            "includeKeywords": filters["include_keywords"] if filters else [],
            "excludeKeywords": filters["exclude_keywords"] if filters else [],
            "keywordMatchMode": filters["keyword_match_mode"] if filters else "any",
            "caseSensitive": filters["case_sensitive"] if filters else False,
            "headerText": editing["header_text"] if editing else "",
            "footerText": editing["footer_text"] if editing else "",
            "removeMentions": editing["remove_mentions"] if editing else False,
            "removeUrls": editing["remove_urls"] if editing else False,
            "mediaFilter": filters["media_filter"] if filters else "all",
            "forwardingMode": filters["forwarding_mode"] if filters else "copy",
            "delayEnabled": filters["delay_enabled"] if filters else False,
            "delaySeconds": filters["delay_seconds"] if filters else 0,
            "autoReplyRules": filters["auto_reply_rules"] if filters else [],
            "schedulingEnabled": filters["scheduling_enabled"] if filters else False,
            "scheduleStartTime": filters["schedule_start_time"] if filters else "",
            "scheduleEndTime": filters["schedule_end_time"] if filters else "",
            "scheduleDays": filters["schedule_days"] if filters else [],
        }


@forwarding_router.put("/mappings/{mapping_id}/rules")
async def update_advanced_rules(
    mapping_id: str, 
    rules_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Update advanced message rules for a specific mapping"""
    async with db.get_connection() as conn:
        async with conn.transaction():
            # Verify ownership
            mapping = await conn.fetchrow(
                "SELECT * FROM forwarding_mappings WHERE id = $1 AND user_id = $2",
                mapping_id, current_user["id"]
            )
            
            if not mapping:
                raise HTTPException(status_code=404, detail="Mapping not found")
            
            # Update or create message filters
            await conn.execute(
                """
                INSERT INTO message_filters (
                    mapping_id, include_keywords, exclude_keywords, keyword_match_mode,
                    case_sensitive, block_words, media_filter, forwarding_mode,
                    delay_enabled, delay_seconds, auto_reply_rules, scheduling_enabled,
                    schedule_start_time, schedule_end_time, schedule_days
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                ON CONFLICT (mapping_id) DO UPDATE SET
                    include_keywords = EXCLUDED.include_keywords,
                    exclude_keywords = EXCLUDED.exclude_keywords,
                    keyword_match_mode = EXCLUDED.keyword_match_mode,
                    case_sensitive = EXCLUDED.case_sensitive,
                    block_words = EXCLUDED.block_words,
                    media_filter = EXCLUDED.media_filter,
                    forwarding_mode = EXCLUDED.forwarding_mode,
                    delay_enabled = EXCLUDED.delay_enabled,
                    delay_seconds = EXCLUDED.delay_seconds,
                    auto_reply_rules = EXCLUDED.auto_reply_rules,
                    scheduling_enabled = EXCLUDED.scheduling_enabled,
                    schedule_start_time = EXCLUDED.schedule_start_time,
                    schedule_end_time = EXCLUDED.schedule_end_time,
                    schedule_days = EXCLUDED.schedule_days,
                    updated_at = now()
                """,
                mapping_id,
                rules_data.get("includeKeywords", []),
                rules_data.get("excludeKeywords", []),
                rules_data.get("keywordMatchMode", "any"),
                rules_data.get("caseSensitive", False),
                rules_data.get("blockWords", []),
                rules_data.get("mediaFilter", "all"),
                rules_data.get("forwardingMode", "copy"),
                rules_data.get("delayEnabled", False),
                rules_data.get("delaySeconds", 0),
                rules_data.get("autoReplyRules", []),
                rules_data.get("schedulingEnabled", False),
                rules_data.get("scheduleStartTime", ""),
                rules_data.get("scheduleEndTime", ""),
                rules_data.get("scheduleDays", [])
            )
            
            # Update or create message editing
            await conn.execute(
                """
                INSERT INTO message_editing (
                    mapping_id, header_text, footer_text, remove_mentions, remove_urls
                ) VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (mapping_id) DO UPDATE SET
                    header_text = EXCLUDED.header_text,
                    footer_text = EXCLUDED.footer_text,
                    remove_mentions = EXCLUDED.remove_mentions,
                    remove_urls = EXCLUDED.remove_urls,
                    updated_at = now()
                """,
                mapping_id,
                rules_data.get("headerText", ""),
                rules_data.get("footerText", ""),
                rules_data.get("removeMentions", False),
                rules_data.get("removeUrls", False)
            )
            
            # Handle regex rules - delete existing and insert new ones
            await conn.execute("DELETE FROM regex_editing_rules WHERE mapping_id = $1", mapping_id)
            
            regex_rules = rules_data.get("regexRules", [])
            if regex_rules:
                for rule in regex_rules:
                    await conn.execute(
                        """
                        INSERT INTO regex_editing_rules (
                            mapping_id, find_pattern, replace_with, is_enabled, flags
                        ) VALUES ($1, $2, $3, $4, $5)
                        """,
                        mapping_id,
                        rule.get("findPattern", ""),
                        rule.get("replaceWith", ""),
                        rule.get("isEnabled", True),
                        rule.get("flags", "gi")
                    )
            
            logger.info(f"Advanced rules updated for mapping {mapping_id} by user {current_user['username']}")
            
            return {"message": "Advanced rules updated successfully"}