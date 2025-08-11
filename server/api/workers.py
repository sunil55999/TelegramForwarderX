from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from server.api.auth import get_current_user, User
from server.database import db

workers_router = APIRouter()

class WorkerCreate(BaseModel):
    name: str
    config: Optional[dict] = {}

class WorkerUpdate(BaseModel):
    status: Optional[str] = None
    cpuUsage: Optional[int] = None
    memoryUsage: Optional[int] = None
    activeSessions: Optional[int] = None
    messagesPerHour: Optional[int] = None
    config: Optional[dict] = None

class WorkerResponse(BaseModel):
    id: str
    name: str
    status: str
    cpuUsage: int
    memoryUsage: int
    activeSessions: int
    messagesPerHour: int
    lastHeartbeat: Optional[datetime]
    config: dict
    createdAt: datetime
    updatedAt: datetime

@workers_router.get("", response_model=List[WorkerResponse])
async def get_workers(current_user: User = Depends(get_current_user)):
    """Get all workers"""
    async with db.get_connection() as conn:
        workers = await conn.fetch(
            """
            SELECT * FROM workers
            ORDER BY created_at ASC
            """
        )
        
        return [WorkerResponse(**dict(worker)) for worker in workers]

@workers_router.post("", response_model=WorkerResponse)
async def create_worker(
    worker_data: WorkerCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new worker"""
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create workers")
    
    async with db.get_connection() as conn:
        worker_id = await conn.fetchval(
            """
            INSERT INTO workers (name, status, config)
            VALUES ($1, 'offline', $2)
            RETURNING id
            """,
            worker_data.name,
            worker_data.config or {}
        )
        
        # Log the creation
        await conn.execute(
            """
            INSERT INTO system_logs (level, message, component, metadata)
            VALUES ('info', $1, 'worker', $2)
            """,
            f"New worker created: {worker_data.name}",
            f'{{"worker_id": "{worker_id}", "created_by": "{current_user.id}"}}'
        )
        
        # Fetch the created worker
        worker = await conn.fetchrow(
            "SELECT * FROM workers WHERE id = $1",
            worker_id
        )
        
        return WorkerResponse(**dict(worker))

@workers_router.put("/{worker_id}", response_model=WorkerResponse)
async def update_worker(
    worker_id: str,
    updates: WorkerUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a worker"""
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update workers")
    
    async with db.get_connection() as conn:
        # Check if worker exists
        existing_worker = await conn.fetchrow(
            "SELECT name FROM workers WHERE id = $1",
            worker_id
        )
        
        if not existing_worker:
            raise HTTPException(status_code=404, detail="Worker not found")
        
        # Build update query dynamically
        set_clauses = []
        values = []
        param_count = 1
        
        if updates.status is not None:
            set_clauses.append(f"status = ${param_count}")
            values.append(updates.status)
            param_count += 1
        
        if updates.cpuUsage is not None:
            set_clauses.append(f"cpu_usage = ${param_count}")
            values.append(updates.cpuUsage)
            param_count += 1
        
        if updates.memoryUsage is not None:
            set_clauses.append(f"memory_usage = ${param_count}")
            values.append(updates.memoryUsage)
            param_count += 1
        
        if updates.activeSessions is not None:
            set_clauses.append(f"active_sessions = ${param_count}")
            values.append(updates.activeSessions)
            param_count += 1
        
        if updates.messagesPerHour is not None:
            set_clauses.append(f"messages_per_hour = ${param_count}")
            values.append(updates.messagesPerHour)
            param_count += 1
        
        if updates.config is not None:
            set_clauses.append(f"config = ${param_count}")
            values.append(updates.config)
            param_count += 1
        
        if not set_clauses:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        # Add heartbeat if status is being set to online
        if updates.status == "online":
            set_clauses.append(f"last_heartbeat = ${param_count}")
            values.append(datetime.now())
            param_count += 1
        
        set_clauses.append(f"updated_at = ${param_count}")
        values.append(datetime.now())
        values.append(worker_id)
        
        update_query = f"""
            UPDATE workers 
            SET {', '.join(set_clauses)}
            WHERE id = ${param_count + 1}
        """
        
        await conn.execute(update_query, *values)
        
        # Log the update
        await conn.execute(
            """
            INSERT INTO system_logs (level, message, component, metadata)
            VALUES ('info', $1, 'worker', $2)
            """,
            f"Worker {existing_worker['name']} updated",
            f'{{"worker_id": "{worker_id}", "updated_by": "{current_user.id}"}}'
        )
        
        # Fetch updated worker
        worker = await conn.fetchrow(
            "SELECT * FROM workers WHERE id = $1",
            worker_id
        )
        
        return WorkerResponse(**dict(worker))

@workers_router.delete("/{worker_id}")
async def delete_worker(
    worker_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a worker"""
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete workers")
    
    async with db.get_connection() as conn:
        # Check if worker exists
        existing_worker = await conn.fetchrow(
            "SELECT name FROM workers WHERE id = $1",
            worker_id
        )
        
        if not existing_worker:
            raise HTTPException(status_code=404, detail="Worker not found")
        
        # Check if worker has active sessions
        active_sessions = await conn.fetchval(
            "SELECT COUNT(*) FROM telegram_sessions WHERE worker_id = $1 AND status = 'active'",
            worker_id
        )
        
        if active_sessions > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete worker with {active_sessions} active sessions"
            )
        
        # Update sessions to remove worker reference
        await conn.execute(
            "UPDATE telegram_sessions SET worker_id = NULL WHERE worker_id = $1",
            worker_id
        )
        
        # Delete the worker
        await conn.execute(
            "DELETE FROM workers WHERE id = $1",
            worker_id
        )
        
        # Log the deletion
        await conn.execute(
            """
            INSERT INTO system_logs (level, message, component, metadata)
            VALUES ('info', $1, 'worker', $2)
            """,
            f"Worker {existing_worker['name']} deleted",
            f'{{"worker_id": "{worker_id}", "deleted_by": "{current_user.id}"}}'
        )
        
        return {"message": "Worker deleted successfully"}

@workers_router.post("/{worker_id}/restart")
async def restart_worker(
    worker_id: str,
    current_user: User = Depends(get_current_user)
):
    """Restart a worker"""
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Only admins can restart workers")
    
    async with db.get_connection() as conn:
        # Check if worker exists
        existing_worker = await conn.fetchrow(
            "SELECT name FROM workers WHERE id = $1",
            worker_id
        )
        
        if not existing_worker:
            raise HTTPException(status_code=404, detail="Worker not found")
        
        # Update worker status to restarting, then online
        await conn.execute(
            """
            UPDATE workers 
            SET status = 'online', last_heartbeat = $1, updated_at = $1
            WHERE id = $2
            """,
            datetime.now(),
            worker_id
        )
        
        # Log the restart
        await conn.execute(
            """
            INSERT INTO system_logs (level, message, component, metadata)
            VALUES ('info', $1, 'worker', $2)
            """,
            f"Worker {existing_worker['name']} restarted",
            f'{{"worker_id": "{worker_id}", "restarted_by": "{current_user.id}"}}'
        )
        
        return {"message": "Worker restarted successfully"}

@workers_router.post("/{worker_id}/stop")
async def stop_worker(
    worker_id: str,
    current_user: User = Depends(get_current_user)
):
    """Stop a worker"""
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Only admins can stop workers")
    
    async with db.get_connection() as conn:
        # Check if worker exists
        existing_worker = await conn.fetchrow(
            "SELECT name FROM workers WHERE id = $1",
            worker_id
        )
        
        if not existing_worker:
            raise HTTPException(status_code=404, detail="Worker not found")
        
        # Stop all sessions assigned to this worker
        await conn.execute(
            """
            UPDATE telegram_sessions 
            SET status = 'idle', worker_id = NULL, updated_at = $1
            WHERE worker_id = $2 AND status = 'active'
            """,
            datetime.now(),
            worker_id
        )
        
        # Update worker status to offline
        await conn.execute(
            """
            UPDATE workers 
            SET status = 'offline', active_sessions = 0, 
                cpu_usage = 0, memory_usage = 0, messages_per_hour = 0,
                updated_at = $1
            WHERE id = $2
            """,
            datetime.now(),
            worker_id
        )
        
        # Log the stop
        await conn.execute(
            """
            INSERT INTO system_logs (level, message, component, metadata)
            VALUES ('info', $1, 'worker', $2)
            """,
            f"Worker {existing_worker['name']} stopped",
            f'{{"worker_id": "{worker_id}", "stopped_by": "{current_user.id}"}}'
        )
        
        return {"message": "Worker stopped successfully"}
