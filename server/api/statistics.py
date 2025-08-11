"""
Phase 3: System Statistics API endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from server.database import db
from server.utils.logger import logger
from server.auth.dependencies import get_current_user

router = APIRouter()

class StatisticIncrement(BaseModel):
    stat_type: str  # "messages", "bandwidth", "errors"
    period: str     # "hourly", "daily", "weekly", "monthly"
    field: str      # "forwarded_count", "filtered_count", "error_count", "bytes_processed"
    amount: int = 1
    mapping_id: Optional[str] = None

@router.get("/overview")
async def get_statistics_overview(
    period: str = "daily",  # "hourly", "daily", "weekly", "monthly"
    days: int = 7,
    current_user: dict = Depends(get_current_user)
):
    """Get statistics overview for the current user"""
    try:
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get message statistics
        messages_query = """
            SELECT 
                DATE(ss.stat_date) as date,
                SUM(ss.forwarded_count) as forwarded,
                SUM(ss.filtered_count) as filtered,
                SUM(ss.error_count) as errors,
                SUM(ss.bytes_processed) as bytes_processed
            FROM system_stats ss
            WHERE ss.user_id = ? 
            AND ss.stat_type = 'messages'
            AND ss.period = ?
            AND ss.stat_date >= ?
            AND ss.stat_date <= ?
            GROUP BY DATE(ss.stat_date)
            ORDER BY DATE(ss.stat_date)
        """
        
        message_stats = await db.fetch_all(messages_query, [
            current_user["id"], period, start_date, end_date
        ])
        
        # Get mapping performance
        mapping_query = """
            SELECT 
                fm.id,
                s.name as source_name,
                d.name as destination_name,
                COUNT(fl.id) as total_messages,
                SUM(CASE WHEN fl.status = 'success' THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN fl.status = 'filtered' THEN 1 ELSE 0 END) as filtered,
                SUM(CASE WHEN fl.status = 'error' THEN 1 ELSE 0 END) as errors,
                AVG(fl.processing_time) as avg_processing_time
            FROM forwarding_mappings fm
            LEFT JOIN sources s ON fm.source_id = s.id
            LEFT JOIN destinations d ON fm.destination_id = d.id
            LEFT JOIN forwarding_logs fl ON fm.id = fl.mapping_id 
                AND fl.created_at >= ? AND fl.created_at <= ?
            WHERE (s.user_id = ? OR d.user_id = ?)
            GROUP BY fm.id, s.name, d.name
            ORDER BY total_messages DESC
            LIMIT 10
        """
        
        mapping_stats = await db.fetch_all(mapping_query, [
            start_date, end_date, current_user["id"], current_user["id"]
        ])
        
        # Calculate totals
        total_forwarded = sum(stat["forwarded"] or 0 for stat in message_stats)
        total_filtered = sum(stat["filtered"] or 0 for stat in message_stats)
        total_errors = sum(stat["errors"] or 0 for stat in message_stats)
        total_bytes = sum(stat["bytes_processed"] or 0 for stat in message_stats)
        
        return {
            "overview": {
                "total_forwarded": total_forwarded,
                "total_filtered": total_filtered,
                "total_errors": total_errors,
                "total_bytes_processed": total_bytes,
                "success_rate": round(
                    (total_forwarded / (total_forwarded + total_errors)) * 100, 2
                ) if (total_forwarded + total_errors) > 0 else 100
            },
            "daily_stats": [dict(stat) for stat in message_stats],
            "top_mappings": [dict(stat) for stat in mapping_stats]
        }
        
    except Exception as e:
        logger.error(f"Error fetching statistics overview: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch statistics")

@router.get("/detailed")
async def get_detailed_statistics(
    stat_type: str = "messages",
    period: str = "daily",
    mapping_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed statistics with filters"""
    try:
        if not start_date:
            start_date = datetime.now() - timedelta(days=30)
        if not end_date:
            end_date = datetime.now()
        
        query_conditions = ["ss.user_id = ?", "ss.stat_type = ?", "ss.period = ?"]
        query_params = [current_user["id"], stat_type, period]
        
        if mapping_id:
            query_conditions.append("ss.mapping_id = ?")
            query_params.append(mapping_id)
        
        query_conditions.extend(["ss.stat_date >= ?", "ss.stat_date <= ?"])
        query_params.extend([start_date, end_date])
        
        query = f"""
            SELECT 
                ss.*,
                fm.id as mapping_name,
                s.name as source_name,
                d.name as destination_name
            FROM system_stats ss
            LEFT JOIN forwarding_mappings fm ON ss.mapping_id = fm.id
            LEFT JOIN sources s ON fm.source_id = s.id
            LEFT JOIN destinations d ON fm.destination_id = d.id
            WHERE {' AND '.join(query_conditions)}
            ORDER BY ss.stat_date DESC
        """
        
        stats = await db.fetch_all(query, query_params)
        
        return {
            "statistics": [dict(stat) for stat in stats],
            "summary": {
                "total_records": len(stats),
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                },
                "filters": {
                    "stat_type": stat_type,
                    "period": period,
                    "mapping_id": mapping_id
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching detailed statistics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch detailed statistics")

@router.post("/increment")
async def increment_statistic(
    increment: StatisticIncrement,
    current_user: dict = Depends(get_current_user)
):
    """Increment a statistic counter"""
    try:
        # Get current date for the period
        now = datetime.now()
        
        if increment.period == "hourly":
            stat_date = now.replace(minute=0, second=0, microsecond=0)
        elif increment.period == "daily":
            stat_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif increment.period == "weekly":
            days_since_monday = now.weekday()
            stat_date = (now - timedelta(days=days_since_monday)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
        elif increment.period == "monthly":
            stat_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            raise HTTPException(status_code=400, detail="Invalid period")
        
        # Check if record exists
        existing_query = """
            SELECT id FROM system_stats 
            WHERE user_id = ? AND stat_type = ? AND period = ? 
            AND stat_date = ? AND (mapping_id = ? OR (mapping_id IS NULL AND ? IS NULL))
        """
        
        existing = await db.fetch_one(existing_query, [
            current_user["id"], increment.stat_type, increment.period,
            stat_date, increment.mapping_id, increment.mapping_id
        ])
        
        if existing:
            # Update existing record
            update_query = f"""
                UPDATE system_stats 
                SET {increment.field} = {increment.field} + ?, updated_at = ?
                WHERE id = ?
            """
            await db.execute(update_query, [increment.amount, now, existing["id"]])
        else:
            # Create new record
            stat_id = f"stat_{int(now.timestamp() * 1000000)}"
            insert_query = f"""
                INSERT INTO system_stats (
                    id, user_id, mapping_id, stat_type, period, stat_date,
                    {increment.field}, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            await db.execute(insert_query, [
                stat_id, current_user["id"], increment.mapping_id,
                increment.stat_type, increment.period, stat_date,
                increment.amount, now, now
            ])
        
        return {"message": "Statistic incremented successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error incrementing statistic: {e}")
        raise HTTPException(status_code=500, detail="Failed to increment statistic")

@router.get("/export")
async def export_statistics(
    format: str = "json",  # "json", "csv"
    stat_type: str = "messages",
    period: str = "daily",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export statistics data"""
    try:
        if not start_date:
            start_date = datetime.now() - timedelta(days=90)
        if not end_date:
            end_date = datetime.now()
        
        query = """
            SELECT 
                ss.*,
                fm.id as mapping_id,
                s.name as source_name,
                d.name as destination_name
            FROM system_stats ss
            LEFT JOIN forwarding_mappings fm ON ss.mapping_id = fm.id
            LEFT JOIN sources s ON fm.source_id = s.id
            LEFT JOIN destinations d ON fm.destination_id = d.id
            WHERE ss.user_id = ? AND ss.stat_type = ? AND ss.period = ?
            AND ss.stat_date >= ? AND ss.stat_date <= ?
            ORDER BY ss.stat_date DESC
        """
        
        stats = await db.fetch_all(query, [
            current_user["id"], stat_type, period, start_date, end_date
        ])
        
        if format.lower() == "csv":
            # For CSV format, we would return a CSV response
            # For now, returning structured data that can be converted to CSV
            return {
                "format": "csv",
                "data": [dict(stat) for stat in stats],
                "columns": [
                    "stat_date", "stat_type", "period", "forwarded_count",
                    "filtered_count", "error_count", "bytes_processed",
                    "source_name", "destination_name"
                ]
            }
        else:
            return {
                "format": "json",
                "data": [dict(stat) for stat in stats],
                "metadata": {
                    "exported_at": datetime.now().isoformat(),
                    "total_records": len(stats),
                    "date_range": {
                        "start": start_date.isoformat(),
                        "end": end_date.isoformat()
                    }
                }
            }
        
    except Exception as e:
        logger.error(f"Error exporting statistics: {e}")
        raise HTTPException(status_code=500, detail="Failed to export statistics")