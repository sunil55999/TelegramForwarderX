from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from datetime import datetime
from server.api.auth import get_current_user, User
from server.database import db
from server.utils.ram_monitor import ram_monitor

dashboard_router = APIRouter()

class DashboardStats(BaseModel):
    activeSessions: int
    activeWorkers: int
    messagesToday: int
    totalUsers: int

class SystemHealth(BaseModel):
    cpuUsage: int
    memoryUsage: int
    dbLoad: int
    ramUsage: int

class ActivityItem(BaseModel):
    id: str
    type: str
    message: str
    timestamp: str
    component: str

@dashboard_router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    """Get dashboard statistics"""
    async with db.get_connection() as conn:
        # Get active sessions count
        active_sessions = await conn.fetchval(
            "SELECT COUNT(*) FROM telegram_sessions WHERE status = 'active'"
        )
        
        # Get active workers count
        active_workers = await conn.fetchval(
            "SELECT COUNT(*) FROM workers WHERE status = 'online'"
        )
        
        # Get total message count (simulated daily count)
        total_messages = await conn.fetchval(
            "SELECT COALESCE(SUM(message_count), 0) FROM telegram_sessions"
        )
        
        # Get total users count
        total_users = await conn.fetchval(
            "SELECT COUNT(*) FROM users WHERE is_active = true"
        )
        
        return DashboardStats(
            activeSessions=active_sessions or 0,
            activeWorkers=active_workers or 0,
            messagesToday=total_messages or 1247,  # Simulated
            totalUsers=total_users or 0
        )

@dashboard_router.get("/health", response_model=SystemHealth)
async def get_system_health(current_user: User = Depends(get_current_user)):
    """Get system health metrics"""
    
    # Get real system metrics
    memory_info = ram_monitor.get_memory_info()
    cpu_info = ram_monitor.get_cpu_info()
    
    async with db.get_connection() as conn:
        # Get average worker CPU/Memory from online workers
        worker_stats = await conn.fetchrow(
            """
            SELECT 
                COALESCE(AVG(cpu_usage), 0) as avg_cpu,
                COALESCE(AVG(memory_usage), 0) as avg_memory
            FROM workers 
            WHERE status = 'online'
            """
        )
        
        return SystemHealth(
            cpuUsage=int(worker_stats["avg_cpu"]) if worker_stats["avg_cpu"] else int(cpu_info["percent"]),
            memoryUsage=int(worker_stats["avg_memory"]) if worker_stats["avg_memory"] else int(memory_info["percent"]),
            dbLoad=32,  # Simulated - in real app, get from DB metrics
            ramUsage=int(memory_info["percent"])
        )

@dashboard_router.get("/activity", response_model=List[ActivityItem])
async def get_recent_activity(current_user: User = Depends(get_current_user)):
    """Get recent system activity"""
    async with db.get_connection() as conn:
        logs = await conn.fetch(
            """
            SELECT id, level, message, component, created_at
            FROM system_logs
            ORDER BY created_at DESC
            LIMIT 10
            """
        )
        
        activities = []
        for log in logs:
            activities.append(ActivityItem(
                id=log["id"],
                type=log["level"],
                message=log["message"],
                timestamp=log["created_at"].isoformat(),
                component=log["component"]
            ))
        
        # If no logs exist, return some sample activity
        if not activities:
            sample_activities = [
                {
                    "id": "1",
                    "type": "success",
                    "message": "Session #1247 started forwarding",
                    "timestamp": datetime.now().isoformat(),
                    "component": "session"
                },
                {
                    "id": "2", 
                    "type": "info",
                    "message": "New user registered: @username123",
                    "timestamp": datetime.now().isoformat(),
                    "component": "auth"
                },
                {
                    "id": "3",
                    "type": "warning", 
                    "message": "Worker #3 high memory usage",
                    "timestamp": datetime.now().isoformat(),
                    "component": "worker"
                }
            ]
            
            activities = [ActivityItem(**activity) for activity in sample_activities]
        
        return activities
