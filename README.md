# ⚡ WattWise — Smarter Energy. Lower Bills.

> **Production-Quality Full-Stack Energy Management SaaS for Apartment Societies & Resident Welfare Associations (RWAs)**

WattWise is an energy-management SaaS platform designed specifically for apartment societies, Resident Welfare Associations (RWAs), and gated communities. Its primary focus is **common-area electricity intelligence** — auditing and reducing the power consumed by water pumps, common lighting, elevators, clubhouses, swimming pools, parking basements, and sewage treatment facilities.

WattWise operates as a dedicated **energy intelligence layer**, partnering with rather than attempting to replace existing society accounting and security applications.

---

## 🌟 Core Product Capabilities

- **Public Marketing Website**: Responsive, sticky navigation, value proposition, "The Problem" common-area breakdown, transparent prototype pricing, and a live pilot lead capture modal.
- **Role-Based Authentication & Access Control**:
  - **WattWise Platform Admin**: Internal company portal for monitoring platform ARR, society onboarding, and triaging inbound pilot leads (`/admin`).
  - **Society Admin (RWA President)**: Full administrative authority over meters, bills, users, settings, and subscription.
  - **Committee Member (Treasurer / Facility Manager)**: Operational rights to view analytics, log conservation actions, view savings, and generate monthly AGM reports.
  - **Resident**: Safe, read-only transparency into society-level energy consumption and conservation tips.
- **4-Step Society Onboarding**:
  1. Society Administrator Account
  2. Society Profile (Apartments, Buildings, Floors, City)
  3. Common Facilities Checklist (Pumps, Lighting, Elevators, Pool, Gym, STP)
  4. First Bill Ingestion with visual progress counter (`Society Setup 75% complete`)
- **Interactive SaaS Energy Dashboard**:
  - KPI Stat Cards: Monthly Consumption (18,420 kWh), Monthly Bill (₹1,42,380), Consumption Change (↓ 4.1%), Potential Savings (₹8,420 labeled *Estimated / Potential*).
  - 6–12 Month Consumption Trend Line/Area Chart.
  - Monthly Electricity Cost Bar Chart.
  - Sub-meter Common Area Breakdown (with graceful empty states if sub-meters are missing).
  - WattWise Internal Energy Score (0–100) evaluating trend, data completeness, savings progress, and efficiency (*Not an official certification*).
  - Structured AI Insight Preview card.
- **Bill Management & Ingestion**:
  - **PDF OCR Extraction & Human Verification Screen**: Uploaded utility invoices extract period, meter number, units, bill amount, fixed charges, and energy charges into an interactive confirmation dialog. Values never auto-commit without explicit admin approval.
  - **CSV / Spreadsheet Import Wizard**: Intelligent column mapping wizard with sample preview, error detection, and batch insertion.
  - **Manual Bill Entry**: Complete form with strict numerical and date validation.
  - **Searchable, Paginated Bill History**: Filter by meter, search by cycle, and inspect verified invoices.
- **AI-Powered Insights (Gemini API Integration)**:
  - Answers four key questions: *What changed?*, *What trends are visible?*, *What should the RWA investigate?*, *What practical actions could be considered?*
  - Strict compliance guardrails: Uses cautious language (*"May indicate"*, *"Possible cause"*, *"Consider checking"*, *"Based on available data"*).
  - Built-in fallback reasoning engine ensuring 100% availability even when offline or without an API key.
- **Recommendations & Action Tracking**:
  - Prioritized action items (High, Medium, Low) with potential rupee savings estimates.
  - **Action Impact Logger**: Facility managers log maintenance events with before and after kWh values.
  - Enforces mandatory causality caveat: *"Consumption decreased after the recorded action. Other factors may also have contributed."*
- **Savings Module**:
  - Strict differentiation between **Active Potential Savings** vs. **Total Measured / Recorded Savings**.
  - Historical monthly comparison bar chart.
- **Executive Monthly Reports**:
  - Compile branded, high-density AGM summaries featuring KPI tables, AI analysis, top power consumers, completed actions, and upcoming recommendations.
  - Ready for 1-click browser printing (`window.print()`) or export to PDF.
- **In-App Notification Center**:
  - Real-time notification badge with unread counters for new bill verifications, AI insights, and AGM report availability.
- **3-Month Free Pilot & Prototype Subscription Model**:
  - Active pilot countdown with zero setup fees.
  - Transparent prototype pricing: Basic (₹1,999/yr), Pro (₹4,999/yr), Enterprise (Custom).

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Recharts |
| **Backend** | Node.js (v26), Express, TypeScript, Multer, JWT, Bcrypt |
| **Database** | Embedded Relational SQLite (native `node:sqlite` with WAL mode & foreign keys) + PostgreSQL/Supabase compatibility schema |
| **AI** | Google Gemini API (structured JSON schema mode) + Heuristic Fallback Engine |
| **Build Tools** | Vite, tsx, npm workspaces |

---

## 📁 Project Structure

```
watt-wise/
├── package.json              # Monorepo root managing client and server scripts
├── .env.example              # Environment variables template
├── README.md                 # Product documentation
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts          # Express server entry point & static file hosting
│   │   ├── config/           # Environment configuration
│   │   ├── database/
│   │   │   ├── schema.sql    # 12-table relational schema with indexes & foreign keys
│   │   │   ├── db.ts         # node:sqlite relational connector with transactions
│   │   │   └── seed.ts       # Seeds "Green Valley Residency" demo dataset
│   │   ├── middleware/
│   │   │   └── auth.ts       # JWT authentication & society data isolation guard
│   │   ├── routes/           # REST API endpoints (auth, bills, analytics, ai, etc.)
│   │   ├── services/         # Deterministic analytics, AI engine, and bill parser
│   │   ├── scripts/          # Automated end-to-end test suite
│   │   └── types/            # TypeScript interfaces
│   └── uploads/              # Isolated local document storage
└── client/
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── App.tsx           # Router, route guards, and global providers
        ├── index.css         # Modern design system & print stylesheet
        ├── api/client.ts     # HTTP API client with auth token injection
        ├── context/          # AuthContext & NotificationContext
        ├── components/
        │   ├── common/       # StatCard, Badge, Button, Modal, EmptyState, SkeletonLoader
        │   ├── layout/       # PublicNavbar, Sidebar, Header, DashboardLayout
        │   ├── charts/       # ConsumptionTrendChart, CostChart, CategoryBreakdownChart
        │   ├── bill/         # VerificationModal, CsvMappingWizard, ManualBillModal
        │   └── public/       # PilotModal lead form
        ├── pages/
        │   ├── public/       # Home, HowItWorks, Features, ForRWAs, Pricing, About, Contact
        │   ├── auth/         # Login, Signup (4-step wizard), ForgotPassword
        │   ├── dashboard/    # Energy Dashboard
        │   ├── energy/       # Energy Intelligence & Sub-meter Module
        │   ├── bills/        # Bill Ledger & Verification
        │   ├── meters/       # Meter Panels
        │   ├── insights/     # AI Consumption Intelligence
        │   ├── recommendations/ # Recommendations & Action Tracking
        │   ├── savings/      # Savings Tracking
        │   ├── reports/      # Monthly AGM Reports
        │   ├── society/      # Society Parameters
        │   ├── users/        # User Access Control
        │   ├── settings/     # Personal Settings
        │   ├── subscription/ # Pilot Countdown & Tier Pricing
        │   └── admin/        # Platform Admin Leads & Metrics
        └── types/            # Frontend interfaces
```

---

## 🚀 Running Locally

### Prerequisites
- Node.js v22+ (tested on Node v26)
- npm v10+

### 1. Clone or Open the Workspace
```bash
cd "watt wise"
```

### 2. Install Dependencies
```bash
npm run install:all
```
*(Or individually in `server` and `client`)*

### 3. Configure Environment Variables
Copy `.env.example` to `server/.env`:
```bash
cp .env.example server/.env
```
*(Optional: Add your `GEMINI_API_KEY`. If omitted, the application uses its built-in heuristic intelligence engine).*

### 4. Seed the Database
```bash
npm run seed --workspace=server
```
*This populates "Green Valley Residency" (Bengaluru, 240 units) with 6 months of historical bills, sub-meters, recommendations, and test user personas.*

### 5. Launch Application
```bash
npm run dev
```
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

---

## 🔑 Demo Account Personas

You can log in manually using the credentials below, or click any of the **1-Click Demo Persona buttons** directly on the Login page (`/login`) or from the Header role dropdown:

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Society Admin** | `president@greenvalley.com` | `admin123` | Full access to Green Valley Residency |
| **Committee Member** | `treasurer@greenvalley.com` | `member123` | Read & Action logging, Reports, Savings |
| **Resident** | `resident@greenvalley.com` | `resident123` | Read-only society energy overview |
| **Platform Admin** | `admin@wattwise.com` | `admin123` | WattWise internal operations (`/admin`) |

---

## 🧪 Automated Verification Suite

Run the full end-to-end integration test suite:
```bash
npx tsx server/src/scripts/test_e2e.ts
```
Tests 29 critical assertions across authentication, deterministic arithmetic, bill verification, Gemini AI JSON schema compliance, recommendation lifecycle, and platform lead capture.

---

## 🛡️ Security & Privacy Architecture

- **Row-Level Society Isolation (RLS)**: Enforced in backend middleware. All database queries restrict results to `WHERE society_id = req.user.societyId`.
- **Zero API Key Exposure**: The Gemini API key resides solely server-side in `server/.env` and is never sent to the browser.
- **Verification Screen Before Storage**: Extracted bill metadata never enters the permanent ledger without human confirmation.
- **Password Protection**: Passwords hashed using bcrypt with 10 salt rounds.
- **Prevented Self-Lockout**: Society administrators cannot deactivate or demote their own active session.

---

## 🗺️ Product Roadmap

- **Phase 1 (Current MVP)**: Manual bill uploads, OCR text extraction with verification screen, deterministic analytics, structured AI insights, recommendation action tracking, and monthly AGM reports.
- **Phase 2**: Automated CSV/Excel batch ingestion wizards, inter-society benchmarking across localities.
- **Phase 3**: DISCOM consumer portal scrapers and smart-meter API integrations.
- **Phase 4**: Non-invasive IoT current-transformer (CT) sensor telemetry for real-time pump room monitoring.
- **Phase 5**: Predictive demand optimization and automated peak-tariff pre-cooling schedules.
