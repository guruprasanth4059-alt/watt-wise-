import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, initializeDatabase, execute, queryOne } from './db.js';
import { SimulatedSmartMeterProvider } from '../services/providers/simulatedProvider.js';
import { generateSocietyForecast } from '../services/forecasting/forecastingEngine.js';
import { generateOpportunities } from '../services/opportunities.js';
import { evaluatePredictiveAnomalies } from '../services/predictiveAnomalies.js';
import { evaluateEquipmentHealth } from '../services/equipmentHealth.js';
import { generateCommitteeBriefing } from '../services/committee.js';
import { runScenarioSimulation } from '../services/scenarios.js';

export function seedDatabase() {
  initializeDatabase();

  // Check if Green Valley already exists
  const existingSociety = queryOne('SELECT id FROM societies WHERE name = ?', ['Green Valley Residency']);
  if (existingSociety) {
    seedPhase2PilotData();
    seedPhase3SmartMeterData();
    seedPhase4PredictiveData();
    seedPhase5OptimizationData();
    console.log('Database already seeded. Phase 2, 3, 4, and 5 optimization intelligence verified.');
    return;
  }

  console.log('Seeding WattWise database with Demo Society "Green Valley Residency"...');

  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync('admin123', salt);
  const memberPasswordHash = bcrypt.hashSync('member123', salt);
  const residentPasswordHash = bcrypt.hashSync('resident123', salt);

  const societyId = 'soc-green-valley-01';

  // 1. Create Society
  execute(
    `INSERT INTO societies (id, name, location, city, apartments, buildings, floors, facilities, setup_completed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
    [
      societyId,
      'Green Valley Residency',
      'Outer Ring Road, Bellandur',
      'Bengaluru',
      240,
      4,
      12,
      JSON.stringify(['Water Pumps', 'Elevators', 'Common Lighting', 'Clubhouse', 'Swimming Pool', 'Gym', 'Parking'])
    ]
  );

  // 2. Create Users
  const platformAdminId = 'user-platform-admin-01';
  const societyAdminId = 'user-society-admin-01';
  const committeeMemberId = 'user-committee-member-01';
  const residentId = 'user-resident-01';

  // Platform Admin (No society_id restriction)
  execute(
    `INSERT INTO users (id, name, email, password_hash, role, society_id, phone, status)
     VALUES (?, ?, ?, ?, 'platform_admin', NULL, '+91 98765 43210', 'active')`,
    [platformAdminId, 'WattWise Platform Admin', 'admin@wattwise.com', adminPasswordHash]
  );

  // Society Admin
  execute(
    `INSERT INTO users (id, name, email, password_hash, role, society_id, phone, status)
     VALUES (?, ?, ?, ?, 'society_admin', ?, '+91 98450 11223', 'active')`,
    [societyAdminId, 'Rajesh Kumar (President)', 'president@greenvalley.com', adminPasswordHash, societyId]
  );

  // Committee Member
  execute(
    `INSERT INTO users (id, name, email, password_hash, role, society_id, phone, status)
     VALUES (?, ?, ?, ?, 'committee_member', ?, '+91 98450 44556', 'active')`,
    [committeeMemberId, 'Ananya Sharma (Treasurer)', 'treasurer@greenvalley.com', memberPasswordHash, societyId]
  );

  // Resident
  execute(
    `INSERT INTO users (id, name, email, password_hash, role, society_id, phone, status)
     VALUES (?, ?, ?, ?, 'resident', ?, '+91 98450 77889', 'active')`,
    [residentId, 'Vikram Mehta (Resident A-402)', 'resident@greenvalley.com', residentPasswordHash, societyId]
  );

  // 3. Create Meters
  const metersData = [
    { id: 'meter-main-01', name: 'Main Common Area Panel', number: 'BESCOM-KA-04-CM-88392', type: 'common_area', bldg: 'Central', area: 'Substation' },
    { id: 'meter-pump-01', name: 'Raw Water & Hydro-Pneumatic Pumps', number: 'BESCOM-KA-04-WP-10492', type: 'pump', bldg: 'Basement 2', area: 'Pump Room' },
    { id: 'meter-elev-01', name: 'Passenger Elevators (Towers A-D)', number: 'BESCOM-KA-04-EL-44821', type: 'elevator', bldg: 'All Towers', area: 'Lift Shafts' },
    { id: 'meter-club-01', name: 'Clubhouse, Gym & Pool Filtration', number: 'BESCOM-KA-04-CH-99120', type: 'clubhouse', bldg: 'Clubhouse', area: 'Recreation Center' },
    { id: 'meter-light-01', name: 'Basement & Perimeter Security Lighting', number: 'BESCOM-KA-04-LT-33019', type: 'lighting', bldg: 'Perimeter', area: 'Driveway & Basements' }
  ];

  for (const m of metersData) {
    execute(
      `INSERT INTO meters (id, society_id, name, meter_number, type, building, area, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [m.id, societyId, m.name, m.number, m.type, m.bldg, m.area]
    );
  }

  // 4. Create 6 Months of Bills (Oct 2025 - Mar 2026)
  const billsData = [
    { period: '2025-10', kwh: 19850, amount: 154830, fixed: 18000, energy: 136830, date: '2025-11-05' },
    { period: '2025-11', kwh: 19400, amount: 151320, fixed: 18000, energy: 133320, date: '2025-12-05' },
    { period: '2025-12', kwh: 19100, amount: 148980, fixed: 18000, energy: 130980, date: '2026-01-05' },
    { period: '2026-01', kwh: 20200, amount: 157560, fixed: 18000, energy: 139560, date: '2026-02-05' },
    { period: '2026-02', kwh: 19200, amount: 150200, fixed: 18000, energy: 132200, date: '2026-03-05' },
    { period: '2026-03', kwh: 18420, amount: 142380, fixed: 18000, energy: 124380, date: '2026-04-05' }
  ];

  for (const b of billsData) {
    const billId = `bill-${b.period}`;
    execute(
      `INSERT INTO bills (id, society_id, meter_id, billing_period, units_kwh, bill_amount, fixed_charges, energy_charges, due_date, verified, verified_by, notes)
       VALUES (?, ?, 'meter-main-01', ?, ?, ?, ?, ?, ?, 1, 'Rajesh Kumar', 'Verified against official utility invoice')`,
      [billId, societyId, b.period, b.kwh, b.amount, b.fixed, b.energy, b.date]
    );

    // Also populate consumption table
    execute(
      `INSERT INTO consumption (id, society_id, meter_id, period, units_kwh, source)
       VALUES (?, ?, 'meter-main-01', ?, ?, 'bill')`,
      [`cons-${b.period}`, societyId, b.period, b.kwh]
    );
  }

  // 5. Create Sub-meter consumption breakdown for March 2026
  // Demonstrating true category-level breakdown
  const subMeterBreakdown = [
    { meterId: 'meter-pump-01', kwh: 5200 },
    { meterId: 'meter-elev-01', kwh: 4800 },
    { meterId: 'meter-light-01', kwh: 3900 },
    { meterId: 'meter-club-01', kwh: 2800 },
    { meterId: 'meter-main-01', kwh: 1720 } // other common areas
  ];

  for (const sm of subMeterBreakdown) {
    execute(
      `INSERT INTO consumption (id, society_id, meter_id, period, units_kwh, source)
       VALUES (?, ?, ?, '2026-03', ?, 'manual')`,
      [`subcons-${sm.meterId}-2026-03`, societyId, sm.meterId, sm.kwh]
    );
  }

  // 6. Create Recommendations
  const rec1Id = 'rec-pump-schedule-01';
  execute(
    `INSERT INTO recommendations (id, society_id, title, description, reason, suggested_action, priority, estimated_savings, estimated_savings_max, status, category)
     VALUES (?, ?, ?, ?, ?, ?, 'high', 4200, 5500, 'completed', 'Water Pumps')`,
    [
      rec1Id,
      societyId,
      'Review Water Pump Operating Hours & Timer Schedule',
      'The hydro-pneumatic water pump systems in Basement 2 showed continuous cycling during low-demand midnight hours (1:00 AM - 4:30 AM).',
      'Common-area consumption increased 5.2% in January due to redundant multi-pump cycling and stuck mechanical float switches.',
      'Adjust pump timer to staggered schedule (6:00 AM - 9:00 AM, 5:00 PM - 8:30 PM) and service overhead tank float sensors.',
    ]
  );

  const rec2Id = 'rec-basement-led-02';
  execute(
    `INSERT INTO recommendations (id, society_id, title, description, reason, suggested_action, priority, estimated_savings, estimated_savings_max, status, category)
     VALUES (?, ?, ?, ?, ?, ?, 'medium', 2800, 3500, 'in_progress', 'Common Lighting')`,
    [
      rec2Id,
      societyId,
      'Basement Parking Motion Sensors & Bi-Level Lighting',
      'Perimeter and Basement 1/2 lighting currently operate 24x7 at 100% luminous intensity across 180 fixtures.',
      'Continuous basement illumination contributes ~21% of total common lighting load during daylight and low-activity hours.',
      'Retrofit 80 primary driveway fixtures with microwave motion sensor LED batten fittings that dim to 20% when idle.',
    ]
  );

  const rec3Id = 'rec-clubhouse-hvac-03';
  execute(
    `INSERT INTO recommendations (id, society_id, title, description, reason, suggested_action, priority, estimated_savings, estimated_savings_max, status, category)
     VALUES (?, ?, ?, ?, ?, ?, 'low', 1420, 2000, 'not_started', 'Clubhouse')`,
    [
      rec3Id,
      societyId,
      'Clubhouse AC Pre-cooling & Gym Thermostat Calibration',
      'Clubhouse 5-ton split AC units are powered on during peak evening tariff hours (6:00 PM - 9:30 PM) at 21°C.',
      'Peak energy tariff slabs apply between 18:00 and 22:00. Pre-cooling before 17:30 leverages standard tariffs.',
      'Shift gym AC set-point to 24°C and pre-cool main squash court/gym areas from 4:30 PM to 5:45 PM.',
    ]
  );

  // 7. Create Recorded Action
  execute(
    `INSERT INTO actions (id, society_id, recommendation_id, action_taken, action_date, notes, before_consumption, after_consumption, measured_savings, created_by)
     VALUES (?, ?, ?, ?, '2026-02-12', ?, 20200, 18420, 5200, 'Rajesh Kumar')`,
    [
      'action-pump-01',
      societyId,
      rec1Id,
      'Installed automated timer switches and repaired level sensors on Tower C and D overhead booster pumps.',
      'Consumption decreased after the recorded action. Other seasonal factors may also have contributed.'
    ]
  );

  // 8. Create Savings History
  const savingsData = [
    { month: '2025-11', est: 3500, measured: 0, notes: 'Baseline month' },
    { month: '2025-12', est: 4800, measured: 2340, notes: 'Initial lighting timer optimization' },
    { month: '2026-01', est: 5200, measured: 1800, notes: 'Water tank inspection initiated' },
    { month: '2026-02', est: 7100, measured: 4600, notes: 'Booster pump schedule updated' },
    { month: '2026-03', est: 8420, measured: 5200, notes: 'Measured pump savings verified against March invoice' }
  ];

  for (const s of savingsData) {
    execute(
      `INSERT INTO savings (id, society_id, month, estimated_savings, measured_savings, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [`sav-${s.month}`, societyId, s.month, s.est, s.measured, s.notes]
    );
  }

  // 9. Create AI Insight
  execute(
    `INSERT INTO ai_insights (id, society_id, period, summary, observations, possible_causes, recommendations, confidence)
     VALUES (?, ?, '2026-03', ?, ?, ?, ?, 'high')`,
    [
      'ai-insight-2026-03',
      societyId,
      'Electricity consumption decreased 4.1% in March compared with February. Water pump schedule modifications correlate with a 780 kWh drop in shared power usage.',
      JSON.stringify([
        'Overall common-area consumption dropped from 19,200 kWh in February to 18,420 kWh in March (-4.1%).',
        'Average cost per apartment reduced from ₹625 to ₹593 per month.',
        'Sub-meter readings confirm water pumps accounted for 28.2% of consumption, down from ~32% in January.'
      ]),
      JSON.stringify([
        'Timer automation on hydro-pneumatic pumps prevented continuous cycling.',
        'Weather patterns in early March reduced cooling loads in the clubhouse.'
      ]),
      JSON.stringify([
        'Verify basement motion sensor retrofit plan for Tower B parking.',
        'Review evening lighting shutoff times with security patrol.'
      ])
    ]
  );

  // 10. Create Notifications
  const notificationsData = [
    {
      id: 'notif-01',
      title: 'Monthly Energy Report Ready',
      message: 'March 2026 Executive Summary is now available for download and committee review.',
      type: 'report_ready',
      link: '/reports'
    },
    {
      id: 'notif-02',
      title: 'Action Impact Measured',
      message: 'Pump timer schedule modification resulted in an estimated ₹5,200 reduction in monthly energy charges.',
      type: 'recommendation',
      link: '/savings'
    },
    {
      id: 'notif-03',
      title: 'AI Consumption Analysis',
      message: 'WattWise AI detected a 4.1% month-over-month decrease in overall common-area power demand.',
      type: 'ai_insight',
      link: '/insights'
    }
  ];

  for (const n of notificationsData) {
    execute(
      `INSERT INTO notifications (id, society_id, title, message, type, read, link)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [n.id, societyId, n.title, n.message, n.type, n.link]
    );
  }

  // 11. Create Subscription (Free Pilot)
  execute(
    `INSERT INTO subscriptions (id, society_id, plan, status, trial_start, trial_end)
     VALUES (?, ?, 'pilot', 'trial', '2026-01-01', '2026-04-01')`,
    ['sub-green-valley-01', societyId]
  );

  // 12. Create Pilot Requests for Platform Admin
  const pilotRequests = [
    {
      id: 'pilot-req-01',
      name: 'Sunil Rao',
      society: 'Prestige Lakeside Habitat',
      email: 's.rao@prestigelakeside.org',
      phone: '+91 99001 23456',
      city: 'Bengaluru',
      apartments: 340,
      msg: 'We have 8 residential towers and very high basement lighting bills.',
      status: 'new'
    },
    {
      id: 'pilot-req-02',
      name: 'Meenakshi Iyer',
      society: 'Sobha Forest View',
      email: 'secretary@sobhaforest.in',
      phone: '+91 98452 33445',
      city: 'Bengaluru',
      apartments: 180,
      msg: 'Looking to audit STP and pump power consumption during our 3-month trial.',
      status: 'contacted'
    },
    {
      id: 'pilot-req-03',
      name: 'Kavita Menon',
      society: 'Godrej Woodsman Estate',
      email: 'kavita.m@woodsmanrwa.com',
      phone: '+91 97312 99881',
      city: 'Bengaluru',
      apartments: 420,
      msg: 'Need automated report generation for our monthly general body meetings.',
      status: 'pilot_started'
    }
  ];

  for (const p of pilotRequests) {
    execute(
      `INSERT INTO pilot_requests (id, name, society_name, email, phone, city, apartments, message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.name, p.society, p.email, p.phone, p.city, p.apartments, p.msg, p.status]
    );
  }

  seedPhase2PilotData();

  console.log('Seed completed successfully! Demo data is ready.');
}

function seedPhase2PilotData() {
  const societyId = 'soc-green-valley-01';

  // 1. Update society with pilot timeline
  execute(
    `UPDATE societies 
     SET occupancy_estimate = 92, 
         pilot_start_date = '2026-01-01', 
         pilot_end_date = '2026-03-31', 
         pilot_status = 'active_pilot', 
         is_demo = 1
     WHERE id = ?`,
    [societyId]
  );

  // 2. Ensure baseline table record exists
  const existingBaseline = queryOne('SELECT id FROM baselines WHERE society_id = ?', [societyId]);
  if (!existingBaseline) {
    execute(
      `INSERT INTO baselines (id, society_id, period_start, period_end, avg_monthly_kwh, avg_monthly_bill, verified_months_count, quality, status)
       VALUES ('base-green-valley', ?, '2025-10', '2026-03', 18950, 145000, 6, 'good', 'established')`,
      [societyId]
    );
  }

  // 3. Update recommendations with assignee, due dates, and problem evidence
  execute(
    `UPDATE recommendations 
     SET problem_observed = 'Water pump running cycles extend into morning peak tariff hours without automatic shutoff.',
         evidence = 'Sub-meter telemetry indicates pump consumption constitutes ~33% of total common-area power.',
         suggested_investigation = 'Inspect mechanical timer calibration and float switch threshold settings in underground sump.',
         potential_impact = 'Estimated potential reduction of 900–1,200 kWh/month (~₹8,000/mo).',
         confidence = 'high',
         assigned_to = 'Suresh K. (Facility Lead)',
         due_date = '2026-03-25',
         status = 'in_progress'
     WHERE society_id = ? AND title LIKE '%Pump%'`,
    [societyId]
  );

  execute(
    `UPDATE recommendations 
     SET problem_observed = 'Basement parking halogen and CFL fixtures remain energized 24/7 with zero occupancy sensing.',
         evidence = 'Lighting circuits draw continuous 4.2 kW steady load day and night.',
         suggested_investigation = 'Audit perimeter motion sensors and evaluate zoned 50% bi-level LED dimming.',
         potential_impact = 'Estimated potential reduction of 600–800 kWh/month (~₹5,000/mo).',
         confidence = 'high',
         assigned_to = 'Rajesh Kumar (President)',
         due_date = '2026-03-28',
         status = 'assigned'
     WHERE society_id = ? AND title LIKE '%LED%'`,
    [societyId]
  );

  // 4. Update actions with previous and new conditions
  execute(
    `UPDATE actions 
     SET person_responsible = 'Suresh K. (Facility Lead)',
         previous_condition = 'Pumps operated on manual switch (approx 6.5 hours/day).',
         new_condition = 'Digital astronomical timer relay installed with automated float control (4.5 hours/day).',
         measurement_period = '2026-03 Post-Action Follow-up',
         baseline_reference_kwh = 20200,
         post_action_average_kwh = 18420,
         observed_reduction_kwh = 1780,
         observed_reduction_percent = 8.8,
         measured_savings = 13884,
         savings_confidence = 'high',
         methodology = 'Recorded savings are calculated from verified post-action consumption compared with the selected baseline. This comparison does not establish causality.'
     WHERE society_id = ?`,
    [societyId]
  );

  // 5. Seed audit logs
  const existingAudit = queryOne('SELECT id FROM audit_logs WHERE society_id = ?', [societyId]);
  if (!existingAudit) {
    execute(
      `INSERT INTO audit_logs (id, society_id, user_id, event_type, entity_type, entity_id, metadata, created_at)
       VALUES 
       ('audit-demo-01', ?, 'user-society-admin-01', 'society_created', 'society', ?, '{"name":"Green Valley Residency","units":240}', '2026-01-01 10:00:00'),
       ('audit-demo-02', ?, 'user-society-admin-01', 'bill_verified', 'bill', 'bill-demo-006', '{"period":"2026-03","units":18420,"amount":142380}', '2026-03-05 14:30:00'),
       ('audit-demo-03', ?, 'user-committee-member-01', 'action_completed', 'action', 'action-demo-01', '{"action":"Digital Astronomical Relay on Pumps","observed_reduction_kwh":1780}', '2026-03-08 11:15:00')`,
      [societyId, societyId, societyId, societyId]
    );
  }
}

export function seedPhase3SmartMeterData() {
  const societyId = 'soc-green-valley-01';

  // 1. Update society timezone
  execute(`UPDATE societies SET timezone = 'Asia/Kolkata' WHERE id = ?`, [societyId]);

  // 2. Add BESCOM tariff if not exists
  const existingTariff = queryOne('SELECT id FROM tariffs WHERE society_id = ?', [societyId]);
  if (!existingTariff) {
    execute(
      `INSERT INTO tariffs (id, society_id, name, rate_type, rate_per_kwh, configuration, source, is_active)
       VALUES ('tariff-demo-bescom', ?, 'BESCOM LT-2 Common Area Commercial & Non-Domestic Tariff', 'fixed', 8.20, '{"duty_percent": 9, "fixed_demand_charge": 110}', 'demo_seed', 1)`,
      [societyId]
    );
  }

  // 3. Connect Main Meter and Pump Meter to Simulated Provider
  const mainMeter = queryOne<any>("SELECT id FROM meters WHERE society_id = ? AND type = 'common_area'", [societyId]);
  const pumpMeter = queryOne<any>("SELECT id FROM meters WHERE society_id = ? AND type = 'pump'", [societyId]);

  if (mainMeter) {
    execute(
      `UPDATE meters SET data_source = 'demo', connection_status = 'connected', is_main_meter = 1, category = 'common_area' WHERE id = ?`,
      [mainMeter.id]
    );
    const existingConn = queryOne('SELECT id FROM meter_connections WHERE meter_id = ?', [mainMeter.id]);
    if (!existingConn) {
      execute(
        `INSERT INTO meter_connections (id, society_id, meter_id, provider, status, external_meter_id, data_source, last_sync_at, last_success_at, records_received)
         VALUES ('conn-demo-main', ?, ?, 'simulated_smart_meter', 'connected', 'EXT-SIM-MAIN-01', 'demo', datetime('now', '-8 minutes'), datetime('now', '-8 minutes'), 672)`,
        [societyId, mainMeter.id]
      );
    }
  }

  if (pumpMeter) {
    execute(
      `UPDATE meters SET data_source = 'demo', connection_status = 'connected', category = 'pump' WHERE id = ?`,
      [pumpMeter.id]
    );
    const existingConn = queryOne('SELECT id FROM meter_connections WHERE meter_id = ?', [pumpMeter.id]);
    if (!existingConn) {
      execute(
        `INSERT INTO meter_connections (id, society_id, meter_id, provider, status, external_meter_id, data_source, last_sync_at, last_success_at, records_received)
         VALUES ('conn-demo-pump', ?, ?, 'simulated_smart_meter', 'connected', 'EXT-SIM-PUMP-02', 'demo', datetime('now', '-8 minutes'), datetime('now', '-8 minutes'), 672)`,
        [societyId, pumpMeter.id]
      );
    }
  }

  // 4. Ingest 7 days of 15-min simulated interval measurements for both meters
  const existingMeasurements = queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM meter_measurements WHERE society_id = ?', [societyId]);
  if (!existingMeasurements || existingMeasurements.cnt === 0) {
    const simProvider = new SimulatedSmartMeterProvider();
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);

    Promise.all([
      simProvider.fetchMeasurements({
        externalMeterId: 'EXT-SIM-MAIN-01',
        from: from.toISOString(),
        to: to.toISOString(),
        resolutionMinutes: 15
      }),
      simProvider.fetchMeasurements({
        externalMeterId: 'EXT-SIM-PUMP-02',
        from: from.toISOString(),
        to: to.toISOString(),
        resolutionMinutes: 15
      })
    ]).then(([mainM, pumpM]) => {
      for (const m of mainM) {
        execute(
          `INSERT OR IGNORE INTO meter_measurements (id, society_id, meter_id, timestamp, energy_kwh, demand_kw, voltage, current, power_factor, frequency, source, quality_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'demo', 'simulated')`,
          [`meas-${uuidv4().slice(0, 8)}`, societyId, mainMeter?.id || 'meter-demo-01', m.timestamp, m.energy_kwh, m.demand_kw, m.voltage, m.current, m.power_factor, m.frequency]
        );
      }
      for (const m of pumpM) {
        execute(
          `INSERT OR IGNORE INTO meter_measurements (id, society_id, meter_id, timestamp, energy_kwh, demand_kw, voltage, current, power_factor, frequency, source, quality_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'demo', 'simulated')`,
          [`meas-${uuidv4().slice(0, 8)}`, societyId, pumpMeter?.id || 'meter-demo-02', m.timestamp, m.energy_kwh, m.demand_kw, m.voltage, m.current, m.power_factor, m.frequency]
        );
      }
    }).catch(err => console.error('Failed to seed smart meter measurements:', err));
  }

  // 5. Seed one prominent simulated interval anomaly for demonstration
  const existingAnom = queryOne<any>("SELECT id FROM anomalies WHERE society_id = ? AND type = 'unexpected_overnight'", [societyId]);
  if (!existingAnom) {
    execute(
      `INSERT INTO anomalies (id, society_id, meter_id, type, severity, observed_value, expected_value, deviation_percent, started_at, ended_at, status, explanation, recommended_checks)
       VALUES 
       ('anom-demo-overnight', ?, ?, 'unexpected_overnight', 'high', 12.4, 0.5, 2380, datetime('now', '-18 hours'), datetime('now', '-16 hours'), 'new', 
        'Continuous water pump operation observed during overnight baseload hours (02:15 - 04:00 IST). Demand sustained at 12.4 kW against expected idle load of 0.5 kW.',
        '["Inspect overhead tank overflow sensors and float switch cutoffs in Sump 2.","Check whether mechanical timer relay failed in closed contact position.","Inspect underground transfer pipeline for silent burst or leakage."]'
       )`,
      [societyId, pumpMeter?.id || 'meter-demo-02']
    );
  }
}

export function seedPhase4PredictiveData() {
  const society = queryOne<any>("SELECT id FROM societies WHERE name = 'Green Valley Residency'");
  if (!society) return;
  const societyId = society.id;

  try {
    generateOpportunities(societyId);
    evaluatePredictiveAnomalies(societyId);
    evaluateEquipmentHealth(societyId);
    generateSocietyForecast(societyId).catch(() => {});
    generateCommitteeBriefing(societyId).catch(() => {});

    const existingScenarios = queryOne<any>("SELECT id FROM scenario_runs WHERE society_id = ?", [societyId]);
    if (!existingScenarios) {
      runScenarioSimulation(societyId, {
        title: 'Water Pump Runtime Optimization (-1 hr/day)',
        scenarioType: 'pump_schedule',
        parameters: { hoursReducedPerDay: 1.0, pumpKwRating: 11.2, capitalCostInr: 12000 }
      });
      runScenarioSimulation(societyId, {
        title: 'Basement & Perimeter Motion-Sensor LED Retrofit',
        scenarioType: 'led_retrofit',
        parameters: { fixtureCount: 140, oldWattage: 36, newWattage: 18, operatingHoursPerDay: 20, fixtureCostEach: 420 }
      });
    }
  } catch (err) {
    console.error('Failed to seed Phase 4 predictive data:', err);
  }
}

export function seedPhase5OptimizationData() {
  const society = queryOne<any>("SELECT id FROM societies WHERE name = 'Green Valley Residency'");
  if (!society) return;
  const societyId = society.id;

  try {
    // 1. Update society with sanctioned load and CEA factor configuration if missing
    execute(
      `UPDATE societies 
       SET sanctioned_load_kw = 120,
           configurations = json_set(COALESCE(configurations, '{}'), '$.cea_emissions_factor', 0.82)
       WHERE id = ?`,
      [societyId]
    );

    // 2. Seed Energy Assets
    const existingAssets = queryOne<any>('SELECT id FROM energy_assets WHERE society_id = ?', [societyId]);
    if (!existingAssets) {
      const assetsData = [
        {
          id: 'asset-gv-grid',
          name: 'Main 11kV/415V Incomer Transformer',
          asset_type: 'meter',
          location: 'Main Substation Yard',
          building: 'Main Substation',
          capacity: 120,
          capacity_unit: 'kW',
          installation_date: '2022-01-01',
          manufacturer: 'Schneider Electric',
          notes: 'Main 120 kW sanctioned grid incomer'
        },
        {
          id: 'asset-gv-solar',
          name: 'Phase 1 Rooftop Solar PV System',
          asset_type: 'solar',
          location: 'Clubhouse & Tower A Terrace',
          building: 'Clubhouse',
          capacity: 35,
          capacity_unit: 'kWp',
          installation_date: '2025-03-15',
          manufacturer: 'Tata Power Solar',
          notes: 'Monocrystalline Perc modules'
        },
        {
          id: 'asset-gv-raw-pump',
          name: 'Primary Borewell & Sump Transfer Pump',
          asset_type: 'pump',
          location: 'Basement 2 Sump Room',
          building: 'Basement 2',
          capacity: 15.0,
          capacity_unit: 'kW',
          installation_date: '2022-03-01',
          manufacturer: 'Kirloskar Brothers',
          notes: 'Primary raw water sump pump'
        },
        {
          id: 'asset-gv-booster',
          name: 'Hydro-Pneumatic Pressure Booster System',
          asset_type: 'pump',
          location: 'Tower A/B Utility Shaft',
          building: 'Tower A',
          capacity: 11.2,
          capacity_unit: 'kW',
          installation_date: '2022-03-01',
          manufacturer: 'Grundfos',
          notes: 'VFD driven pressure booster set'
        },
        {
          id: 'asset-gv-stp',
          name: 'MBBR Sewage Treatment Plant Aerators',
          asset_type: 'pump',
          location: 'STP Enclosure North Wing',
          building: 'STP Yard',
          capacity: 7.5,
          capacity_unit: 'kW',
          installation_date: '2022-04-10',
          manufacturer: 'Thermax',
          notes: 'Aeration roots blowers'
        },
        {
          id: 'asset-gv-ev-01',
          name: 'Dual AC Type-2 Charger Station 1',
          asset_type: 'ev_charger',
          location: 'Visitor & Podium Bay P1',
          building: 'Podium',
          capacity: 22.0,
          capacity_unit: 'kW',
          installation_date: '2025-06-01',
          manufacturer: 'Exicom',
          notes: 'Dual 11 kW Type-2 smart socket'
        },
        {
          id: 'asset-gv-ev-02',
          name: 'Dual AC Type-2 Charger Station 2',
          asset_type: 'ev_charger',
          location: 'Basement 1 Bay B-14',
          building: 'Basement 1',
          capacity: 22.0,
          capacity_unit: 'kW',
          installation_date: '2025-06-01',
          manufacturer: 'Exicom',
          notes: 'Dual 11 kW Type-2 smart socket'
        },
        {
          id: 'asset-gv-lighting',
          name: 'Basement & Perimeter Driveway Lighting',
          asset_type: 'lighting',
          location: 'Perimeter, Driveways & B1/B2',
          building: 'Basement / Perimeter',
          capacity: 14.0,
          capacity_unit: 'kW',
          installation_date: '2025-11-20',
          manufacturer: 'Philips Lighting',
          notes: 'Radar motion sensor LED retrofits'
        },
        {
          id: 'asset-gv-elevators',
          name: 'High-Speed Gearless Traction Elevators (4x)',
          asset_type: 'elevator',
          location: 'Towers A & B Lift Shafts',
          building: 'Towers A & B',
          capacity: 18.0,
          capacity_unit: 'kW',
          installation_date: '2022-01-15',
          manufacturer: 'Otis Elevators',
          notes: '4x passenger elevators with regenerative drives'
        },
        {
          id: 'asset-gv-dg',
          name: '125 kVA Silent Backup Diesel Generator',
          asset_type: 'generator',
          location: 'Acoustic Enclosure South Yard',
          building: 'DG Enclosure',
          capacity: 100.0,
          capacity_unit: 'kW',
          installation_date: '2022-02-01',
          manufacturer: 'Cummins India',
          notes: 'Silent acoustic enclosed DG with AMF panel'
        }
      ];

      for (const a of assetsData) {
        execute(
          `INSERT INTO energy_assets (
             id, society_id, meter_id, name, asset_type, location, building, capacity, capacity_unit,
             installation_date, status, manufacturer, notes, data_source, created_at, updated_at
           ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, 'manual', datetime('now'), datetime('now'))`,
          [
            a.id,
            societyId,
            a.name,
            a.asset_type,
            a.location,
            a.building,
            a.capacity,
            a.capacity_unit,
            a.installation_date,
            a.manufacturer,
            a.notes
          ]
        );
      }
    }

    // 3. Seed Solar System & Historical Measurements
    const existingSolar = queryOne<any>('SELECT id FROM solar_systems WHERE society_id = ?', [societyId]);
    const solarSysId = existingSolar?.id || 'solar-gv-35kw';
    if (!existingSolar) {
      execute(
        `INSERT INTO solar_systems (
           id, society_id, asset_id, name, capacity_kwp, panel_technology,
           inverter_capacity_kw, azimuth_deg, tilt_deg, installation_date, status, created_at
         ) VALUES (?, ?, 'asset-gv-solar', 'Clubhouse 35kW Rooftop Solar PV', 35, 'Monocrystalline Perc', 30, 180, 15, '2025-03-15', 'active', datetime('now'))`,
        [solarSysId, societyId]
      );

      // Seed 30 daily solar measurements
      for (let day = 30; day >= 0; day--) {
        const measuredDate = new Date();
        measuredDate.setDate(measuredDate.getDate() - day);
        const dateStr = measuredDate.toISOString().split('T')[0];

        // Generation ~ 140 - 155 kWh/day
        const dailyKwh = Math.round((142 + Math.sin(day) * 12) * 10) / 10;
        const selfConsumed = Math.round(dailyKwh * 0.88 * 10) / 10;
        const exported = Math.round((dailyKwh - selfConsumed) * 10) / 10;
        const peakKw = Math.round((28 + Math.sin(day) * 2) * 10) / 10;

        execute(
          `INSERT OR IGNORE INTO solar_measurements (
             id, society_id, solar_system_id, date, generation_kwh, self_consumed_kwh,
             grid_exported_kwh, peak_power_kw, is_estimated, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
          [
            `sm-${uuidv4().slice(0, 8)}`,
            societyId,
            solarSysId,
            dateStr,
            dailyKwh,
            selfConsumed,
            exported,
            peakKw
          ]
        );
      }
    }

    // 4. Seed EV Chargers and Charging Sessions
    const existingEv = queryOne<any>('SELECT id FROM ev_chargers WHERE society_id = ?', [societyId]);
    if (!existingEv) {
      execute(
        `INSERT INTO ev_chargers (id, society_id, asset_id, name, charger_type, power_rating_kw, location, status, created_at)
         VALUES 
         ('evc-gv-01', ?, 'asset-gv-ev-01', 'Podium Dual EV Station P1', 'Type-2 AC', 22.0, 'Podium Parking Bay P1', 'active', datetime('now')),
         ('evc-gv-02', ?, 'asset-gv-ev-02', 'Basement Fast AC Station B1', 'Type-2 AC', 22.0, 'Basement 1 Bay B-14', 'active', datetime('now'))`,
        [societyId, societyId]
      );

      // Seed 15 sample sessions
      for (let s = 1; s <= 15; s++) {
        const isPeak = s % 3 === 0;
        const energyConsumed = isPeak ? 18.4 : 24.6;
        const peakDemand = isPeak ? 7.4 : 3.6;
        const costInr = Math.round(energyConsumed * 10.5);

        execute(
          `INSERT INTO ev_sessions (
             id, society_id, charger_id, start_time, end_time,
             energy_consumed_kwh, peak_demand_kw, cost_inr, is_peak_window, created_at
           ) VALUES (?, ?, ?, datetime('now', '-' || ? || ' days', '19:30:00'), datetime('now', '-' || ? || ' days', '22:30:00'), ?, ?, ?, ?, datetime('now'))`,
          [
            `evs-${uuidv4().slice(0, 8)}`,
            societyId,
            s % 2 === 0 ? 'evc-gv-01' : 'evc-gv-02',
            s,
            s,
            energyConsumed,
            peakDemand,
            costInr,
            isPeak ? 1 : 0
          ]
        );
      }
    }

    // 5. Seed Energy Projects Portfolio
    const existingProjects = queryOne<any>('SELECT id FROM energy_projects WHERE society_id = ?', [societyId]);
    if (!existingProjects) {
      execute(
        `INSERT INTO energy_projects (
           id, society_id, name, category, status, priority, owner,
           estimated_cost_inr, actual_cost_inr,
           estimated_annual_savings_kwh, estimated_annual_savings_inr,
           observed_annual_savings_kwh, observed_annual_savings_inr,
           estimated_payback_months, start_date, completion_date,
           notes, assumptions, created_at, updated_at
         ) VALUES 
         ('proj-gv-solar', ?, '35 kW Rooftop Solar PV Installation', 'solar', 'completed', 'high', 'Secretary / MC', 1680000, 1620000, 49000, 399000, 51200, 417280, 48, '2025-01-10', '2025-03-15', 'Commissioned and generating above baseline.', '["Module yield 4.15 kWh/kWp/day","BESCOM net metering"]', datetime('now'), datetime('now')),
         ('proj-gv-pump', ?, 'Smart VFD & Ultrasonic Level Automation for Water Pumps', 'pump_upgrade', 'in_progress', 'high', 'Facility Manager', 85000, 0, 14200, 115730, 0, 0, 9, '2026-08-01', null, 'Installation 80% complete. Commissioning next week.', '["15% energy drop on hydro-pneumatic booster","No overflow wastage"]', datetime('now'), datetime('now')),
         ('proj-gv-led', ?, 'Basement & Perimeter Motion-Sensor LED Batten Retrofit', 'led_retrofit', 'completed', 'medium', 'MC Member (Infra)', 65000, 62000, 15400, 125510, 16100, 131215, 6, '2025-11-01', '2025-11-20', 'Realizing 58% energy drop in basement lighting circuit.', '["140x 18W radar motion battens replacing 36W tubes"]', datetime('now'), datetime('now')),
         ('proj-gv-storage', ?, '50 kWh BESS Peak-Shaving Battery Pilot', 'battery_storage', 'idea', 'medium', 'Energy Committee', 1200000, 0, 12800, 168000, 0, 0, 85, null, null, 'Under feasibility review by Management Committee.', '["Peak shaving of 18 kW","Solar daytime arbitrage"]', datetime('now'), datetime('now'))`,
        [societyId, societyId, societyId, societyId]
      );
    }

    // 6. Seed Energy Strategy Targets
    const existingTargets = queryOne<any>('SELECT id FROM energy_targets WHERE society_id = ?', [societyId]);
    if (!existingTargets) {
      const currentYear = new Date().getFullYear();
      execute(
        `INSERT INTO energy_targets (
           id, society_id, target_year, consumption_reduction_pct, cost_reduction_pct,
           renewable_contribution_pct, peak_demand_target_kw, notes, created_at
         ) VALUES 
         ('tgt-gv-01', ?, ?, 20, 18, 25, 95.0, 'Annual common area energy decarbonization and peak shaving strategy.', datetime('now')),
         ('tgt-gv-02', ?, ?, 25, 22, 35, 90.0, 'Phase 2 expansion with battery storage and water pump VFDs.', datetime('now'))`,
        [societyId, currentYear, societyId, currentYear + 1]
      );
    }

    console.log('Phase 5 optimization and distributed energy data successfully seeded.');
  } catch (err) {
    console.error('Failed to seed Phase 5 optimization data:', err);
  }
}

// If invoked directly via CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase();
}

