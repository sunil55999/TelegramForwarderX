import asyncio
import logging
from typing import Dict, Optional
from telethon import TelegramClient, events, Button
from telethon.sessions import StringSession
from server.config import settings
from server.database import db
from server.services.telegram_service import telegram_service
from server.services.auth_service import auth_service
from server.utils.logger import logger

class AutoForwardXBot:
    """Telegram bot for AutoForwardX management"""
    
    def __init__(self):
        self.client: Optional[TelegramClient] = None
        self.authorized_users: Dict[int, dict] = {}
        self.pending_auth: Dict[int, dict] = {}
        self.is_running = False
    
    async def start(self):
        """Start the Telegram bot"""
        if not settings.telegram_bot_token:
            logger.warning("Telegram bot token not configured, skipping bot startup")
            return
        
        try:
            # Initialize bot client
            self.client = TelegramClient(
                StringSession(),
                settings.telegram_api_id or "0",
                settings.telegram_api_hash or ""
            )
            
            await self.client.start(bot_token=settings.telegram_bot_token)
            
            # Register event handlers
            self._register_handlers()
            
            self.is_running = True
            logger.info("AutoForwardX bot started successfully")
            
            # Keep the bot running
            await self.client.run_until_disconnected()
            
        except Exception as e:
            logger.error(f"Failed to start bot: {e}")
    
    async def stop(self):
        """Stop the Telegram bot"""
        self.is_running = False
        if self.client:
            await self.client.disconnect()
        logger.info("AutoForwardX bot stopped")
    
    def _register_handlers(self):
        """Register bot event handlers"""
        
        @self.client.on(events.NewMessage(pattern='/start'))
        async def start_handler(event):
            """Handle /start command"""
            user_id = event.sender_id
            user = await event.get_sender()
            
            welcome_text = f"""
🤖 **Welcome to AutoForwardX!**

Hello {user.first_name}! I'm your Telegram forwarding management bot.

📋 **Available Commands:**
/start - Show this welcome message
/auth - Authenticate with your account
/status - Show your sessions status
/addsession - Add a new forwarding session
/sessions - List your sessions
/stop - Stop a session
/help - Show detailed help

🔐 **Getting Started:**
1. Use /auth to link your AutoForwardX account
2. Use /addsession to create forwarding sessions
3. Manage your sessions through the dashboard or bot commands

Need help? Use /help for detailed instructions.
            """
            
            await event.respond(
                welcome_text,
                buttons=[
                    [Button.inline("🔐 Authenticate", "auth")],
                    [Button.inline("📊 Dashboard", "dashboard")],
                    [Button.inline("❓ Help", "help")]
                ]
            )
        
        @self.client.on(events.NewMessage(pattern='/auth'))
        async def auth_handler(event):
            """Handle /auth command"""
            user_id = event.sender_id
            
            if user_id in self.authorized_users:
                user_info = self.authorized_users[user_id]
                await event.respond(
                    f"✅ You're already authenticated as **{user_info['username']}** ({user_info['user_type']})",
                    buttons=[
                        [Button.inline("📊 Dashboard", "dashboard")],
                        [Button.inline("🔧 Sessions", "sessions")]
                    ]
                )
                return
            
            await event.respond(
                "🔐 **Account Authentication**\n\n"
                "Please enter your AutoForwardX username:",
                buttons=[[Button.inline("❌ Cancel", "cancel")]]
            )
            
            self.pending_auth[user_id] = {"step": "username"}
        
        @self.client.on(events.NewMessage(pattern='/status'))
        async def status_handler(event):
            """Handle /status command"""
            user_id = event.sender_id
            
            if user_id not in self.authorized_users:
                await event.respond("❌ Please authenticate first with /auth")
                return
            
            try:
                user_info = self.authorized_users[user_id]
                
                # Get user sessions from database
                async with db.get_connection() as conn:
                    sessions = await conn.fetch(
                        """
                        SELECT ts.*, w.name as worker_name
                        FROM telegram_sessions ts
                        LEFT JOIN workers w ON ts.worker_id = w.id
                        WHERE ts.user_id = $1
                        ORDER BY ts.created_at DESC
                        """,
                        user_info["user_id"]
                    )
                
                if not sessions:
                    await event.respond(
                        "📱 **Session Status**\n\n"
                        "You don't have any sessions yet.\n"
                        "Use /addsession to create your first session!",
                        buttons=[[Button.inline("➕ Add Session", "add_session")]]
                    )
                    return
                
                status_text = "📱 **Your Sessions Status**\n\n"
                
                for session in sessions:
                    status_emoji = {
                        "active": "🟢",
                        "idle": "🟡", 
                        "crashed": "🔴",
                        "stopped": "⚫"
                    }.get(session["status"], "❓")
                    
                    worker_info = f" (Worker: {session['worker_name']})" if session["worker_name"] else ""
                    
                    status_text += f"{status_emoji} **{session['session_name']}**\n"
                    status_text += f"   Status: {session['status'].title()}{worker_info}\n"
                    status_text += f"   Messages: {session['message_count']}\n"
                    status_text += f"   Phone: {session['phone_number']}\n\n"
                
                await event.respond(
                    status_text,
                    buttons=[
                        [Button.inline("🔄 Refresh", "status")],
                        [Button.inline("➕ Add Session", "add_session")],
                        [Button.inline("📊 Dashboard", "dashboard")]
                    ]
                )
                
            except Exception as e:
                logger.error(f"Error in status handler: {e}")
                await event.respond("❌ Error fetching session status. Please try again.")
        
        @self.client.on(events.NewMessage(pattern='/addsession'))
        async def add_session_handler(event):
            """Handle /addsession command"""
            user_id = event.sender_id
            
            if user_id not in self.authorized_users:
                await event.respond("❌ Please authenticate first with /auth")
                return
            
            await event.respond(
                "📱 **Add New Session**\n\n"
                "To add a new Telegram session, please use the web dashboard for security.\n\n"
                "The dashboard provides a secure way to enter your API credentials and phone number.\n\n"
                "🌐 Access your dashboard at: [AutoForwardX Dashboard](https://your-domain.com/dashboard)",
                buttons=[
                    [Button.url("🌐 Open Dashboard", "https://your-domain.com/dashboard")],
                    [Button.inline("📋 Instructions", "session_help")]
                ]
            )
        
        @self.client.on(events.NewMessage(pattern='/sessions'))
        async def sessions_handler(event):
            """Handle /sessions command - same as /status"""
            await status_handler(event)
        
        @self.client.on(events.NewMessage(pattern='/stop'))
        async def stop_session_handler(event):
            """Handle /stop command"""
            user_id = event.sender_id
            
            if user_id not in self.authorized_users:
                await event.respond("❌ Please authenticate first with /auth")
                return
            
            # Get user's active sessions
            try:
                user_info = self.authorized_users[user_id]
                
                async with db.get_connection() as conn:
                    active_sessions = await conn.fetch(
                        "SELECT id, session_name FROM telegram_sessions WHERE user_id = $1 AND status = 'active'",
                        user_info["user_id"]
                    )
                
                if not active_sessions:
                    await event.respond("ℹ️ You don't have any active sessions to stop.")
                    return
                
                # Create buttons for each active session
                buttons = []
                for session in active_sessions[:10]:  # Limit to 10 sessions
                    buttons.append([Button.inline(
                        f"⏹️ {session['session_name']}", 
                        f"stop_session_{session['id']}"
                    )])
                
                buttons.append([Button.inline("❌ Cancel", "cancel")])
                
                await event.respond(
                    "⏹️ **Stop Session**\n\n"
                    "Select a session to stop:",
                    buttons=buttons
                )
                
            except Exception as e:
                logger.error(f"Error in stop handler: {e}")
                await event.respond("❌ Error fetching sessions. Please try again.")
        
        @self.client.on(events.NewMessage(pattern='/help'))
        async def help_handler(event):
            """Handle /help command"""
            help_text = """
📖 **AutoForwardX Bot Help**

**Authentication:**
/auth - Link your AutoForwardX account with this bot

**Session Management:**
/status - View all your session status
/sessions - Same as /status
/addsession - Get instructions to add a new session
/stop - Stop an active session

**Information:**
/start - Show welcome message
/help - Show this help message

**Dashboard Features:**
• Complete session management
• Real-time monitoring
• Worker status
• User management (admin)
• System settings

**How to Get Started:**
1. Create an account on the AutoForwardX dashboard
2. Use /auth to link your account with this bot
3. Add sessions through the web dashboard
4. Monitor and control via bot or dashboard

**Support:**
If you need help, contact your system administrator.
            """
            
            await event.respond(
                help_text,
                buttons=[
                    [Button.url("🌐 Dashboard", "https://your-domain.com")],
                    [Button.inline("🔐 Authenticate", "auth")]
                ]
            )
        
        @self.client.on(events.CallbackQuery)
        async def callback_handler(event):
            """Handle callback queries from inline buttons"""
            data = event.data.decode('utf-8')
            user_id = event.sender_id
            
            if data == "auth":
                await auth_handler(event)
            elif data == "dashboard":
                await event.answer("Opening dashboard...")
                await event.respond(
                    "🌐 **Dashboard Access**\n\n"
                    "Access your AutoForwardX dashboard:",
                    buttons=[[Button.url("🌐 Open Dashboard", "https://your-domain.com/dashboard")]]
                )
            elif data == "status":
                await status_handler(event)
            elif data == "sessions":
                await status_handler(event)
            elif data == "add_session":
                await add_session_handler(event)
            elif data == "help":
                await help_handler(event)
            elif data == "cancel":
                if user_id in self.pending_auth:
                    del self.pending_auth[user_id]
                await event.edit("❌ Operation cancelled.")
            elif data.startswith("stop_session_"):
                session_id = data.replace("stop_session_", "")
                await self._handle_stop_session(event, session_id)
            elif data == "session_help":
                await event.answer()
                await event.respond(
                    "📱 **Session Setup Instructions**\n\n"
                    "1. Go to https://my.telegram.org\n"
                    "2. Log in and create a new app\n"
                    "3. Get your API ID and API Hash\n"
                    "4. Use the dashboard to add your session\n\n"
                    "⚠️ Never share your API credentials!"
                )
        
        @self.client.on(events.NewMessage)
        async def message_handler(event):
            """Handle regular messages (for authentication flow)"""
            user_id = event.sender_id
            
            if user_id not in self.pending_auth:
                return
            
            auth_data = self.pending_auth[user_id]
            message_text = event.message.text.strip()
            
            try:
                if auth_data["step"] == "username":
                    # Verify username exists
                    user_data = await auth_service.get_user_by_username(message_text)
                    if not user_data:
                        await event.respond("❌ Username not found. Please enter a valid username or /cancel:")
                        return
                    
                    auth_data["username"] = message_text
                    auth_data["user_data"] = user_data
                    auth_data["step"] = "password"
                    
                    await event.respond("🔑 Please enter your password:")
                
                elif auth_data["step"] == "password":
                    # Verify password
                    username = auth_data["username"]
                    user_data = await auth_service.authenticate_user(username, message_text)
                    
                    if not user_data:
                        await event.respond("❌ Invalid password. Please try again or /cancel:")
                        return
                    
                    # Authentication successful
                    self.authorized_users[user_id] = {
                        "user_id": user_data["id"],
                        "username": user_data["username"],
                        "user_type": user_data["user_type"]
                    }
                    
                    del self.pending_auth[user_id]
                    
                    await event.respond(
                        f"✅ **Authentication Successful!**\n\n"
                        f"Welcome, **{user_data['username']}**!\n"
                        f"Account type: {user_data['user_type'].title()}\n\n"
                        f"You can now use all bot features.",
                        buttons=[
                            [Button.inline("📊 Dashboard", "dashboard")],
                            [Button.inline("📱 Sessions", "status")],
                            [Button.inline("➕ Add Session", "add_session")]
                        ]
                    )
                    
                    # Log successful authentication
                    await auth_service.log_user_activity(
                        user_data["id"], 
                        "bot_authentication",
                        {"telegram_user_id": user_id}
                    )
                
            except Exception as e:
                logger.error(f"Error in authentication flow: {e}")
                await event.respond("❌ Authentication error. Please try /auth again.")
                if user_id in self.pending_auth:
                    del self.pending_auth[user_id]
    
    async def _handle_stop_session(self, event, session_id: str):
        """Handle stopping a session"""
        try:
            user_id = event.sender_id
            user_info = self.authorized_users[user_id]
            
            # Verify session belongs to user
            async with db.get_connection() as conn:
                session = await conn.fetchrow(
                    "SELECT session_name FROM telegram_sessions WHERE id = $1 AND user_id = $2",
                    session_id, user_info["user_id"]
                )
                
                if not session:
                    await event.answer("❌ Session not found or access denied.")
                    return
                
                # Stop the session
                await conn.execute(
                    "UPDATE telegram_sessions SET status = 'stopped', worker_id = NULL WHERE id = $1",
                    session_id
                )
            
            # Disconnect from telegram service
            await telegram_service.disconnect_session(session_id)
            
            await event.edit(f"✅ Session **{session['session_name']}** stopped successfully.")
            
        except Exception as e:
            logger.error(f"Error stopping session: {e}")
            await event.answer("❌ Error stopping session.")
    
    async def send_notification(self, user_id: str, message: str, buttons=None):
        """Send notification to a user"""
        try:
            # Find telegram user ID for the user
            telegram_user_id = None
            for tg_id, user_info in self.authorized_users.items():
                if user_info["user_id"] == user_id:
                    telegram_user_id = tg_id
                    break
            
            if telegram_user_id and self.client:
                await self.client.send_message(
                    telegram_user_id, 
                    message, 
                    buttons=buttons
                )
                
        except Exception as e:
            logger.error(f"Failed to send notification: {e}")
    
    async def broadcast_message(self, message: str, user_type: Optional[str] = None):
        """Broadcast message to all authorized users or specific user type"""
        try:
            for telegram_user_id, user_info in self.authorized_users.items():
                if user_type is None or user_info["user_type"] == user_type:
                    try:
                        await self.client.send_message(telegram_user_id, message)
                    except Exception as e:
                        logger.error(f"Failed to send broadcast to {telegram_user_id}: {e}")
                        
        except Exception as e:
            logger.error(f"Error in broadcast: {e}")

# Global bot instance
bot = AutoForwardXBot()

async def start_telegram_bot():
    """Start the telegram bot service"""
    await bot.start()

async def stop_telegram_bot():
    """Stop the telegram bot service"""
    await bot.stop()
