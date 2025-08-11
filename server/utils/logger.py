import logging
import sys
from datetime import datetime
from server.config import settings

class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors for different log levels"""
    
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
    }
    RESET = '\033[0m'
    
    def format(self, record):
        # Add color to level name
        if record.levelname in self.COLORS:
            record.levelname = f"{self.COLORS[record.levelname]}{record.levelname}{self.RESET}"
        
        # Format timestamp
        record.asctime = datetime.now().strftime("%H:%M:%S")
        
        return super().format(record)

def setup_logging():
    """Setup application logging"""
    
    # Create logger
    logger = logging.getLogger("autoforwardx")
    logger.setLevel(getattr(logging, settings.log_level.upper()))
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, settings.log_level.upper()))
    
    # Create formatter
    if settings.debug:
        formatter = ColoredFormatter(
            '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
        )
    else:
        formatter = logging.Formatter(
            '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # Prevent duplicate logs
    logger.propagate = False
    
    return logger

# Global logger instance
logger = setup_logging()

def log_system_event(level: str, message: str, component: str, metadata: dict = None):
    """Log system event with metadata"""
    logger.log(getattr(logging, level.upper()), f"[{component}] {message}")
    
    # In a real application, you would also save this to the database
    # via the storage interface
