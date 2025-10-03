# Overview

THORX is a modern full-stack web application that serves as an "earning system" or rewards platform. The application is designed as a landing page with a registration system where users can sign up to earn money through various methods like watching ads, making referrals, and completing daily tasks. The project features a cinematic, industrial-themed user interface with animated sections and real-time statistics.

## Setup Status (October 3, 2025)

✅ **Completed:**
- PostgreSQL database provisioned and configured via Replit
- Database schema migrated successfully (users, earnings, ad_views, referrals, daily_tasks, team tables, chat_messages)
- All database tables created: registrations, users, earnings, ad_views, referrals, daily_tasks, team_emails, team_keys, user_credentials, chat_messages
- Express backend running on port 5000 with proper host configuration (0.0.0.0)
- React frontend configured with Vite
- Vite dev server configured with `allowedHosts: true` for iframe compatibility
- Session management with PostgreSQL storage
- Development workflow configured with webview output on port 5000
- Deployment configuration set up (autoscale with build and start commands)
- Application successfully running and accessible in Replit environment
- GitHub import successfully configured for Replit (October 3, 2025)
- All dependencies installed and verified working
- Frontend loads correctly with landing page displaying properly
- Database schema pushed successfully using `npm run db:push`
- Application fully functional with cinematic UI and animations
- .gitignore updated with proper exclusions for Node.js, environment files, and build artifacts

⚠️ **Optional Configuration:**
- **Supabase credentials** for full authentication features:
  - `VITE_SUPABASE_URL` - Your Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
  - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (server-side)

The app currently runs with placeholder Supabase values, allowing the landing page to display fully. To enable user authentication and registration with Supabase, add these credentials as secrets in the Replit environment. The app also supports session-based authentication as a fallback.

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

The application uses **PostgreSQL** database with full schema:

- **ORM**: **Drizzle ORM** with PostgreSQL dialect configured
- **Schema**: Comprehensive schema in `shared/schema.ts` with tables for users, earnings, ad views, referrals, daily tasks, team emails, team keys, and user credentials
- **Database Provider**: Replit PostgreSQL database (provisioned)
- **Migrations**: Drizzle Kit for schema migrations (`npm run db:push`)
- **Current State**: Fully migrated and operational with DatabaseStorage implementation

## Authentication and Authorization Mechanisms

The application supports dual authentication systems:

**Supabase Authentication (Primary):**
- Server-side user creation via Supabase Admin API
- JWT-based authentication with bearer tokens
- Client-side authentication via Supabase client
- Role-based access control (user, team, founder)
- Requires Supabase credentials to be configured

**Legacy Session-Based Authentication:**
- Express session management with PostgreSQL storage
- Anonymous login support for preview/demo mode
- Password hashing with bcrypt
- Session cookies with secure settings for iframe compatibility

**Additional Features:**
- Email-based registration with duplicate prevention
- Auto-generated unique referral codes (format: "THORX-XXXX")
- Server-side input validation using shared Zod schemas
- Protected routes with role-based authorization middleware

## External Dependencies

- **Database**: Neon Database (serverless PostgreSQL) via `@neondatabase/serverless`
- **UI Components**: Radix UI primitives for accessible component foundation
- **Development**: Replit-specific tooling including error overlay and cartographer plugins
- **Fonts**: Google Fonts integration (Inter, Architects Daughter, DM Sans, etc.)
- **Build Tools**: TypeScript, ESBuild, PostCSS, and Autoprefixer for compilation and optimization

The architecture prioritizes type safety, developer experience, and scalability while maintaining a clean separation between client and server concerns through shared schemas and interfaces.