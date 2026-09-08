import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, initializeDatabase, execute, queryOne } from './db.js';

export function seedDatabase() {
  initializeDatabase();

  // Check if Green Valley already exists
  const existingSociety = queryOne('SELECT id FROM societies WHERE name = ?', ['Green Valley Residency']);
  if (existingSociety) {
    console.log('Database already seeded. Skipping initial seed.');
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

  console.log('Seed completed successfully! Demo data is ready.');
}

// If invoked directly via CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase();
}
