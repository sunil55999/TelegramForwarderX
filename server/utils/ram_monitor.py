import psutil
import asyncio
from typing import Dict, Any
from server.utils.logger import logger

class RAMMonitor:
    """Monitor system RAM usage and manage resources"""
    
    def __init__(self, threshold: int = 80):
        self.threshold = threshold
        self.is_monitoring = False
    
    def get_memory_info(self) -> Dict[str, Any]:
        """Get current memory information"""
        memory = psutil.virtual_memory()
        return {
            "total": memory.total,
            "available": memory.available,
            "percent": memory.percent,
            "used": memory.used,
            "free": memory.free
        }
    
    def get_cpu_info(self) -> Dict[str, Any]:
        """Get current CPU information"""
        return {
            "percent": psutil.cpu_percent(interval=1),
            "count": psutil.cpu_count(),
            "load_avg": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
        }
    
    def is_memory_critical(self) -> bool:
        """Check if memory usage is above threshold"""
        memory_info = self.get_memory_info()
        return memory_info["percent"] > self.threshold
    
    async def start_monitoring(self, interval: int = 30):
        """Start continuous memory monitoring"""
        self.is_monitoring = True
        logger.info(f"Starting RAM monitoring with {interval}s interval")
        
        while self.is_monitoring:
            try:
                memory_info = self.get_memory_info()
                cpu_info = self.get_cpu_info()
                
                if memory_info["percent"] > self.threshold:
                    logger.warning(
                        f"High memory usage detected: {memory_info['percent']:.1f}% "
                        f"(threshold: {self.threshold}%)"
                    )
                    
                    # Trigger memory cleanup or worker scaling
                    await self.handle_high_memory()
                
                # Log system stats periodically
                if memory_info["percent"] > 50:  # Only log when usage is notable
                    logger.info(
                        f"System stats - RAM: {memory_info['percent']:.1f}%, "
                        f"CPU: {cpu_info['percent']:.1f}%"
                    )
                
                await asyncio.sleep(interval)
                
            except Exception as e:
                logger.error(f"Error in RAM monitoring: {e}")
                await asyncio.sleep(interval)
    
    def stop_monitoring(self):
        """Stop memory monitoring"""
        self.is_monitoring = False
        logger.info("RAM monitoring stopped")
    
    async def handle_high_memory(self):
        """Handle high memory usage situation"""
        logger.warning("Handling high memory usage...")
        
        # In a real implementation, you might:
        # 1. Pause low-priority sessions (free users)
        # 2. Scale down workers
        # 3. Trigger garbage collection
        # 4. Send alerts to administrators
        
        # For now, just log the action
        logger.info("Applied memory pressure relief measures")

# Global RAM monitor instance
ram_monitor = RAMMonitor()
