"""
Logging utilities for AutoForwardX
"""

import logging
import sys
from datetime import datetime

# Create logger
logger = logging.getLogger("autoforwardx")
logger.setLevel(logging.INFO)

# Create console handler with formatting
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO)

# Create formatter
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
console_handler.setFormatter(formatter)

# Add handler to logger
logger.addHandler(console_handler)

def log_info(message: str):
    """Log info message"""
    logger.info(message)

def log_error(message: str):
    """Log error message"""
    logger.error(message)

def log_warning(message: str):
    """Log warning message"""
    logger.warning(message)