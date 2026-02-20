# Overview

This is a full-stack MT5 (MetaTrader 5) trading dashboard application that provides real-time trading signal analysis and technical indicators for the XAUUSD (Gold/USD) trading pair. The application features a React-based frontend with a dark trading theme and an Express.js backend that processes technical analysis data. The system includes WebSocket connectivity for real-time updates, comprehensive risk management tools, and signal execution capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is built using **React 18** with TypeScript and follows a modern component-based architecture:
- **UI Framework**: shadcn/ui components built on Radix UI primitives for consistent, accessible design
- **Styling**: Tailwind CSS with custom trading-specific color variables and dark theme
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: WebSocket custom hook for live trading data updates
- **Build Tool**: Vite for fast development and optimized production builds

The frontend uses a responsive layout with desktop sidebar navigation and mobile bottom navigation, featuring specialized trading components for charts, signals, risk management, and signal history.

## Backend Architecture
The server is built with **Express.js** using TypeScript in ESM mode:
- **API Layer**: RESTful endpoints with WebSocket server for real-time data broadcasting
- **Technical Analysis**: MT5Analyzer service that implements technical indicators (EMA, SMA, RSI, MACD, Bollinger Bands, ATR)
- **Storage**: In-memory storage implementation (IStorage interface) for development, designed to be easily replaced with database persistence
- **Real-time Updates**: WebSocket server broadcasts trading signals, technical indicators, and market data to connected clients

## Data Storage Solutions
Currently uses **in-memory storage** with a well-defined interface pattern:
- **Database Schema**: Drizzle ORM schema defines PostgreSQL tables for users, trading signals, technical indicators, and user settings
- **Storage Abstraction**: IStorage interface allows switching between memory and database implementations
- **Migration Ready**: Drizzle configuration set up for PostgreSQL with migration support

The schema includes comprehensive trading entities:
- Trading signals with entry/exit points, risk management parameters
- Technical indicators across multiple timeframes (M15, H1, H4)
- User management and personalized settings

## Authentication and Authorization
Basic user management structure is in place with:
- User authentication schema (username/password)
- User settings for personalized risk parameters
- Session management preparation (using connect-pg-simple for PostgreSQL sessions)

## External Dependencies
- **Neon Database**: PostgreSQL serverless database (@neondatabase/serverless) for production data persistence
- **Drizzle ORM**: Modern TypeScript ORM for database operations and migrations
- **WebSocket**: Real-time bidirectional communication for live trading updates
- **Technical Analysis**: Custom MT5Analyzer service implements financial indicators matching Python MT5 expert advisor logic
- **UI Components**: Comprehensive shadcn/ui component library with Radix UI primitives for professional trading interface

The application is designed with scalability in mind, using TypeScript throughout for type safety, and includes development tools like Replit integration for cloud development environments.