# Overview

THORX is a modern full-stack web application that serves as an "earning system" or rewards platform. The application appears to be designed as a landing page with a registration system where users can sign up to earn money through various methods like watching ads, making referrals, and completing daily tasks. The project features a cinematic, industrial-themed user interface with animated sections and real-time statistics.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The client-side is built using **React 18** with **TypeScript** and follows a modern component-based architecture:

- **UI Framework**: Utilizes **shadcn/ui** components built on top of **Radix UI** primitives for accessible, customizable components
- **Styling**: **Tailwind CSS** with custom CSS variables for theming and industrial design elements
- **Routing**: **Wouter** for lightweight client-side routing
- **State Management**: **TanStack Query (React Query)** for server state management and caching
- **Form Handling**: **React Hook Form** with **Zod** schema validation for type-safe form processing
- **Build Tool**: **Vite** for fast development and optimized production builds

The application uses a section-based layout with cinematic transitions, featuring components like `HookSection`, `EarningReveal`, `TrustBuilder`, and `CallToAction` that create an engaging user experience.

## Backend Architecture

The server-side follows a **Node.js/Express** RESTful API pattern:

- **Runtime**: **Node.js** with **TypeScript** and **ES modules**
- **Framework**: **Express.js** for HTTP server and API endpoints
- **API Design**: RESTful endpoints (`/api/register`, `/api/stats`) with JSON responses
- **Validation**: **Zod** schemas shared between client and server for consistent validation
- **Storage**: Currently uses **in-memory storage** via `MemStorage` class, designed with interface pattern for easy database integration

The server includes middleware for request logging, error handling, and development-time Vite integration for hot module replacement.

## Data Storage Solutions

The application is architected for **PostgreSQL** database integration:

- **ORM**: **Drizzle ORM** with PostgreSQL dialect configured
- **Schema**: Defined in `shared/schema.ts` with a `registrations` table containing user phone, email, and referral codes
- **Database Provider**: **Neon Database** (@neondatabase/serverless) for serverless PostgreSQL
- **Migrations**: Drizzle Kit for schema migrations and database management
- **Current State**: Uses temporary in-memory storage with interface-based design for seamless database migration

## Authentication and Authorization Mechanisms

The current implementation focuses on user registration rather than full authentication:

- **Registration System**: Email-based registration with duplicate prevention
- **Referral Codes**: Auto-generated unique referral codes (format: "THORX-XXXX")
- **Session Management**: Basic session setup with `connect-pg-simple` for PostgreSQL session storage
- **Validation**: Server-side input validation using shared Zod schemas

## External Dependencies

- **Database**: Neon Database (serverless PostgreSQL) via `@neondatabase/serverless`
- **UI Components**: Radix UI primitives for accessible component foundation
- **Development**: Replit-specific tooling including error overlay and cartographer plugins
- **Fonts**: Google Fonts integration (Inter, Architects Daughter, DM Sans, etc.)
- **Build Tools**: TypeScript, ESBuild, PostCSS, and Autoprefixer for compilation and optimization

The architecture prioritizes type safety, developer experience, and scalability while maintaining a clean separation between client and server concerns through shared schemas and interfaces.