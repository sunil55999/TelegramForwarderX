"""
Environment configuration loader with validation
"""

import os
from typing import Optional, Dict, Any
from server.utils.logger import logger

class EnvLoader:
    """Load and validate environment variables"""
    
    def __init__(self):
        self.required_vars: Dict[str, str] = {}
        self.optional_vars: Dict[str, str] = {}
        self._load_env_file()
    
    def _load_env_file(self):
        """Load .env file if it exists"""
        env_file = '.env'
        if os.path.exists(env_file):
            try:
                with open(env_file, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            key, value = line.split('=', 1)
                            os.environ[key] = value
                logger.info("Environment variables loaded from .env file")
            except Exception as e:
                logger.error(f"Error loading .env file: {e}")
    
    def require(self, var_name: str, description: str = "") -> str:
        """Mark a variable as required"""
        self.required_vars[var_name] = description
        return self.get(var_name)
    
    def optional(self, var_name: str, default: str = "", description: str = "") -> str:
        """Get optional variable with default"""
        self.optional_vars[var_name] = description
        return os.getenv(var_name, default)
    
    def get(self, var_name: str, default: Optional[str] = None) -> str:
        """Get environment variable"""
        value = os.getenv(var_name, default)
        if value is None:
            raise ValueError(f"Required environment variable {var_name} is not set")
        return value
    
    def validate(self) -> bool:
        """Validate all required variables are present"""
        missing = []
        for var_name in self.required_vars:
            if not os.getenv(var_name):
                missing.append(var_name)
        
        if missing:
            logger.error(f"Missing required environment variables: {', '.join(missing)}")
            return False
        
        logger.info("All required environment variables are present")
        return True
    
    def get_config_summary(self) -> Dict[str, Any]:
        """Get summary of current configuration"""
        return {
            'required_vars': list(self.required_vars.keys()),
            'optional_vars': list(self.optional_vars.keys()),
            'missing_required': [var for var in self.required_vars if not os.getenv(var)]
        }

# Global instance
env_loader = EnvLoader()