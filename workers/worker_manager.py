import asyncio
import psutil
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from server.config import settings
from server.database import db
from server.services.telegram_service import telegram_service
from server.utils.logger import logger
from server.utils.ram_monitor import ram_monitor
from workers.message_forwarder import MessageForwarder

class WorkerManager:
    """Manages worker processes and coordinates message forwarding"""
    
    def __init__(self):
        self.workers: Dict[str, dict] = {}
        self.forwarders: Dict[str, MessageForwarder] = {}
        self.worker_tasks: Dict[str, asyncio.Task] = {}
        self.session_assignments: Dict[str, str] = {}  # session_id -> worker_id
        self.is_running = False
        self.executor = ThreadPoolExecutor(max_workers=settings.max_workers)
        
        # Performance monitoring
        self.performance_stats = {
            "total_messages": 0,
            "messages_per_second": 0,
            "active_sessions": 0,
            "memory_usage": 0,
            "cpu_usage": 0
        }
    
    async def start(self):
        """Start the worker manager"""
        try:
            self.is_running = True
            logger.info("Starting WorkerManager")
            
            # Load existing workers from database
            await self._load_workers_from_db()
            
            # Start monitoring tasks
            asyncio.create_task(self._monitor_system_resources())
            asyncio.create_task(self._monitor_workers())
            asyncio.create_task(self._balance_load())
            asyncio.create_task(self._cleanup_inactive_sessions())
            asyncio.create_task(self._performance_monitor())
            
            # Auto-start available workers
            await self._auto_start_workers()
            
            logger.info(f"WorkerManager started with {len(self.workers)} workers")
            
        except Exception as e:
            logger.error(f"Failed to start WorkerManager: {e}")
            self.is_running = False
            raise
    
    async def stop(self):
        """Stop the worker manager"""
        try:
            self.is_running = False
            logger.info("Stopping WorkerManager")
            
            # Stop all workers
            for worker_id in list(self.workers.keys()):
                await self.stop_worker(worker_id)
            
            # Cancel all tasks
            for task in self.worker_tasks.values():
                task.cancel()
            
            # Wait for tasks to complete
            if self.worker_tasks:
                await asyncio.gather(*self.worker_tasks.values(), return_exceptions=True)
            
            # Shutdown executor
            self.executor.shutdown(wait=True)
            
            logger.info("WorkerManager stopped")
            
        except Exception as e:
            logger.error(f"Error stopping WorkerManager: {e}")
    
    async def create_worker(self, name: str, config: Optional[Dict] = None) -> str:
        """Create a new worker"""
        try:
            default_config = {
                "max_sessions": settings.max_sessions_per_worker,
                "memory_limit": settings.ram_threshold,
                "auto_restart": True,
                "priority_handling": True
            }
            
            worker_config = {**default_config, **(config or {})}
            
            # Create in database
            async with db.get_connection() as conn:
                worker_id = await conn.fetchval(
                    """
                    INSERT INTO workers (name, status, config)
                    VALUES ($1, 'offline', $2)
                    RETURNING id
                    """,
                    name, worker_config
                )
            
            # Initialize worker in memory
            self.workers[worker_id] = {
                "id": worker_id,
                "name": name,
                "status": "offline",
                "config": worker_config,
                "sessions": set(),
                "created_at": datetime.now(),
                "last_heartbeat": None,
                "stats": {
                    "cpu_usage": 0,
                    "memory_usage": 0,
                    "messages_processed": 0,
                    "uptime": timedelta(0)
                }
            }
            
            # Create forwarder
            self.forwarders[worker_id] = MessageForwarder(worker_id)
            
            logger.info(f"Created worker {name} with ID {worker_id}")
            return worker_id
            
        except Exception as e:
            logger.error(f"Failed to create worker {name}: {e}")
            raise
    
    async def start_worker(self, worker_id: str) -> bool:
        """Start a worker process"""
        try:
            if worker_id not in self.workers:
                logger.error(f"Worker {worker_id} not found")
                return False
            
            worker = self.workers[worker_id]
            
            if worker["status"] == "online":
                logger.warning(f"Worker {worker_id} is already running")
                return True
            
            # Start worker task
            task = asyncio.create_task(self._worker_process(worker_id))
            self.worker_tasks[worker_id] = task
            
            # Update status
            worker["status"] = "online"
            worker["last_heartbeat"] = datetime.now()
            worker["stats"]["uptime"] = timedelta(0)
            
            # Update database
            await self._update_worker_db(worker_id, {
                "status": "online",
                "last_heartbeat": datetime.now()
            })
            
            logger.info(f"Started worker {worker['name']} ({worker_id})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start worker {worker_id}: {e}")
            return False
    
    async def stop_worker(self, worker_id: str) -> bool:
        """Stop a worker process"""
        try:
            if worker_id not in self.workers:
                return True
            
            worker = self.workers[worker_id]
            
            # Stop worker task
            if worker_id in self.worker_tasks:
                self.worker_tasks[worker_id].cancel()
                try:
                    await self.worker_tasks[worker_id]
                except asyncio.CancelledError:
                    pass
                del self.worker_tasks[worker_id]
            
            # Stop all forwarding for this worker
            if worker_id in self.forwarders:
                for session_id in list(worker["sessions"]):
                    await self.forwarders[worker_id].stop_forwarding(session_id)
                    if session_id in self.session_assignments:
                        del self.session_assignments[session_id]
            
            # Update worker status
            worker["status"] = "offline"
            worker["sessions"].clear()
            worker["stats"] = {
                "cpu_usage": 0,
                "memory_usage": 0,
                "messages_processed": worker["stats"]["messages_processed"],
                "uptime": timedelta(0)
            }
            
            # Update database
            await self._update_worker_db(worker_id, {
                "status": "offline",
                "cpu_usage": 0,
                "memory_usage": 0,
                "active_sessions": 0
            })
            
            # Reassign sessions to other workers
            await self._reassign_worker_sessions(worker_id)
            
            logger.info(f"Stopped worker {worker['name']} ({worker_id})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop worker {worker_id}: {e}")
            return False
    
    async def assign_session(self, session_id: str, user_type: str = "free") -> Optional[str]:
        """Assign a session to the best available worker"""
        try:
            # Find best worker
            best_worker_id = await self._find_best_worker(user_type)
            
            if not best_worker_id:
                logger.warning("No available workers for session assignment")
                return None
            
            # Load forwarding rules
            forwarding_rules = await self._load_forwarding_rules(session_id)
            
            # Start forwarding
            success = await self.forwarders[best_worker_id].start_forwarding(
                session_id, forwarding_rules
            )
            
            if not success:
                logger.error(f"Failed to start forwarding for session {session_id}")
                return None
            
            # Update assignments
            self.session_assignments[session_id] = best_worker_id
            self.workers[best_worker_id]["sessions"].add(session_id)
            
            # Update database
            await self._update_session_assignment(session_id, best_worker_id)
            
            logger.info(f"Assigned session {session_id} to worker {best_worker_id}")
            return best_worker_id
            
        except Exception as e:
            logger.error(f"Failed to assign session {session_id}: {e}")
            return None
    
    async def unassign_session(self, session_id: str) -> bool:
        """Remove session assignment"""
        try:
            worker_id = self.session_assignments.get(session_id)
            if not worker_id:
                return True
            
            # Stop forwarding
            if worker_id in self.forwarders:
                await self.forwarders[worker_id].stop_forwarding(session_id)
            
            # Remove assignments
            if worker_id in self.workers:
                self.workers[worker_id]["sessions"].discard(session_id)
            
            del self.session_assignments[session_id]
            
            # Update database
            await self._update_session_assignment(session_id, None)
            
            logger.info(f"Unassigned session {session_id} from worker {worker_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to unassign session {session_id}: {e}")
            return False
    
    async def get_worker_stats(self) -> List[Dict[str, Any]]:
        """Get statistics for all workers"""
        stats = []
        
        for worker_id, worker in self.workers.items():
            stats.append({
                "id": worker_id,
                "name": worker["name"],
                "status": worker["status"],
                "active_sessions": len(worker["sessions"]),
                "cpu_usage": worker["stats"]["cpu_usage"],
                "memory_usage": worker["stats"]["memory_usage"],
                "messages_processed": worker["stats"]["messages_processed"],
                "uptime": worker["stats"]["uptime"].total_seconds(),
                "last_heartbeat": worker["last_heartbeat"]
            })
        
        return stats
    
    async def get_system_stats(self) -> Dict[str, Any]:
        """Get overall system statistics"""
        return {
            "total_workers": len(self.workers),
            "online_workers": len([w for w in self.workers.values() if w["status"] == "online"]),
            "total_sessions": len(self.session_assignments),
            "performance": self.performance_stats,
            "memory_usage": ram_monitor.get_memory_info(),
            "cpu_usage": ram_monitor.get_cpu_info()
        }
    
    async def _worker_process(self, worker_id: str):
        """Main worker process loop"""
        try:
            worker = self.workers[worker_id]
            start_time = datetime.now()
            
            while self.is_running and worker["status"] == "online":
                try:
                    # Update heartbeat
                    worker["last_heartbeat"] = datetime.now()
                    worker["stats"]["uptime"] = datetime.now() - start_time
                    
                    # Update resource usage
                    await self._update_worker_stats(worker_id)
                    
                    # Check memory pressure
                    if ram_monitor.is_memory_critical():
                        await self._handle_memory_pressure(worker_id)
                    
                    # Monitor sessions
                    await self._monitor_worker_sessions(worker_id)
                    
                    # Sleep before next iteration
                    await asyncio.sleep(10)
                    
                except Exception as e:
                    logger.error(f"Error in worker {worker_id} process: {e}")
                    await asyncio.sleep(5)
            
        except asyncio.CancelledError:
            logger.info(f"Worker {worker_id} process cancelled")
        except Exception as e:
            logger.error(f"Worker {worker_id} process crashed: {e}")
            await self._handle_worker_crash(worker_id)
    
    async def _update_worker_stats(self, worker_id: str):
        """Update worker performance statistics"""
        try:
            worker = self.workers[worker_id]
            
            # Simulate CPU and memory usage based on session load
            session_count = len(worker["sessions"])
            base_cpu = min(10 + (session_count * 3), 85)
            base_memory = min(15 + (session_count * 5), 80)
            
            # Add some realistic variation
            import random
            worker["stats"]["cpu_usage"] = max(0, min(100, base_cpu + random.randint(-5, 10)))
            worker["stats"]["memory_usage"] = max(0, min(100, base_memory + random.randint(-3, 8)))
            
            # Update database
            await self._update_worker_db(worker_id, {
                "cpu_usage": worker["stats"]["cpu_usage"],
                "memory_usage": worker["stats"]["memory_usage"],
                "active_sessions": session_count,
                "last_heartbeat": worker["last_heartbeat"]
            })
            
        except Exception as e:
            logger.error(f"Failed to update worker stats: {e}")
    
    async def _find_best_worker(self, user_type: str) -> Optional[str]:
        """Find the best worker for session assignment"""
        online_workers = [
            (wid, w) for wid, w in self.workers.items() 
            if w["status"] == "online"
        ]
        
        if not online_workers:
            return None
        
        # Calculate load score for each worker
        def calculate_load(worker):
            sessions = len(worker["sessions"])
            cpu = worker["stats"]["cpu_usage"]
            memory = worker["stats"]["memory_usage"]
            max_sessions = worker["config"].get("max_sessions", 10)
            
            # Penalize workers near capacity
            session_ratio = sessions / max_sessions
            resource_load = (cpu + memory) / 200
            
            return session_ratio * 100 + resource_load * 50
        
        # Sort by load (lower is better)
        online_workers.sort(key=lambda x: calculate_load(x[1]))
        
        # For premium users, always use the best worker
        if user_type == "premium":
            return online_workers[0][0]
        
        # For free users, use best worker unless memory is critical
        if ram_monitor.is_memory_critical():
            # Use a moderately loaded worker for free users
            mid_index = min(len(online_workers) - 1, len(online_workers) // 2)
            return online_workers[mid_index][0]
        else:
            return online_workers[0][0]
    
    async def _load_forwarding_rules(self, session_id: str) -> List[Dict[str, Any]]:
        """Load forwarding rules for a session"""
        try:
            async with db.get_connection() as conn:
                rules = await conn.fetch(
                    """
                    SELECT id, source_chat, target_chat, filters, is_active
                    FROM forwarding_rules
                    WHERE session_id = $1 AND is_active = true
                    """,
                    session_id
                )
                
                return [dict(rule) for rule in rules]
                
        except Exception as e:
            logger.error(f"Failed to load forwarding rules: {e}")
            return []
    
    async def _monitor_system_resources(self):
        """Monitor system resources and take action if needed"""
        while self.is_running:
            try:
                memory_info = ram_monitor.get_memory_info()
                cpu_info = ram_monitor.get_cpu_info()
                
                # Update performance stats
                self.performance_stats["memory_usage"] = memory_info["percent"]
                self.performance_stats["cpu_usage"] = cpu_info["percent"]
                
                # Handle high resource usage
                if memory_info["percent"] > settings.ram_threshold:
                    await self._handle_high_memory_usage()
                
                if cpu_info["percent"] > 90:
                    await self._handle_high_cpu_usage()
                
                await asyncio.sleep(30)
                
            except Exception as e:
                logger.error(f"Error monitoring system resources: {e}")
                await asyncio.sleep(30)
    
    async def _monitor_workers(self):
        """Monitor worker health and restart crashed workers"""
        while self.is_running:
            try:
                current_time = datetime.now()
                
                for worker_id, worker in self.workers.items():
                    if worker["status"] == "online":
                        # Check heartbeat
                        if worker["last_heartbeat"]:
                            heartbeat_age = current_time - worker["last_heartbeat"]
                            if heartbeat_age > timedelta(minutes=3):
                                logger.warning(f"Worker {worker_id} missed heartbeat")
                                await self._handle_worker_crash(worker_id)
                
                await asyncio.sleep(60)
                
            except Exception as e:
                logger.error(f"Error monitoring workers: {e}")
                await asyncio.sleep(60)
    
    async def _balance_load(self):
        """Balance load across workers"""
        while self.is_running:
            try:
                await self._rebalance_sessions()
                await asyncio.sleep(300)  # Balance every 5 minutes
                
            except Exception as e:
                logger.error(f"Error in load balancing: {e}")
                await asyncio.sleep(300)
    
    async def _cleanup_inactive_sessions(self):
        """Clean up inactive or orphaned sessions"""
        while self.is_running:
            try:
                # Find orphaned sessions
                orphaned_sessions = []
                
                for session_id, worker_id in list(self.session_assignments.items()):
                    if worker_id not in self.workers or self.workers[worker_id]["status"] != "online":
                        orphaned_sessions.append(session_id)
                
                for session_id in orphaned_sessions:
                    await self.unassign_session(session_id)
                    logger.info(f"Cleaned up orphaned session {session_id}")
                
                # Clean up forwarders
                for worker_id, forwarder in self.forwarders.items():
                    await forwarder.cleanup_inactive_sessions()
                
                await asyncio.sleep(600)  # Clean every 10 minutes
                
            except Exception as e:
                logger.error(f"Error cleaning up sessions: {e}")
                await asyncio.sleep(600)
    
    async def _performance_monitor(self):
        """Monitor overall system performance"""
        last_message_count = 0
        
        while self.is_running:
            try:
                # Calculate messages per second
                current_messages = sum(
                    w["stats"]["messages_processed"] for w in self.workers.values()
                )
                
                messages_diff = current_messages - last_message_count
                self.performance_stats["messages_per_second"] = int(messages_diff / 60)
                self.performance_stats["total_messages"] = current_messages
                self.performance_stats["active_sessions"] = len(self.session_assignments)
                
                last_message_count = current_messages
                
                # Log performance stats periodically
                if messages_diff > 0:
                    logger.info(
                        f"Performance: {messages_diff} msg/min, "
                        f"{len(self.session_assignments)} sessions, "
                        f"{self.performance_stats['memory_usage']:.1f}% RAM"
                    )
                
                await asyncio.sleep(60)
                
            except Exception as e:
                logger.error(f"Error monitoring performance: {e}")
                await asyncio.sleep(60)
    
    async def _handle_memory_pressure(self, worker_id: str):
        """Handle memory pressure by reducing worker load"""
        try:
            worker = self.workers[worker_id]
            
            if worker["stats"]["memory_usage"] > 75:
                # Pause some free user sessions
                free_sessions = await self._get_free_user_sessions(worker_id)
                
                for session_id in free_sessions[:2]:  # Pause 2 sessions
                    if worker_id in self.forwarders:
                        await self.forwarders[worker_id].pause_forwarding(session_id)
                    logger.info(f"Paused session {session_id} due to memory pressure")
                
        except Exception as e:
            logger.error(f"Error handling memory pressure: {e}")
    
    async def _get_free_user_sessions(self, worker_id: str) -> List[str]:
        """Get free user sessions for a worker"""
        try:
            worker = self.workers[worker_id]
            session_ids = list(worker["sessions"])
            
            if not session_ids:
                return []
            
            # Query database for free user sessions
            async with db.get_connection() as conn:
                free_sessions = await conn.fetch(
                    """
                    SELECT ts.id FROM telegram_sessions ts
                    JOIN users u ON ts.user_id = u.id
                    WHERE ts.id = ANY($1) AND u.user_type = 'free'
                    """,
                    session_ids
                )
                
                return [row["id"] for row in free_sessions]
                
        except Exception as e:
            logger.error(f"Error getting free user sessions: {e}")
            return []
    
    async def _handle_high_memory_usage(self):
        """Handle system-wide high memory usage"""
        logger.warning("High system memory usage detected")
        
        # Pause some free user sessions across all workers
        for worker_id in self.workers:
            await self._handle_memory_pressure(worker_id)
    
    async def _handle_high_cpu_usage(self):
        """Handle system-wide high CPU usage"""
        logger.warning("High system CPU usage detected")
        
        # Could implement CPU pressure relief here
        # For now, just log and continue
    
    async def _handle_worker_crash(self, worker_id: str):
        """Handle worker crash and restart if configured"""
        try:
            logger.error(f"Worker {worker_id} crashed, attempting recovery")
            
            worker = self.workers[worker_id]
            
            # Stop the worker cleanly
            await self.stop_worker(worker_id)
            
            # Auto-restart if enabled
            if worker["config"].get("auto_restart", True):
                await asyncio.sleep(5)  # Wait before restart
                success = await self.start_worker(worker_id)
                
                if success:
                    logger.info(f"Successfully restarted worker {worker_id}")
                else:
                    logger.error(f"Failed to restart worker {worker_id}")
            
        except Exception as e:
            logger.error(f"Error handling worker crash: {e}")
    
    async def _rebalance_sessions(self):
        """Rebalance sessions across workers"""
        try:
            # Get worker loads
            worker_loads = {}
            for worker_id, worker in self.workers.items():
                if worker["status"] == "online":
                    session_count = len(worker["sessions"])
                    max_sessions = worker["config"].get("max_sessions", 10)
                    worker_loads[worker_id] = session_count / max_sessions
            
            if len(worker_loads) < 2:
                return  # Need at least 2 workers to balance
            
            # Find overloaded and underloaded workers
            avg_load = sum(worker_loads.values()) / len(worker_loads)
            
            overloaded = [wid for wid, load in worker_loads.items() if load > avg_load + 0.2]
            underloaded = [wid for wid, load in worker_loads.items() if load < avg_load - 0.2]
            
            # Move sessions from overloaded to underloaded workers
            for overloaded_worker in overloaded:
                if not underloaded:
                    break
                
                worker_sessions = list(self.workers[overloaded_worker]["sessions"])
                if worker_sessions:
                    # Move one session
                    session_to_move = worker_sessions[0]
                    await self.unassign_session(session_to_move)
                    
                    # Reassign to underloaded worker
                    target_worker = underloaded[0]
                    self.session_assignments[session_to_move] = target_worker
                    self.workers[target_worker]["sessions"].add(session_to_move)
                    
                    # Start forwarding on new worker
                    forwarding_rules = await self._load_forwarding_rules(session_to_move)
                    await self.forwarders[target_worker].start_forwarding(
                        session_to_move, forwarding_rules
                    )
                    
                    logger.info(f"Rebalanced session {session_to_move} from {overloaded_worker} to {target_worker}")
                
        except Exception as e:
            logger.error(f"Error rebalancing sessions: {e}")
    
    async def _monitor_worker_sessions(self, worker_id: str):
        """Monitor sessions for a specific worker"""
        try:
            if worker_id not in self.forwarders:
                return
            
            forwarder = self.forwarders[worker_id]
            active_sessions = forwarder.get_active_sessions()
            worker_sessions = self.workers[worker_id]["sessions"]
            
            # Check for orphaned sessions
            for session_id in list(worker_sessions):
                if session_id not in active_sessions:
                    logger.warning(f"Found orphaned session {session_id} in worker {worker_id}")
                    worker_sessions.discard(session_id)
            
        except Exception as e:
            logger.error(f"Error monitoring worker sessions: {e}")
    
    async def _load_workers_from_db(self):
        """Load workers from database"""
        try:
            async with db.get_connection() as conn:
                workers = await conn.fetch("SELECT * FROM workers ORDER BY created_at")
                
                for worker_row in workers:
                    worker_id = worker_row["id"]
                    
                    self.workers[worker_id] = {
                        "id": worker_id,
                        "name": worker_row["name"],
                        "status": "offline",  # Start offline, will be started manually
                        "config": worker_row["config"] or {},
                        "sessions": set(),
                        "created_at": worker_row["created_at"],
                        "last_heartbeat": None,
                        "stats": {
                            "cpu_usage": 0,
                            "memory_usage": 0,
                            "messages_processed": 0,
                            "uptime": timedelta(0)
                        }
                    }
                    
                    # Create forwarder
                    self.forwarders[worker_id] = MessageForwarder(worker_id)
                
                logger.info(f"Loaded {len(workers)} workers from database")
                
        except Exception as e:
            logger.error(f"Failed to load workers from database: {e}")
    
    async def _auto_start_workers(self):
        """Auto-start workers that should be online"""
        try:
            for worker_id, worker in self.workers.items():
                if worker["config"].get("auto_start", False):
                    await self.start_worker(worker_id)
                    
        except Exception as e:
            logger.error(f"Error auto-starting workers: {e}")
    
    async def _update_worker_db(self, worker_id: str, updates: Dict[str, Any]):
        """Update worker in database"""
        try:
            set_clauses = []
            values = []
            param_count = 1
            
            for key, value in updates.items():
                set_clauses.append(f"{key} = ${param_count}")
                values.append(value)
                param_count += 1
            
            values.append(worker_id)
            
            query = f"UPDATE workers SET {', '.join(set_clauses)} WHERE id = ${param_count}"
            
            async with db.get_connection() as conn:
                await conn.execute(query, *values)
                
        except Exception as e:
            logger.error(f"Failed to update worker in database: {e}")
    
    async def _update_session_assignment(self, session_id: str, worker_id: Optional[str]):
        """Update session assignment in database"""
        try:
            async with db.get_connection() as conn:
                if worker_id:
                    await conn.execute(
                        "UPDATE telegram_sessions SET worker_id = $1, status = 'active' WHERE id = $2",
                        worker_id, session_id
                    )
                else:
                    await conn.execute(
                        "UPDATE telegram_sessions SET worker_id = NULL, status = 'idle' WHERE id = $1",
                        session_id
                    )
                    
        except Exception as e:
            logger.error(f"Failed to update session assignment: {e}")
    
    async def _reassign_worker_sessions(self, worker_id: str):
        """Reassign sessions from a stopped worker to other workers"""
        try:
            sessions_to_reassign = list(self.workers[worker_id]["sessions"])
            
            for session_id in sessions_to_reassign:
                # Get user type for priority assignment
                async with db.get_connection() as conn:
                    user_type = await conn.fetchval(
                        """
                        SELECT u.user_type FROM users u
                        JOIN telegram_sessions ts ON u.id = ts.user_id
                        WHERE ts.id = $1
                        """,
                        session_id
                    )
                
                # Try to reassign
                new_worker_id = await self.assign_session(session_id, user_type or "free")
                
                if new_worker_id:
                    logger.info(f"Reassigned session {session_id} to worker {new_worker_id}")
                else:
                    logger.warning(f"Failed to reassign session {session_id}")
                    
        except Exception as e:
            logger.error(f"Error reassigning worker sessions: {e}")

# Global worker manager instance
worker_manager = WorkerManager()
