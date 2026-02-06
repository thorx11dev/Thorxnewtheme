# Overview

THORX is a modern full-stack web application that serves as an "earning system" or rewards platform. The application is designed as a landing page with a registration system where users can sign up to earn money through various methods like watching ads, making referrals, and completing daily tasks. The project features a cinematic, industrial-themed user interface with animated sections and real-time statistics.

## 🤖 Automated Setup for New Accounts

This project is configured for **automatic setup** when imported to new Replit accounts!

### What's Automated:
- ✅ Dependency installation
- ✅ Database migration (when DATABASE_URL exists)
- ✅ Table creation
- ✅ Session secret generation (temporary)

### Required Manual Steps (One-time):
1. **Provision PostgreSQL Database** (Tools → Database → Create)
2. **Set SESSION_SECRET** (Tools → Secrets → Add `SESSION_SECRET`)
3. **Click Run** button

See [SETUP_NEW_ACCOUNT.md](SETUP_NEW_ACCOUNT.md) for detailed instructions.

---

## Setup Status (October 3, 2025)

✅ **Completed:**
- **GitHub Import Completed Successfully** (October 3, 2025)
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
- All dependencies installed and verified working
- Frontend loads correctly with landing page displaying properly
- Database schema pushed successfully using `npm run db:push`
- Application fully functional with cinematic UI and animations
- .gitignore updated with proper exclusions for Node.js, environment files, and build artifacts
- CSS syntax errors fixed (missing closing brace in index.css)
- All workflows running correctly with no errors
- **Video Ad Networks Research Completed** (October 11, 2025) - Comprehensive integration guide for top 4 networks (Adsterra, Google Ad Manager, PropellerAds, Media.net) with Pakistan support
- **CORS Authentication Fix** (November 1, 2025) - Resolved CORS blocking issue by adding 127.0.0.1:5000 variants to allowed origins for proper session establishment in Replit iframe environment
- **Performance Optimizations** (December 15, 2025) - Major performance improvements implemented:
  - React.lazy code splitting for all pages (Home, Auth, UserPortal, TeamPortal, HilltopAdsAdmin)
  - Vite manualChunks configuration for vendor splitting (react, react-dom, tanstack-query, recharts, radix-ui)
  - Initial bundle reduced to ~52KB (gzipped ~18KB)
  - Recharts (410KB) loads on-demand only when UserPortal is accessed
  - React.memo applied to frequently re-rendered components
- **Advanced AI Chatbot System** (December 17, 2025) - Production-grade chatbot fully independent of external AI APIs:
  - **NLP Utilities** (`server/chatbot/nlp-utils.ts`): TF-IDF vectorization, cosine similarity, fuzzy matching (Levenshtein/Damerau-Levenshtein), N-gram similarity, sentiment analysis, bilingual text processing
  - **Advanced Chatbot Service** (`server/chatbot/advanced-chatbot-service.ts`): Hybrid intent detection using exact matching, fuzzy matching, N-gram similarity, and TF-IDF semantic similarity with conversation memory and context tracking
  - **Expanded Knowledge Base** (`server/chatbot/knowledge-base.json`): 21 intents with 409 patterns covering all platform features in English and Urdu
  - Features: Human-like response generation, security boundaries for sensitive topics, sentiment analysis, suggested actions, escalation detection, conversation memory

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

## Video Ad Monetization Research (October 11, 2025)

Comprehensive research completed on top 4 video ad networks suitable for THORX platform:

**Deliverables Location:**
- `VIDEO_AD_NETWORKS_INTEGRATION_GUIDE.md` - Complete 10,000+ word integration guide
- `video_ad_networks_export.json` - Machine-readable data export
- `integrations/` - Ready-to-use code examples (Adsterra, Google IMA SDK)
- `README_VIDEO_ADS.md` - Quick start guide

**Top 4 Networks Identified:**
1. **Adsterra** (Rank #1) - $5 minimum payout, NET-15 payments, instant approval, excellent Pakistan support
2. **Google Ad Manager with IMA SDK** (Rank #2) - Premium demand, enterprise-grade SDKs, brand-safe
3. **PropellerAds** (Rank #3) - $5 minimum, NET-7 fastest payments, crypto options
4. **Media.net** (Rank #4) - Yahoo/Bing demand, contextual targeting, family-friendly

**Key Findings:**
- All 4 networks support Pakistan traffic and payouts
- Adsterra recommended as primary network for quick deployment
- Estimated monthly revenue: $550-$1,250 (100K video views, 50% Pakistan/50% Tier 1 split)
- Complete integration code provided for Node.js/Express backend
- Family-friendly content filtering available on all recommended networks

**Implementation Status:**
- Research and documentation: ✅ Complete
- Integration code examples: ✅ Provided
- Next step: Sign up for Adsterra account and deploy integration to THORX platform