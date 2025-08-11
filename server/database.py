import asyncio
import asyncpg
from contextlib import asynccontextmanager
from typing import Optional
from server.config import settings
from server.utils.logger import logger

class Database:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
    
    async def init_pool(self):
        """Initialize database connection pool"""
        try:
            self.pool = await asyncpg.create_pool(
                settings.database_url,
                min_size=5,
                max_size=20,
                command_timeout=30
            )
            logger.info("Database connection pool created")
        except Exception as e:
            logger.error(f"Failed to create database pool: {e}")
            raise
    
    async def close_pool(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")
    
    @asynccontextmanager
    async def get_connection(self):
        """Get database connection from pool"""
        if not self.pool:
            raise RuntimeError("Database pool not initialized")
        
        async with self.pool.acquire() as connection:
            yield connection

# Global database instance
db = Database()

async def init_database():
    """Initialize database and create tables"""
    await db.init_pool()
    await create_tables()

async def create_tables():
    """Create database tables"""
    create_tables_sql = """
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        user_type TEXT NOT NULL DEFAULT 'free',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
    );

    -- Telegram sessions table
    CREATE TABLE IF NOT EXISTS telegram_sessions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_name TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        api_id TEXT NOT NULL,
        api_hash TEXT NOT NULL,
        session_data TEXT,
        status TEXT NOT NULL DEFAULT 'idle',
        worker_id VARCHAR,
        message_count INTEGER NOT NULL DEFAULT 0,
        last_activity TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
    );

    -- Workers table
    CREATE TABLE IF NOT EXISTS workers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'offline',
        cpu_usage INTEGER NOT NULL DEFAULT 0,
        memory_usage INTEGER NOT NULL DEFAULT 0,
        active_sessions INTEGER NOT NULL DEFAULT 0,
        messages_per_hour INTEGER NOT NULL DEFAULT 0,
        last_heartbeat TIMESTAMP,
        config JSONB DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
    );

    -- Forwarding rules table
    CREATE TABLE IF NOT EXISTS forwarding_rules (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR NOT NULL REFERENCES telegram_sessions(id) ON DELETE CASCADE,
        source_chat TEXT NOT NULL,
        target_chat TEXT NOT NULL,
        filters JSONB DEFAULT '{}',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
    );

    -- System logs table
    CREATE TABLE IF NOT EXISTS system_logs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        component TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT now()
    );

    -- System settings table
    CREATE TABLE IF NOT EXISTS system_settings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP NOT NULL DEFAULT now()
    );

    -- Add foreign key constraint for workers
    ALTER TABLE telegram_sessions 
    ADD CONSTRAINT fk_worker 
    FOREIGN KEY (worker_id) REFERENCES workers(id);

    -- Insert default admin user
    INSERT INTO users (username, email, password, user_type)
    VALUES ('admin', 'admin@autoforwardx.com', '$2b$10$hash', 'admin')
    ON CONFLICT (username) DO NOTHING;

    -- Insert default workers
    INSERT INTO workers (name, status, cpu_usage, memory_usage, active_sessions, messages_per_hour, last_heartbeat)
    VALUES 
        ('Worker #1', 'online', 42, 65, 5, 2341, now()),
        ('Worker #2', 'online', 38, 72, 4, 1876, now()),
        ('Worker #3', 'offline', 0, 0, 0, 0, null)
    ON CONFLICT DO NOTHING;

    -- Insert default settings
    INSERT INTO system_settings (key, value, description)
    VALUES 
        ('max_ram_usage', '80', 'Maximum RAM usage percentage'),
        ('worker_auto_restart', 'true', 'Enable automatic worker restart'),
        ('free_user_delay', '5', 'Free user priority delay in seconds'),
        ('db_pool_size', '20', 'Database connection pool size'),
        ('query_timeout', '30', 'Query timeout in seconds')
    ON CONFLICT (key) DO NOTHING;
    """

    async with db.get_connection() as conn:
        try:
            await conn.execute(create_tables_sql)
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Failed to create tables: {e}")
            raise
