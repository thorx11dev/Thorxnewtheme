# PLAN: Leaderboard & Insights Protocol

**Target**: `docs/PLAN-leaderboard-insights.md`

## 1. Context & Goal
A "Visual Command Center" approach intersecting with an AI-triage module to give admins rapid macro-economic insights around top platform earners, master network recruiters (L1 volume), and algorithmic anomalies ("Whale vs Fraud" differentiation).

---

## 2. Technical Requirements

### Backend Engineering (Data Aggregation Layer)
To prevent severe frontend waterfalls, all insights rely on a single compiled endpoint.

`GET /api/admin/leaderboard/insights`
The backend resolver will generate a composite JSON mapping:

1. **Top Earners (Whale Metric)**
   - Query: `db.select().from(users).orderBy(desc(users.totalEarnings)).limit(50)`
2. **Network Leaders (Influencer Metric)**
   - Query: Grouped aggregation resolving top `referredBy` tags bound to active L1 registrations.
3. **Risk Profile AI Calculation (Fraud Metric)**
   - Heuristics: Users falling into extremely disproportionate `earnings/age` trajectories or 100% CPA completions without Ad-View engagements.

### Frontend Engineering (UI/UX Pro Max Principles)
**Target:** `client/src/components/admin/LeaderboardInsights.tsx`

Strict aesthetics mapped from `@ui-ux-pro-max`:
- **Shapes**: `border-[1.5px] border-[#111] rounded-[2rem]`
- **Icons**: SVG-based only via `lucide-react` (No emojis)
- **Typographic Hierarchy**: `font-black text-4xl uppercase tracking-tighter` headers over `text-[10px] tracking-widest text-[#111]/50` technical labels.
- **Charts Component**: Utilization of `<ResponsiveContainer>` enveloping `Recharts` composites. Implementing a Scatter Chart mapping `Days Active` against `Total Earned (PKR)`. High clusters forming vertically against 0 Days indicates targeted exploitation networks.

---

## 3. Execution Checklist 

- [ ] Modify `server/storage.ts` logic to encompass new analytic methods mapping the aggregates.
- [ ] Create strict API route `GET /api/admin/leaderboard/insights`.
- [ ] Spin up `LeaderboardInsights.tsx` integrating `useQuery` targeting the new data stream.
- [ ] Paint the layout into the required three zones: KPI Ticker, The Plot/Chart visualizer, and the Anomaly Hitlist.
- [ ] Extend `AdminSidebar.tsx` connecting the new view routing.

---

**Agents Designated**:
- **frontend-specialist**: For translating the charts into the sleek brutalism/glass interface.
- **backend-specialist**: For executing the heavy SQL `groupBy` and aggregate logic cleanly.
- **orchestrator**: Final system test tying visual data to mock responses.
