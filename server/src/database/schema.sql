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

-- Phase 3 Smart Meter & Real-Time Energy Intelligence Tables
CREATE TABLE IF NOT EXISTS meter_connections (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    meter_id TEXT NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- simulated, pulse, energy_api, custom
    status TEXT NOT NULL DEFAULT 'not_connected', -- not_connected, connecting, connected, syncing, sync_error, disconnected
    external_meter_id TEXT,
    data_source TEXT DEFAULT 'smart_meter', -- manual, file, api, smart_meter, demo
    config TEXT DEFAULT '{}', -- JSON configuration (no plaintext secrets)
    last_sync_at TEXT,
    last_success_at TEXT,
    last_error_at TEXT,
    last_error_message TEXT,
    records_received INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meter_measurements (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    meter_id TEXT NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    timestamp TEXT NOT NULL, -- ISO-8601 UTC
    energy_kwh REAL NOT NULL,
    demand_kw REAL,
    voltage REAL,
    current REAL,
    power_factor REAL,
    frequency REAL,
    source TEXT NOT NULL DEFAULT 'smart_meter', -- manual, file, api, smart_meter, demo
    quality_status TEXT NOT NULL DEFAULT 'valid', -- valid, suspect, missing, estimated, simulated
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(meter_id, timestamp, source)
);

CREATE TABLE IF NOT EXISTS anomalies (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    meter_id TEXT REFERENCES meters(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- consumption_spike, unexpected_overnight, persistent_high_load, missing_data, meter_offline, unusual_pattern
    severity TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    observed_value REAL NOT NULL,
    expected_value REAL NOT NULL,
    deviation_percent REAL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    status TEXT DEFAULT 'new', -- new, investigating, resolved, dismissed
    explanation TEXT,
    recommended_checks TEXT DEFAULT '[]', -- JSON array
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS investigations (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    anomaly_id TEXT NOT NULL REFERENCES anomalies(id) ON DELETE CASCADE,
    possible_cause TEXT,
    notes TEXT,
    action_taken TEXT,
    resolution TEXT,
    resolved_at TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tariffs (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rate_type TEXT NOT NULL DEFAULT 'fixed', -- fixed, slab, tou
    rate_per_kwh REAL DEFAULT 8.0,
    configuration TEXT DEFAULT '{}', -- JSON object with slabs or TOU slots
    effective_from TEXT,
    effective_to TEXT,
    source TEXT DEFAULT 'user_entered',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ==========================================
-- PHASE 4: PREDICTIVE ENERGY INTELLIGENCE
-- ==========================================

CREATE TABLE IF NOT EXISTS forecast_runs (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    horizon TEXT NOT NULL, -- next_day, next_7d, next_30d, monthly
    target_period TEXT NOT NULL,
    predicted_kwh REAL NOT NULL,
    range_min_kwh REAL NOT NULL,
    range_max_kwh REAL NOT NULL,
    predicted_cost REAL NOT NULL,
    model_type TEXT NOT NULL, -- moving_avg, seasonal_baseline, trend_aware, ml_regression
    model_version TEXT DEFAULT 'v4.1.0',
    confidence TEXT DEFAULT 'medium', -- low, medium, high
    coverage_months INTEGER DEFAULT 0,
    error_mape REAL DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS forecast_predictions (
    id TEXT PRIMARY KEY,
    forecast_run_id TEXT NOT NULL REFERENCES forecast_runs(id) ON DELETE CASCADE,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    timestamp TEXT NOT NULL,
    predicted_kwh REAL NOT NULL,
    range_min_kwh REAL,
    range_max_kwh REAL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS forecast_metrics (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    model_type TEXT NOT NULL,
    period TEXT NOT NULL,
    mae REAL DEFAULT 0,
    mape REAL DEFAULT 0,
    rmse REAL DEFAULT 0,
    actual_kwh REAL,
    predicted_kwh REAL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS predictive_anomalies (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    meter_id TEXT REFERENCES meters(id) ON DELETE SET NULL,
    pattern_type TEXT NOT NULL, -- baseload_creep, pump_runtime_extension, recurring_peak_shift, degradation_pattern
    risk_score TEXT NOT NULL, -- low, medium, high, critical
    observed_change TEXT NOT NULL,
    historical_comparison TEXT NOT NULL,
    expected_future_impact TEXT NOT NULL,
    confidence TEXT DEFAULT 'medium',
    recommended_action TEXT NOT NULL,
    status TEXT DEFAULT 'new', -- new, acknowledged, investigating, resolved, dismissed
    assigned_user TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS energy_opportunities (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    meter_id TEXT REFERENCES meters(id) ON DELETE SET NULL,
    category TEXT NOT NULL, -- lighting, water_pumps, elevators, hvac, clubhouse, tariff_optimization, scheduling, maintenance
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence TEXT NOT NULL,
    estimated_impact_kwh REAL NOT NULL,
    estimated_impact_inr REAL NOT NULL,
    confidence TEXT DEFAULT 'medium',
    priority TEXT DEFAULT 'medium', -- high, medium, low
    suggested_action TEXT NOT NULL,
    owner TEXT,
    status TEXT DEFAULT 'identified', -- identified, under_review, in_progress, implemented, dismissed
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scenario_runs (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    scenario_type TEXT NOT NULL, -- pump_schedule, led_retrofit, solar_offset, tariff_shift
    parameters TEXT DEFAULT '{}', -- JSON input parameters
    estimated_kwh_monthly REAL NOT NULL,
    estimated_cost_monthly REAL NOT NULL,
    payback_months REAL,
    confidence TEXT DEFAULT 'medium',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS equipment_health_signals (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    meter_id TEXT REFERENCES meters(id) ON DELETE CASCADE,
    equipment_name TEXT NOT NULL,
    signal_type TEXT NOT NULL, -- efficiency_degradation_proxy, excessive_runtime_creep, abnormal_idle_draw
    severity TEXT DEFAULT 'medium', -- low, medium, high
    confidence TEXT DEFAULT 'medium',
    runtime_trend TEXT,
    consumption_trend TEXT,
    recommendation TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_copilot_sessions (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Energy Copilot Session',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_copilot_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES ai_copilot_sessions(id) ON DELETE CASCADE,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- user, assistant
    content TEXT NOT NULL,
    evidence TEXT DEFAULT '[]', -- JSON array of cited metrics
    recommended_actions TEXT DEFAULT '[]', -- JSON array
    links TEXT DEFAULT '[]', -- JSON array
    confidence TEXT DEFAULT 'medium',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS committee_summaries (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    meeting_month TEXT NOT NULL,
    top_issues TEXT DEFAULT '[]', -- JSON array
    top_opportunities TEXT DEFAULT '[]', -- JSON array
    financial_impact TEXT DEFAULT '{}', -- JSON object
    action_items TEXT DEFAULT '[]', -- JSON array
    executive_briefing TEXT NOT NULL,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_meter_connections_society ON meter_connections(society_id);
CREATE INDEX IF NOT EXISTS idx_meter_connections_meter ON meter_connections(meter_id);
CREATE INDEX IF NOT EXISTS idx_measurements_meter_time ON meter_measurements(meter_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_measurements_society_time ON meter_measurements(society_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_anomalies_society ON anomalies(society_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_meter ON anomalies(meter_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status);
CREATE INDEX IF NOT EXISTS idx_investigations_anomaly ON investigations(anomaly_id);
CREATE INDEX IF NOT EXISTS idx_tariffs_society ON tariffs(society_id);
CREATE INDEX IF NOT EXISTS idx_forecast_runs_society ON forecast_runs(society_id);
CREATE INDEX IF NOT EXISTS idx_forecast_predictions_run ON forecast_predictions(forecast_run_id);
CREATE INDEX IF NOT EXISTS idx_predictive_anomalies_soc ON predictive_anomalies(society_id);
CREATE INDEX IF NOT EXISTS idx_energy_opportunities_soc ON energy_opportunities(society_id);
CREATE INDEX IF NOT EXISTS idx_scenario_runs_soc ON scenario_runs(society_id);
CREATE INDEX IF NOT EXISTS idx_equipment_health_soc ON equipment_health_signals(society_id);
CREATE INDEX IF NOT EXISTS idx_copilot_messages_session ON ai_copilot_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_committee_summaries_soc ON committee_summaries(society_id);

-- =============================================================
-- PHASE 5: ENERGY ASSETS, SOLAR, EV, PROJECTS & OPTIMIZATION
-- =============================================================

-- 1. Energy Assets Registry
CREATE TABLE IF NOT EXISTS energy_assets (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    meter_id TEXT REFERENCES meters(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL, -- meter, solar, ev_charger, battery, pump, hvac, lighting, elevator, generator, other
    location TEXT,
    building TEXT,
    capacity REAL, -- kW, kWp, kWh, HP
    capacity_unit TEXT DEFAULT 'kW',
    installation_date TEXT,
    status TEXT DEFAULT 'active', -- active, inactive, maintenance, unknown
    manufacturer TEXT,
    notes TEXT,
    data_source TEXT DEFAULT 'manual', -- manual, smart_meter, api
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 2. Solar Systems & Measurements
CREATE TABLE IF NOT EXISTS solar_systems (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    asset_id TEXT REFERENCES energy_assets(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    capacity_kwp REAL NOT NULL,
    panel_technology TEXT DEFAULT 'Monocrystalline',
    inverter_capacity_kw REAL,
    azimuth_deg REAL DEFAULT 180,
    tilt_deg REAL DEFAULT 15,
    installation_date TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS solar_measurements (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    solar_system_id TEXT NOT NULL REFERENCES solar_systems(id) ON DELETE CASCADE,
    date TEXT NOT NULL, -- YYYY-MM-DD
    generation_kwh REAL NOT NULL,
    self_consumed_kwh REAL NOT NULL,
    grid_exported_kwh REAL DEFAULT 0,
    peak_power_kw REAL,
    is_estimated INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(solar_system_id, date)
);

-- 3. EV Chargers & Sessions
CREATE TABLE IF NOT EXISTS ev_chargers (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    asset_id TEXT REFERENCES energy_assets(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    charger_type TEXT DEFAULT 'Type-2 AC', -- Type-2 AC, CCS2 DC, 15A Socket
    power_rating_kw REAL NOT NULL DEFAULT 7.4,
    location TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ev_sessions (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    charger_id TEXT NOT NULL REFERENCES ev_chargers(id) ON DELETE CASCADE,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    energy_consumed_kwh REAL NOT NULL,
    peak_demand_kw REAL,
    cost_inr REAL,
    is_peak_window INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 4. Energy Projects Portfolio & ROI Tracking
CREATE TABLE IF NOT EXISTS energy_projects (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- solar, led_retrofit, pump_upgrade, hvac_optimization, ev_smart_charging, battery_storage, submetering
    status TEXT DEFAULT 'evaluating', -- idea, evaluating, approved, in_progress, completed, monitoring, closed
    priority TEXT DEFAULT 'medium', -- low, medium, high
    owner TEXT,
    estimated_cost_inr REAL NOT NULL DEFAULT 0,
    actual_cost_inr REAL DEFAULT 0,
    estimated_annual_savings_kwh REAL NOT NULL DEFAULT 0,
    estimated_annual_savings_inr REAL NOT NULL DEFAULT 0,
    observed_annual_savings_kwh REAL DEFAULT 0,
    observed_annual_savings_inr REAL DEFAULT 0,
    estimated_payback_months REAL,
    start_date TEXT,
    completion_date TEXT,
    notes TEXT,
    assumptions TEXT DEFAULT '[]', -- JSON
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 5. Society Energy Strategy Targets
CREATE TABLE IF NOT EXISTS energy_targets (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    target_year INTEGER NOT NULL,
    consumption_reduction_pct REAL DEFAULT 10,
    cost_reduction_pct REAL DEFAULT 8,
    renewable_contribution_pct REAL DEFAULT 20,
    peak_demand_target_kw REAL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(society_id, target_year)
);

-- Phase 5 Indexes
CREATE INDEX IF NOT EXISTS idx_energy_assets_soc ON energy_assets(society_id);
CREATE INDEX IF NOT EXISTS idx_solar_systems_soc ON solar_systems(society_id);
CREATE INDEX IF NOT EXISTS idx_solar_meas_sys_date ON solar_measurements(solar_system_id, date);
CREATE INDEX IF NOT EXISTS idx_ev_chargers_soc ON ev_chargers(society_id);
CREATE INDEX IF NOT EXISTS idx_ev_sessions_soc_time ON ev_sessions(society_id, start_time);
CREATE INDEX IF NOT EXISTS idx_energy_projects_soc ON energy_projects(society_id);
CREATE INDEX IF NOT EXISTS idx_energy_targets_soc ON energy_targets(society_id);


