import asyncio
import psutil
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from server.config import settings
from server.database import db
from server.utils.logger import logger
from server.utils.ram_monitor import ram_monitor

class WorkerService:
    """Service for managing worker processes and load balancing"""
    
    def __init__(self):
        self.workers: Dict[str, dict] = {}
        self.worker_tasks: Dict[str, asyncio.Task] = {}
        self.session_assignments: Dict[str, str] = {}  # session_id -> worker_id
        self.is_running = False
    
    async def start_worker_manager(self):
        """Start the worker management system"""
        self.is_running = True
        logger.info("Starting worker manager")
        
        # Start background tasks
        asyncio.create_task(self._monitor_workers())
        asyncio.create_task(self._balance_load())
        asyncio.create_task(self._cleanup_crashed_sessions())
    
    async def stop_worker_manager(self):
        """Stop the worker management system"""
        self.is_running = False
        
        # Stop all worker tasks
        for task in self.worker_tasks.values():
            task.cancel()
        
        # Wait for tasks to complete
        if self.worker_tasks:
            await asyncio.gather(*self.worker_tasks.values(), return_exceptions=True)
        
        logger.info("Worker manager stopped")
    
    async def create_worker(self, name: str, config: Optional[Dict] = None) -> str:
        """Create a new worker"""
        try:
            async with db.get_connection() as conn:
                worker_id = await conn.fetchval(
                    """
                    INSERT INTO workers (name, status, config)
                    VALUES ($1, 'offline', $2)
                    RETURNING id
                    """,
                    name, config or {}
                )
                
                # Initialize worker in memory
                self.workers[worker_id] = {
                    "id": worker_id,
                    "name": name,
                    "status": "offline",
                    "cpu_usage": 0,
                    "memory_usage": 0,
                    "active_sessions": 0,
                    "messages_per_hour": 0,
                    "last_heartbeat": None,
                    "config": config or {},
                    "session_ids": set()
                }
                
                logger.info(f"Created worker {name} with ID {worker_id}")
                return worker_id
                
        except Exception as e:
            logger.error(f"Failed to create worker {name}: {e}")
            raise
    
    async def start_worker(self, worker_id: str) -> bool:
        """Start a worker process"""
        try:
            if worker_id not in self.workers:
                # Load worker from database
                await self._load_worker_from_db(worker_id)
            
            worker = self.workers[worker_id]
            
            # Start worker task
            task = asyncio.create_task(self._worker_process(worker_id))
            self.worker_tasks[worker_id] = task
            
            # Update status
            worker["status"] = "online"
            worker["last_heartbeat"] = datetime.now()
            
            await self._update_worker_in_db(worker_id, {
                "status": "online",
                "last_heartbeat": datetime.now()
            })
            
            logger.info(f"Started worker {worker['name']}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start worker {worker_id}: {e}")
            return False
    
    async def stop_worker(self, worker_id: str) -> bool:
        """Stop a worker process"""
        try:
            if worker_id in self.worker_tasks:
                self.worker_tasks[worker_id].cancel()
                del self.worker_tasks[worker_id]
            
            if worker_id in self.workers:
                worker = self.workers[worker_id]
                worker["status"] = "offline"
                worker["cpu_usage"] = 0
                worker["memory_usage"] = 0
                worker["active_sessions"] = 0
                worker["messages_per_hour"] = 0
                
                # Reassign sessions to other workers
                await self._reassign_worker_sessions(worker_id)
            
            await self._update_worker_in_db(worker_id, {
                "status": "offline",
                "cpu_usage": 0,
                "memory_usage": 0,
                "active_sessions": 0,
                "messages_per_hour": 0
            })
            
            logger.info(f"Stopped worker {worker_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop worker {worker_id}: {e}")
            return False
    
    async def assign_session_to_worker(self, session_id: str, user_type: str = "free") -> Optional[str]:
        """Assign a session to the best available worker"""
        try:
            # Find best worker based on load and user priority
            best_worker_id = await self._find_best_worker(user_type)
            
            if not best_worker_id:
                logger.warning("No available workers for session assignment")
                return None
            
            # Assign session
            self.session_assignments[session_id] = best_worker_id
            
            if best_worker_id in self.workers:
                self.workers[best_worker_id]["session_ids"].add(session_id)
                self.workers[best_worker_id]["active_sessions"] += 1
            
            # Update database
            async with db.get_connection() as conn:
                await conn.execute(
                    "UPDATE telegram_sessions SET worker_id = $1, status = 'active' WHERE id = $2",
                    best_worker_id, session_id
                )
                
                await conn.execute(
                    "UPDATE workers SET active_sessions = active_sessions + 1 WHERE id = $1",
                    best_worker_id
                )
            
            logger.info(f"Assigned session {session_id} to worker {best_worker_id}")
            return best_worker_id
            
        except Exception as e:
            logger.error(f"Failed to assign session {session_id}: {e}")
            return None
    
    async def unassign_session(self, session_id: str) -> bool:
        """Remove session assignment from worker"""
        try:
            worker_id = self.session_assignments.get(session_id)
            if not worker_id:
                return True
            
            # Remove from worker
            if worker_id in self.workers:
                self.workers[worker_id]["session_ids"].discard(session_id)
                self.workers[worker_id]["active_sessions"] = max(0, self.workers[worker_id]["active_sessions"] - 1)
            
            # Remove assignment
            del self.session_assignments[session_id]
            
            # Update database
            async with db.get_connection() as conn:
                await conn.execute(
                    "UPDATE telegram_sessions SET worker_id = NULL, status = 'idle' WHERE id = $1",
                    session_id
                )
                
                await conn.execute(
                    "UPDATE workers SET active_sessions = GREATEST(0, active_sessions - 1) WHERE id = $1",
                    worker_id
                )
            
            logger.info(f"Unassigned session {session_id} from worker {worker_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to unassign session {session_id}: {e}")
            return False
    
    async def get_worker_stats(self, worker_id: str) -> Optional[Dict]:
        """Get detailed worker statistics"""
        if worker_id not in self.workers:
            return None
        
        worker = self.workers[worker_id]
        return {
            "id": worker_id,
            "name": worker["name"],
            "status": worker["status"],
            "cpu_usage": worker["cpu_usage"],
            "memory_usage": worker["memory_usage"],
            "active_sessions": worker["active_sessions"],
            "messages_per_hour": worker["messages_per_hour"],
            "last_heartbeat": worker["last_heartbeat"],
            "session_count": len(worker["session_ids"])
        }
    
    async def _worker_process(self, worker_id: str):
        """Main worker process loop"""
        try:
            while self.is_running and worker_id in self.workers:
                worker = self.workers[worker_id]
                
                # Simulate worker activity and update metrics
                await self._update_worker_metrics(worker_id)
                
                # Send heartbeat
                worker["last_heartbeat"] = datetime.now()
                
                # Check for priority adjustments
                if ram_monitor.is_memory_critical():
                    await self._handle_memory_pressure(worker_id)
                
                await asyncio.sleep(10)  # Update every 10 seconds
                
        except asyncio.CancelledError:
            logger.info(f"Worker process {worker_id} cancelled")
        except Exception as e:
            logger.error(f"Worker process {worker_id} crashed: {e}")
            await self._handle_worker_crash(worker_id)
    
    async def _update_worker_metrics(self, worker_id: str):
        """Update worker performance metrics"""
        try:
            worker = self.workers[worker_id]
            
            # Simulate CPU and memory usage based on active sessions
            base_cpu = min(20 + (worker["active_sessions"] * 5), 90)
            base_memory = min(30 + (worker["active_sessions"] * 8), 85)
            
            # Add some variation
            import random
            worker["cpu_usage"] = max(0, min(100, base_cpu + random.randint(-5, 5)))
            worker["memory_usage"] = max(0, min(100, base_memory + random.randint(-3, 7)))
            
            # Calculate messages per hour (simulated)
            worker["messages_per_hour"] = worker["active_sessions"] * random.randint(300, 600)
            
            # Update database
            await self._update_worker_in_db(worker_id, {
                "cpu_usage": worker["cpu_usage"],
                "memory_usage": worker["memory_usage"],
                "messages_per_hour": worker["messages_per_hour"],
                "last_heartbeat": worker["last_heartbeat"]
            })
            
        except Exception as e:
            logger.error(f"Failed to update metrics for worker {worker_id}: {e}")
    
    async def _find_best_worker(self, user_type: str) -> Optional[str]:
        """Find the best worker for session assignment"""
        online_workers = [(wid, w) for wid, w in self.workers.items() if w["status"] == "online"]
        
        if not online_workers:
            return None
        
        # Sort by load (active sessions and resource usage)
        def calculate_load(worker):
            sessions = worker["active_sessions"]
            cpu = worker["cpu_usage"]
            memory = worker["memory_usage"]
            return sessions * 10 + cpu * 0.5 + memory * 0.3
        
        online_workers.sort(key=lambda x: calculate_load(x[1]))
        
        # For premium users, always use the best worker
        # For free users, use less optimal workers if memory is high
        if user_type == "premium" or not ram_monitor.is_memory_critical():
            return online_workers[0][0]
        else:
            # Use a worker with medium load for free users
            mid_index = min(len(online_workers) - 1, len(online_workers) // 2)
            return online_workers[mid_index][0]
    
    async def _handle_memory_pressure(self, worker_id: str):
        """Handle high memory usage by reducing load"""
        worker = self.workers[worker_id]
        
        if worker["memory_usage"] > settings.ram_threshold:
            # Pause some free user sessions
            await self._pause_low_priority_sessions(worker_id)
    
    async def _pause_low_priority_sessions(self, worker_id: str):
        """Pause free user sessions when memory is high"""
        try:
            async with db.get_connection() as conn:
                free_sessions = await conn.fetch(
                    """
                    SELECT ts.id FROM telegram_sessions ts
                    JOIN users u ON ts.user_id = u.id
                    WHERE ts.worker_id = $1 AND u.user_type = 'free' AND ts.status = 'active'
                    LIMIT 2
                    """,
                    worker_id
                )
                
                for session in free_sessions:
                    await self.unassign_session(session["id"])
                    logger.info(f"Paused free user session {session['id']} due to memory pressure")
                    
        except Exception as e:
            logger.error(f"Failed to pause low priority sessions: {e}")
    
    async def _monitor_workers(self):
        """Monitor worker health and restart crashed workers"""
        while self.is_running:
            try:
                current_time = datetime.now()
                
                for worker_id, worker in self.workers.items():
                    if worker["status"] == "online":
                        # Check if worker missed heartbeat
                        if worker["last_heartbeat"]:
                            time_since_heartbeat = current_time - worker["last_heartbeat"]
                            if time_since_heartbeat > timedelta(minutes=2):
                                logger.warning(f"Worker {worker_id} missed heartbeat, restarting")
                                await self._handle_worker_crash(worker_id)
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Error in worker monitoring: {e}")
                await asyncio.sleep(30)
    
    async def _balance_load(self):
        """Balance load across workers"""
        while self.is_running:
            try:
                # Implement load balancing logic
                await self._rebalance_sessions_if_needed()
                await asyncio.sleep(60)  # Balance every minute
                
            except Exception as e:
                logger.error(f"Error in load balancing: {e}")
                await asyncio.sleep(60)
    
    async def _cleanup_crashed_sessions(self):
        """Clean up sessions from crashed workers"""
        while self.is_running:
            try:
                async with db.get_connection() as conn:
                    # Find sessions assigned to offline workers
                    crashed_sessions = await conn.fetch(
                        """
                        SELECT ts.id, ts.user_id FROM telegram_sessions ts
                        JOIN workers w ON ts.worker_id = w.id
                        WHERE w.status = 'offline' AND ts.status = 'active'
                        """
                    )
                    
                    for session in crashed_sessions:
                        await self.unassign_session(session["id"])
                        logger.info(f"Cleaned up session {session['id']} from crashed worker")
                
                await asyncio.sleep(300)  # Check every 5 minutes
                
            except Exception as e:
                logger.error(f"Error in session cleanup: {e}")
                await asyncio.sleep(300)
    
    async def _handle_worker_crash(self, worker_id: str):
        """Handle worker crash and restart if needed"""
        try:
            await self.stop_worker(worker_id)
            
            # Auto-restart if enabled
            if settings.debug or True:  # For demo, always restart
                await asyncio.sleep(5)  # Wait before restart
                await self.start_worker(worker_id)
                
        except Exception as e:
            logger.error(f"Failed to handle worker crash {worker_id}: {e}")
    
    async def _reassign_worker_sessions(self, worker_id: str):
        """Reassign all sessions from a worker to other workers"""
        if worker_id not in self.workers:
            return
        
        session_ids = list(self.workers[worker_id]["session_ids"])
        self.workers[worker_id]["session_ids"].clear()
        
        for session_id in session_ids:
            if session_id in self.session_assignments:
                del self.session_assignments[session_id]
            
            # Try to reassign to another worker
            await self.assign_session_to_worker(session_id)
    
    async def _load_worker_from_db(self, worker_id: str):
        """Load worker data from database"""
        async with db.get_connection() as conn:
            worker_data = await conn.fetchrow(
                "SELECT * FROM workers WHERE id = $1",
                worker_id
            )
            
            if worker_data:
                self.workers[worker_id] = {
                    "id": worker_id,
                    "name": worker_data["name"],
                    "status": worker_data["status"],
                    "cpu_usage": worker_data["cpu_usage"],
                    "memory_usage": worker_data["memory_usage"],
                    "active_sessions": worker_data["active_sessions"],
                    "messages_per_hour": worker_data["messages_per_hour"],
                    "last_heartbeat": worker_data["last_heartbeat"],
                    "config": worker_data["config"],
                    "session_ids": set()
                }
    
    async def _update_worker_in_db(self, worker_id: str, updates: Dict):
        """Update worker data in database"""
        set_clauses = []
        values = []
        param_count = 1
        
        for key, value in updates.items():
            set_clauses.append(f"{key} = ${param_count}")
            values.append(value)
            param_count += 1
        
        set_clauses.append(f"updated_at = ${param_count}")
        values.append(datetime.now())
        values.append(worker_id)
        
        query = f"UPDATE workers SET {', '.join(set_clauses)} WHERE id = ${param_count + 1}"
        
        async with db.get_connection() as conn:
            await conn.execute(query, *values)
    
    async def _rebalance_sessions_if_needed(self):
        """Rebalance sessions across workers if load is uneven"""
        # Simple rebalancing logic - move sessions from overloaded workers
        overloaded_workers = [
            (wid, w) for wid, w in self.workers.items()
            if w["status"] == "online" and w["active_sessions"] > settings.max_sessions_per_worker
        ]
        
        for worker_id, worker in overloaded_workers:
            # Move some sessions to less loaded workers
            sessions_to_move = list(worker["session_ids"])[:2]  # Move 2 sessions
            
            for session_id in sessions_to_move:
                await self.unassign_session(session_id)
                await self.assign_session_to_worker(session_id)

# Global service instance
worker_service = WorkerService()
