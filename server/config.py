import os
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    database_url: str = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/autoforwardx")
    
    # Security
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "your-jwt-secret-change-in-production")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_expire_hours: int = int(os.getenv("JWT_EXPIRE_HOURS", "24"))
    
    # Telegram
    telegram_api_id: Optional[str] = os.getenv("TELEGRAM_API_ID")
    telegram_api_hash: Optional[str] = os.getenv("TELEGRAM_API_HASH")
    telegram_bot_token: Optional[str] = os.getenv("TELEGRAM_BOT_TOKEN")
    
    # Redis
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Application
    debug: bool = os.getenv("DEBUG", "True").lower() == "true"
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    max_workers: int = int(os.getenv("MAX_WORKERS", "5"))
    max_sessions_per_worker: int = int(os.getenv("MAX_SESSIONS_PER_WORKER", "10"))
    ram_threshold: int = int(os.getenv("RAM_THRESHOLD", "80"))
    free_user_delay: int = int(os.getenv("FREE_USER_DELAY", "5"))
    
    # Server
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "5000"))
    backend_port: int = int(os.getenv("BACKEND_PORT", "8000"))

settings = Settings()
