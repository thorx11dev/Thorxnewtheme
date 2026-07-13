# THORX SYSTEM ARCHITECTURE & MASTER BLUEPRINT (2026)

This document contains the complete, finalized system architecture, mathematical logic, gamification mechanics, and database design for the Thorx Platform.

---

## 1. CORE MECHANICS & THE GAMIFICATION LOOP

### Engine C: The Guild System
*   **Structure:** Users can create or join Guilds (Teams) with a strict Hierarchy: Captain (Owner) and Members.
*   **Rank Progression:** Both Users and Guilds have Tier Ranks from **E (Lowest)** to **S (Highest)**. Ranks are dynamic and progress based on active points generated.
*   **The Strike System:** Inactive Guilds or those with fraudulent members automatically receive "Strikes." 3 Strikes freeze the Guild's reward payouts.

### The "Hold & Release" Escrow Vault System
To motivate team participation without burning platform profits, we use a 15% holding system:
*   **Instant Wallet (85%):** When a user completes an ad/offer, 85% of their earned points instantly go to their main wallet.
*   **Guild Vault (15%):** The remaining 15% is frozen in the Guild Vault.
*   **Weekly Goal Release:** 
    *   **Goal Met:** If the Guild completes its weekly target, the 15% is released to users with a **multiplier boost** (e.g., 1.2x or 1.5x depending on Guild Rank).
    *   **Goal Failed:** If the Guild fails, the frozen 15% points are returned to users flat (no bonus/boost).

### Dynamic 1-Level Referral System
*   **Structure:** User A invites User B.
*   **The Mechanic:** When User B withdraws cash, a **15% standard withdrawal fee** is deducted. A portion of this fee is shared with User A as a lifetime referral bonus.

---

## 2. THE FINANCIAL LEDGER: OPTION A (THE ILLUSION LAYER)

To keep users motivated with high numbers while safeguarding platform margins, Thorx uses a **Double-Entry Real-Time Valuation Ledger**:

### The Math & Illusion Workflow
1.  **Fixed Backend Value:** Advertiser pays a fixed rate. Thorx deducts its platform margin. The remaining absolute cash value (PKR) is locked.
2.  **The Point Conversion:** This cash value is converted to **TX-Points** based on the *current live conversion rate* (e.g., $100 \text{ TX-Points} = \text{Rs. 1.00}$).
3.  **The Scratch Card Illusion:** When a user completes a task, they see a Thorx Scratch Card. Scratching reveals random point breakdowns (e.g., "70 Base + 20 Guild Bonus").
4.  **Absolute Valuation Locking:** Even though points look random or dynamic, **the exact PKR value of those points at that precise millisecond is hard-coded into the database ledger entry.**

### Why This is Bulletproof
*   If the admin changes the point conversion rate later (e.g., to $125 \text{ Pts} = \text{Rs. 1}$), the user's past earnings **do not lose value**.
*   During withdrawal, the system calculates the sum of all `locked_pkr_value` entries, completely bypassing rate fluctuation issues.

---

## 3. DATABASE SCHEMA (POSTGRESQL / SQLITE)

```sql
-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    device_id VARCHAR(255) UNIQUE NOT NULL, -- Device lock prevents multi-accounting
    personal_rank VARCHAR(1) DEFAULT 'E',   -- S, A, B, C, D, E
    personal_score INT DEFAULT 0,
    tx_points_balance INT DEFAULT 0,
    cash_wallet_balance DECIMAL(10,2) DEFAULT 0.00,
    referrer_id INT REFERENCES users(id) ON DELETE SET NULL
);

-- Guilds Table
CREATE TABLE guilds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    captain_id INT REFERENCES users(id) ON DELETE RESTRICT,
    guild_rank VARCHAR(1) DEFAULT 'E',
    guild_score INT DEFAULT 0,
    strikes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guild Membership
CREATE TABLE guild_members (
    id SERIAL PRIMARY KEY,
    guild_id INT REFERENCES guilds(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    UNIQUE(user_id)
);

-- Real-time Valuation Ledger Table
CREATE TABLE points_ledger (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL, -- 'ad_view', 'cpa_offer', 'referral', 'guild_bonus'
    points_displayed INT NOT NULL,     -- The illusion points shown to user
    locked_pkr_value DECIMAL(10,4) NOT NULL, -- The absolute PKR value locked at impact
    conversion_rate_used DECIMAL(10,4) NOT NULL,
    is_converted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
