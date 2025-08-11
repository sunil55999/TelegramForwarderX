# AutoForwardX - Telegram Message Forwarding System

## Overview

AutoForwardX is a scalable, multi-worker Telegram message forwarding system designed to handle high-volume message routing with RAM optimization and user priority management. The system features a full-stack architecture with a FastAPI backend, React frontend dashboard, PostgreSQL database, and distributed worker management for efficient Telegram session handling.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built using Vite for development and production builds
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design
- **Styling**: Tailwind CSS with custom design tokens and responsive design patterns
- **State Management**: TanStack Query (React Query) for server state management and data fetching
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: JWT token-based authentication with localStorage persistence

### Backend Architecture
- **API Framework**: FastAPI with Python for high-performance async API endpoints
- **Database ORM**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Session Management**: Telethon library for Telegram API integration and session handling
- **Worker System**: Distributed worker architecture using asyncio for concurrent message processing
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Logging**: Structured logging with colored console output and configurable log levels

### Database Schema
- **Users Table**: User management with roles (free, premium, admin) and account status
- **Telegram Sessions**: Session storage with phone numbers, API credentials, and session data
- **Workers**: Worker process tracking with performance metrics and heartbeat monitoring
- **Forwarding Rules**: Message forwarding configuration with source/destination mappings
- **System Logs**: Application event logging for monitoring and debugging

### Worker Management
- **Load Balancing**: Automatic session distribution across available workers based on resource usage
- **Resource Monitoring**: Real-time RAM and CPU usage tracking with configurable thresholds
- **Crash Recovery**: Automatic worker restart and session reconnection on failures
- **Priority System**: Free users experience delays during high resource usage periods
- **Session Persistence**: Efficient session management to minimize reconnections

### API Structure
- **Authentication Endpoints**: Login/logout with JWT token management
- **Dashboard Endpoints**: System statistics, health metrics, and activity feeds
- **Session Management**: CRUD operations for Telegram sessions with status tracking
- **Worker Management**: Worker creation, monitoring, and configuration
- **User Management**: Admin-only user administration with role management

## External Dependencies

### Database Services
- **PostgreSQL**: Primary database for application data storage
- **Neon Database**: Serverless PostgreSQL provider for cloud deployment
- **Redis**: Caching and inter-process communication (configured but not actively used)

### Telegram Integration
- **Telethon**: Python library for Telegram MTProto API client implementation
- **Telegram Bot API**: Bot integration for user interaction and session management

### Development and Production Tools
- **Vite**: Frontend build tool with hot module replacement for development
- **esbuild**: Backend bundling for production deployment
- **TypeScript**: Type safety across frontend and shared code
- **Drizzle Kit**: Database schema management and migrations

### UI and Styling
- **Radix UI**: Headless UI components for accessibility and customization
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Icon library for consistent iconography
- **PostCSS**: CSS processing with autoprefixer for browser compatibility

### Monitoring and Analytics
- **psutil**: System resource monitoring for RAM and CPU usage
- **Custom RAM Monitor**: Application-specific memory usage tracking and alerting