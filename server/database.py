"""
Database connection and utilities
"""

import os
import asyncpg
from typing import List, Dict, Any, Optional

class Database:
    def __init__(self):
        self.pool = None
    
    async def connect(self):
        """Connect to the database"""
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            self.pool = await asyncpg.create_pool(database_url)
        else:
            # For development without real database
            print("No DATABASE_URL found, using mock database")
    
    async def disconnect(self):
        """Disconnect from the database"""
        if self.pool:
            await self.pool.close()
    
    async def fetch_all(self, query: str, params: List = None) -> List[Dict[str, Any]]:
        """Fetch all results from a query"""
        if not self.pool:
            # Mock response for development
            return []
        
        async with self.pool.acquire() as conn:
            if params:
                rows = await conn.fetch(query, *params)
            else:
                rows = await conn.fetch(query)
            return [dict(row) for row in rows]
    
    async def fetch_one(self, query: str, params: List = None) -> Optional[Dict[str, Any]]:
        """Fetch one result from a query"""
        if not self.pool:
            # Mock response for development
            return None
        
        async with self.pool.acquire() as conn:
            if params:
                row = await conn.fetchrow(query, *params)
            else:
                row = await conn.fetchrow(query)
            return dict(row) if row else None
    
    async def execute(self, query: str, params: List = None) -> str:
        """Execute a query and return status"""
        if not self.pool:
            # Mock response for development
            return "MOCK_EXECUTE"
        
        async with self.pool.acquire() as conn:
            if params:
                return await conn.execute(query, *params)
            else:
                return await conn.execute(query)

# Global database instance
db = Database()

async def init_database():
    """Initialize database connection"""
    await db.connect()