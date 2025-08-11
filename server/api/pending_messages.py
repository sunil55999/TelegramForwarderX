"""
Phase 3: Pending Messages API endpoints for approval workflow
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from server.database import db
from server.utils.logger import logger
from server.auth.dependencies import get_current_user

router = APIRouter()

class MessageApproval(BaseModel):
    action: str  # "approve" or "reject"
    comment: Optional[str] = None

class PendingMessageResponse(BaseModel):
    id: str
    user_id: str
    mapping_id: Optional[str]
    source_chat_id: str
    message_id: str
    original_text: str
    processed_text: str
    media_type: Optional[str]
    status: str
    created_at: datetime
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    rejection_reason: Optional[str]

@router.get("/", response_model=List[PendingMessageResponse])
async def get_pending_messages(
    status: str = "pending",
    mapping_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get pending messages for approval"""
    try:
        query_conditions = ["user_id = ?", "status = ?"]
        query_params = [current_user["id"], status]
        
        if mapping_id:
            query_conditions.append("mapping_id = ?")
            query_params.append(mapping_id)
        
        query = f"""
            SELECT pm.*, 
                   s.name as source_name,
                   d.name as destination_name,
                   fm.priority as mapping_priority
            FROM pending_messages pm
            LEFT JOIN forwarding_mappings fm ON pm.mapping_id = fm.id
            LEFT JOIN sources s ON fm.source_id = s.id
            LEFT JOIN destinations d ON fm.destination_id = d.id
            WHERE {' AND '.join(query_conditions)}
            ORDER BY pm.created_at DESC
            LIMIT ? OFFSET ?
        """
        
        query_params.extend([limit, offset])
        messages = await db.fetch_all(query, query_params)
        
        return [PendingMessageResponse(**dict(msg)) for msg in messages]
        
    except Exception as e:
        logger.error(f"Error fetching pending messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch pending messages")

@router.get("/{message_id}")
async def get_pending_message(
    message_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific pending message"""
    try:
        query = """
            SELECT pm.*,
                   s.name as source_name,
                   d.name as destination_name,
                   fm.priority as mapping_priority
            FROM pending_messages pm
            LEFT JOIN forwarding_mappings fm ON pm.mapping_id = fm.id
            LEFT JOIN sources s ON fm.source_id = s.id
            LEFT JOIN destinations d ON fm.destination_id = d.id
            WHERE pm.id = ? AND pm.user_id = ?
        """
        
        message = await db.fetch_one(query, [message_id, current_user["id"]])
        
        if not message:
            raise HTTPException(status_code=404, detail="Pending message not found")
        
        return dict(message)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching pending message: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch pending message")

@router.post("/{message_id}/approve")
async def approve_message(
    message_id: str,
    approval: MessageApproval,
    current_user: dict = Depends(get_current_user)
):
    """Approve a pending message for forwarding"""
    try:
        # Get the pending message
        message = await db.fetch_one(
            "SELECT * FROM pending_messages WHERE id = ? AND user_id = ? AND status = 'pending'",
            [message_id, current_user["id"]]
        )
        
        if not message:
            raise HTTPException(status_code=404, detail="Pending message not found")
        
        # Update the message status
        now = datetime.now()
        await db.execute(
            """
            UPDATE pending_messages 
            SET status = 'approved', approved_by = ?, approved_at = ?, 
                approval_comment = ?, updated_at = ?
            WHERE id = ?
            """,
            [current_user["id"], now, approval.comment, now, message_id]
        )
        
        # Here you would trigger the actual forwarding of the message
        # For now, we'll just log the approval
        logger.info(f"Message {message_id} approved by {current_user['username']}")
        
        # Get updated message
        updated_message = await db.fetch_one(
            "SELECT * FROM pending_messages WHERE id = ?", [message_id]
        )
        
        return {
            "message": "Message approved successfully",
            "pending_message": dict(updated_message)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving message: {e}")
        raise HTTPException(status_code=500, detail="Failed to approve message")

@router.post("/{message_id}/reject")
async def reject_message(
    message_id: str,
    approval: MessageApproval,
    current_user: dict = Depends(get_current_user)
):
    """Reject a pending message"""
    try:
        # Get the pending message
        message = await db.fetch_one(
            "SELECT * FROM pending_messages WHERE id = ? AND user_id = ? AND status = 'pending'",
            [message_id, current_user["id"]]
        )
        
        if not message:
            raise HTTPException(status_code=404, detail="Pending message not found")
        
        # Update the message status
        now = datetime.now()
        await db.execute(
            """
            UPDATE pending_messages 
            SET status = 'rejected', approved_by = ?, approved_at = ?, 
                rejection_reason = ?, updated_at = ?
            WHERE id = ?
            """,
            [current_user["id"], now, approval.comment, now, message_id]
        )
        
        logger.info(f"Message {message_id} rejected by {current_user['username']}")
        
        # Get updated message
        updated_message = await db.fetch_one(
            "SELECT * FROM pending_messages WHERE id = ?", [message_id]
        )
        
        return {
            "message": "Message rejected successfully",
            "pending_message": dict(updated_message)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting message: {e}")
        raise HTTPException(status_code=500, detail="Failed to reject message")

@router.post("/bulk-action")
async def bulk_action_messages(
    action_data: Dict[str, Any],  # {"action": "approve|reject", "message_ids": [...], "comment": "..."}
    current_user: dict = Depends(get_current_user)
):
    """Perform bulk actions on pending messages"""
    try:
        action = action_data.get("action")
        message_ids = action_data.get("message_ids", [])
        comment = action_data.get("comment", "")
        
        if action not in ["approve", "reject"]:
            raise HTTPException(status_code=400, detail="Invalid action")
        
        if not message_ids:
            raise HTTPException(status_code=400, detail="No message IDs provided")
        
        # Verify all messages belong to the user and are pending
        verify_query = """
            SELECT id FROM pending_messages 
            WHERE id IN ({}) AND user_id = ? AND status = 'pending'
        """.format(','.join('?' * len(message_ids)))
        
        valid_messages = await db.fetch_all(
            verify_query, message_ids + [current_user["id"]]
        )
        
        valid_ids = [msg["id"] for msg in valid_messages]
        
        if len(valid_ids) != len(message_ids):
            raise HTTPException(
                status_code=400, 
                detail="Some messages not found or already processed"
            )
        
        # Perform bulk update
        now = datetime.now()
        status = "approved" if action == "approve" else "rejected"
        comment_field = "approval_comment" if action == "approve" else "rejection_reason"
        
        update_query = f"""
            UPDATE pending_messages 
            SET status = ?, approved_by = ?, approved_at = ?, 
                {comment_field} = ?, updated_at = ?
            WHERE id IN ({})
        """.format(','.join('?' * len(valid_ids)))
        
        await db.execute(
            update_query, 
            [status, current_user["id"], now, comment, now] + valid_ids
        )
        
        logger.info(f"Bulk {action} performed on {len(valid_ids)} messages by {current_user['username']}")
        
        return {
            "message": f"Bulk {action} completed successfully",
            "processed_count": len(valid_ids),
            "action": action
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error performing bulk action: {e}")
        raise HTTPException(status_code=500, detail="Failed to perform bulk action")

@router.get("/stats/summary")
async def get_pending_message_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get pending message statistics"""
    try:
        stats_query = """
            SELECT 
                status,
                COUNT(*) as count,
                MIN(created_at) as oldest,
                MAX(created_at) as newest
            FROM pending_messages 
            WHERE user_id = ?
            GROUP BY status
        """
        
        stats = await db.fetch_all(stats_query, [current_user["id"]])
        
        # Get mapping-wise stats
        mapping_stats_query = """
            SELECT 
                pm.mapping_id,
                s.name as source_name,
                d.name as destination_name,
                COUNT(*) as pending_count
            FROM pending_messages pm
            LEFT JOIN forwarding_mappings fm ON pm.mapping_id = fm.id
            LEFT JOIN sources s ON fm.source_id = s.id
            LEFT JOIN destinations d ON fm.destination_id = d.id
            WHERE pm.user_id = ? AND pm.status = 'pending'
            GROUP BY pm.mapping_id, s.name, d.name
            ORDER BY pending_count DESC
        """
        
        mapping_stats = await db.fetch_all(mapping_stats_query, [current_user["id"]])
        
        return {
            "status_breakdown": [dict(stat) for stat in stats],
            "mapping_breakdown": [dict(stat) for stat in mapping_stats]
        }
        
    except Exception as e:
        logger.error(f"Error fetching pending message stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch statistics")