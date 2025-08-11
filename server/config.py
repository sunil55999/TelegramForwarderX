"""
Configuration settings for AutoForwardX
"""

import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    database_url: str = os.getenv("DATABASE_URL", "postgresql://localhost:5432/autoforwardx")
    
    # Security
    secret_key: str = os.getenv("SECRET_KEY", "autoforwardx-dev-secret-key-change-in-production")
    access_token_expire_minutes: int = 30
    
    # Development
    debug: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    class Config:
        env_file = ".env"

settings = Settings()