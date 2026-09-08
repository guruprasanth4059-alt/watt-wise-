-- WattWise Relational Database Schema
-- Production-compatible with PostgreSQL and SQLite

CREATE TABLE IF NOT EXISTS societies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    city TEXT,
    apartments INTEGER NOT NULL DEFAULT 1,
    buildings INTEGER NOT NULL DEFAULT 1,
    floors INTEGER DEFAULT 0,
    facilities TEXT DEFAULT '[]', -- JSON string array
    setup_completed INTEGER DEFAULT 1,
    occupancy_estimate INTEGER DEFAULT 85,
    pilot_start_date TEXT,
    pilot_end_date TEXT,
    pilot_status TEXT DEFAULT 'active_pilot', -- not_started, setup, active_pilot, ending_soon, completed, converted, expired
    is_demo INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'resident', -- platform_admin, society_admin, committee_member, resident
    society_id TEXT REFERENCES societies(id) ON DELETE CASCADE,
    phone TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meters (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    meter_number TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'common_area', -- common_area, pump, clubhouse, elevator, lighting, parking, other
    building TEXT,
    area TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    meter_id TEXT REFERENCES meters(id) ON DELETE SET NULL,
    billing_period TEXT NOT NULL, -- e.g., '2026-03' or 'March 2026'
    units_kwh REAL NOT NULL,
    bill_amount REAL NOT NULL,
    fixed_charges REAL DEFAULT 0,
    energy_charges REAL DEFAULT 0,
    other_charges REAL DEFAULT 0,
    previous_reading REAL,
    current_reading REAL,
    billing_days INTEGER,
    due_date TEXT,
    file_url TEXT,
    file_name TEXT,
    extraction_confidence TEXT DEFAULT 'high', -- low, medium, high
    verification_status TEXT DEFAULT 'verified', -- verified, needs_review, unverified
    verified INTEGER DEFAULT 0,
    verified_by TEXT,
    verified_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS consumption (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    meter_id TEXT REFERENCES meters(id) ON DELETE SET NULL,
    period TEXT NOT NULL,
    units_kwh REAL NOT NULL,
    source TEXT DEFAULT 'bill',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS baselines (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    avg_monthly_kwh REAL NOT NULL,
    avg_monthly_bill REAL NOT NULL,
    verified_months_count INTEGER NOT NULL,
    quality TEXT DEFAULT 'good', -- good, needs_review, insufficient
    status TEXT DEFAULT 'established', -- not_established, preliminary, established
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recommendations (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    reason TEXT NOT NULL,
    suggested_action TEXT NOT NULL,
    problem_observed TEXT,
    evidence TEXT,
    suggested_investigation TEXT,
    potential_impact TEXT,
    confidence TEXT DEFAULT 'medium', -- low, medium, high
    priority TEXT NOT NULL DEFAULT 'medium', -- high, medium, low
    estimated_savings REAL NOT NULL DEFAULT 0,
    estimated_savings_max REAL DEFAULT 0,
    assigned_to TEXT,
    due_date TEXT,
    status TEXT DEFAULT 'not_started', -- new, assigned, not_started, in_progress, completed, dismissed
    category TEXT DEFAULT 'General',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS actions (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    recommendation_id TEXT REFERENCES recommendations(id) ON DELETE SET NULL,
    action_taken TEXT NOT NULL,
    action_date TEXT NOT NULL,
    person_responsible TEXT,
    notes TEXT,
    previous_condition TEXT,
    new_condition TEXT,
    before_consumption REAL,
    after_consumption REAL,
    measurement_period TEXT,
    baseline_reference_kwh REAL,
    post_action_average_kwh REAL,
    observed_reduction_kwh REAL,
    observed_reduction_percent REAL,
    measured_savings REAL,
    savings_confidence TEXT DEFAULT 'medium', -- low, medium, high
    methodology TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS savings (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    estimated_savings REAL DEFAULT 0,
    measured_savings REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    report_data TEXT NOT NULL, -- JSON string
    file_url TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- bill_verification, bill_uploaded, unusual_consumption, ai_insight, recommendation, report_ready, pilot_ending_soon, action_completed
    read INTEGER DEFAULT 0,
    link TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    society_id TEXT UNIQUE NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    plan TEXT DEFAULT 'pilot', -- pilot, basic, pro, enterprise
    status TEXT DEFAULT 'trial', -- trial, active, expired
    trial_start TEXT,
    trial_end TEXT,
    subscription_start TEXT,
    subscription_end TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pilot_requests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    society_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    city TEXT NOT NULL,
    apartments INTEGER NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'new', -- new, contacted, pilot_started, converted, closed
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_insights (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    period TEXT NOT NULL,
    summary TEXT NOT NULL,
    observations TEXT NOT NULL DEFAULT '[]', -- JSON array
    possible_causes TEXT NOT NULL DEFAULT '[]', -- JSON array
    recommended_checks TEXT NOT NULL DEFAULT '[]', -- JSON array
    recommendations TEXT NOT NULL DEFAULT '[]', -- JSON array
    confidence TEXT DEFAULT 'medium', -- low, medium, high
    data_limitations TEXT NOT NULL DEFAULT '[]', -- JSON array
    prompt_data TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- login, bill_upload, bill_verify, bill_edit, bill_delete, action_recorded, role_changed, report_generated
    entity_type TEXT NOT NULL, -- bill, meter, recommendation, action, report, user, society
    entity_id TEXT,
    metadata TEXT DEFAULT '{}', -- JSON object
    created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for rapid society-isolated queries
CREATE INDEX IF NOT EXISTS idx_users_society ON users(society_id);
CREATE INDEX IF NOT EXISTS idx_meters_society ON meters(society_id);
CREATE INDEX IF NOT EXISTS idx_bills_society ON bills(society_id);
CREATE INDEX IF NOT EXISTS idx_consumption_society ON consumption(society_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_society ON recommendations(society_id);
CREATE INDEX IF NOT EXISTS idx_actions_society ON actions(society_id);
CREATE INDEX IF NOT EXISTS idx_savings_society ON savings(society_id);
CREATE INDEX IF NOT EXISTS idx_reports_society ON reports(society_id);
CREATE INDEX IF NOT EXISTS idx_notifications_society ON notifications(society_id);
CREATE INDEX IF NOT EXISTS idx_baselines_society ON baselines(society_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_society ON audit_logs(society_id);
