"""
AutoForwardX Global Constants
"""

# System Constants
MAX_WORKERS = 5
MAX_SESSIONS_PER_WORKER = 10
DEFAULT_RAM_THRESHOLD = 80
FREE_USER_DELAY_SECONDS = 5

# Session Status Constants
SESSION_STATUS = {
    'IDLE': 'idle',
    'ACTIVE': 'active', 
    'CRASHED': 'crashed',
    'STOPPED': 'stopped'
}

# Worker Status Constants
WORKER_STATUS = {
    'ONLINE': 'online',
    'OFFLINE': 'offline',
    'CRASHED': 'crashed'
}

# User Types
USER_TYPES = {
    'FREE': 'free',
    'PREMIUM': 'premium',
    'ADMIN': 'admin'
}

# Log Levels
LOG_LEVELS = {
    'INFO': 'info',
    'WARNING': 'warning',
    'ERROR': 'error'
}

# Database Settings
DB_POOL_MIN_SIZE = 5
DB_POOL_MAX_SIZE = 20
DB_COMMAND_TIMEOUT = 30

# API Settings
JWT_EXPIRE_HOURS = 24
JWT_ALGORITHM = 'HS256'

# Telegram Settings
TELEGRAM_SESSION_TIMEOUT = 300  # 5 minutes
TELEGRAM_MAX_RETRY_ATTEMPTS = 3