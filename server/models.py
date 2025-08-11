from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from enum import Enum

# Enums for status fields
class UserType(str, Enum):
    FREE = "free"
    PREMIUM = "premium"
    ADMIN = "admin"

class SessionStatus(str, Enum):
    IDLE = "idle"
    ACTIVE = "active"
    CRASHED = "crashed"
    STOPPED = "stopped"

class WorkerStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    CRASHED = "crashed"

class LogLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"

# User models
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    user_type: UserType = UserType.FREE

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6)
    user_type: Optional[UserType] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    sessions_count: Optional[int] = 0

class UserLogin(BaseModel):
    username: str
    password: str

class UserLoginResponse(BaseModel):
    user: UserResponse
    token: str

# Telegram Session models
class TelegramSessionBase(BaseModel):
    session_name: str = Field(..., min_length=1, max_length=100)
    phone_number: str = Field(..., regex=r'^\+?[1-9]\d{1,14}$')
    api_id: str
    api_hash: str

class TelegramSessionCreate(TelegramSessionBase):
    pass

class TelegramSessionUpdate(BaseModel):
    session_name: Optional[str] = Field(None, min_length=1, max_length=100)
    status: Optional[SessionStatus] = None
    worker_id: Optional[str] = None
    message_count: Optional[int] = Field(None, ge=0)

class TelegramSessionResponse(TelegramSessionBase):
    id: str
    user_id: str
    status: SessionStatus
    worker_id: Optional[str] = None
    message_count: int
    last_activity: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    user_details: Optional[Dict[str, Any]] = None
    worker_details: Optional[Dict[str, Any]] = None

# Worker models
class WorkerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    config: Optional[Dict[str, Any]] = {}

class WorkerCreate(WorkerBase):
    pass

class WorkerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    status: Optional[WorkerStatus] = None
    cpu_usage: Optional[int] = Field(None, ge=0, le=100)
    memory_usage: Optional[int] = Field(None, ge=0, le=100)
    active_sessions: Optional[int] = Field(None, ge=0)
    messages_per_hour: Optional[int] = Field(None, ge=0)
    config: Optional[Dict[str, Any]] = None

class WorkerResponse(WorkerBase):
    id: str
    status: WorkerStatus
    cpu_usage: int
    memory_usage: int
    active_sessions: int
    messages_per_hour: int
    last_heartbeat: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

# Forwarding Rule models
class ForwardingRuleBase(BaseModel):
    source_chat: str = Field(..., min_length=1)
    target_chat: str = Field(..., min_length=1)
    filters: Optional[Dict[str, Any]] = {}
    is_active: bool = True

class ForwardingRuleCreate(ForwardingRuleBase):
    session_id: str

class ForwardingRuleUpdate(BaseModel):
    source_chat: Optional[str] = Field(None, min_length=1)
    target_chat: Optional[str] = Field(None, min_length=1)
    filters: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class ForwardingRuleResponse(ForwardingRuleBase):
    id: str
    session_id: str
    created_at: datetime
    updated_at: datetime

# System models
class SystemLogCreate(BaseModel):
    level: LogLevel
    message: str = Field(..., min_length=1)
    component: str = Field(..., min_length=1)
    metadata: Optional[Dict[str, Any]] = {}

class SystemLogResponse(SystemLogCreate):
    id: str
    created_at: datetime

class SystemSettingBase(BaseModel):
    key: str = Field(..., min_length=1, max_length=100)
    value: str = Field(..., min_length=1)
    description: Optional[str] = None

class SystemSettingCreate(SystemSettingBase):
    pass

class SystemSettingUpdate(BaseModel):
    value: str = Field(..., min_length=1)
    description: Optional[str] = None

class SystemSettingResponse(SystemSettingBase):
    id: str
    updated_at: datetime

# Dashboard models
class DashboardStats(BaseModel):
    active_sessions: int = Field(..., ge=0)
    active_workers: int = Field(..., ge=0)
    messages_today: int = Field(..., ge=0)
    total_users: int = Field(..., ge=0)

class SystemHealth(BaseModel):
    cpu_usage: int = Field(..., ge=0, le=100)
    memory_usage: int = Field(..., ge=0, le=100)
    db_load: int = Field(..., ge=0, le=100)
    ram_usage: int = Field(..., ge=0, le=100)

class ActivityItem(BaseModel):
    id: str
    type: str  # info, warning, error, success
    message: str
    timestamp: datetime
    component: str

# Telegram specific models
class TelegramCodeVerification(BaseModel):
    session_id: str
    code: str
    password: Optional[str] = None

class TelegramChatInfo(BaseModel):
    id: int
    title: Optional[str] = None
    username: Optional[str] = None
    type: str

class TelegramForwardingConfig(BaseModel):
    session_id: str
    source_chat: str
    target_chat: str
    filters: Optional[Dict[str, Any]] = {}

# Error models
class ErrorResponse(BaseModel):
    message: str
    detail: Optional[str] = None
    errors: Optional[List[Dict[str, Any]]] = None

# Pagination models
class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    limit: int
    pages: int

# API Response models
class SuccessResponse(BaseModel):
    message: str
    data: Optional[Any] = None

# Configuration models
class TelegramBotConfig(BaseModel):
    bot_token: str
    webhook_url: Optional[str] = None
    allowed_users: List[str] = []

class WorkerConfig(BaseModel):
    max_sessions: int = Field(10, ge=1, le=50)
    memory_limit: int = Field(80, ge=50, le=95)
    restart_on_crash: bool = True
    priority_free_users: bool = False

class SystemConfig(BaseModel):
    max_ram_usage: int = Field(80, ge=50, le=95)
    worker_auto_restart: bool = True
    free_user_delay: int = Field(5, ge=0, le=60)
    db_pool_size: int = Field(20, ge=5, le=100)
    query_timeout: int = Field(30, ge=10, le=300)
