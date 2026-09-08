// Comprehensive Automated End-to-End Verification Test for WattWise
const BASE_URL = 'http://localhost:5000/api';

async function runE2ETests() {
  console.log('🚀 Starting WattWise Full-Stack Verification Suite...\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${msg}`);
    }
  }

  // 1. Health Check
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health: any = await healthRes.json();
  assert(health.status === 'healthy', 'Backend health check returns healthy');

  // 2. Demo Login - Society Admin
  const adminLoginRes = await fetch(`${BASE_URL}/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'admin' })
  });
  const adminAuth: any = await adminLoginRes.json();
  assert(adminAuth.user?.role === 'society_admin', 'Demo login returns society_admin persona');
  assert(adminAuth.society?.name === 'Green Valley Residency', 'Demo login associates with Green Valley Residency');

  const adminToken = adminAuth.token;
  const authHeaders = { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

  // 3. Analytics Calculation Verification (Exact formulas)
  const analyticsRes = await fetch(`${BASE_URL}/analytics`, { headers: authHeaders });
  const analytics: any = await analyticsRes.json();
  assert(analytics.currentMonth.period === '2026-03', 'Current billing cycle is 2026-03');
  assert(analytics.currentMonth.consumptionKwh === 18420, 'Current monthly consumption is exactly 18,420 kWh');
  assert(analytics.currentMonth.billAmount === 142380, 'Current monthly bill is exactly ₹1,42,380');
  assert(analytics.consumptionChangePercent === -4.1, 'Month-over-month consumption change is exactly -4.1%');
  assert(analytics.costPerApartment === 593, 'Average cost per apartment correctly calculated (₹142380 / 240 = ₹593)');
  assert(analytics.costPerKwh === 7.73, 'Cost per kWh correctly calculated (₹142380 / 18420 = ₹7.73)');
  assert(analytics.energyScore > 70, `WattWise score algorithm returned ${analytics.energyScore}/100`);

  // 4. Category-level Submeter Verification (No fabricated data)
  const categoryRes = await fetch(`${BASE_URL}/analytics/category-breakdown`, { headers: authHeaders });
  const categoryData: any = await categoryRes.json();
  assert(categoryData.available === true, 'Sub-meter data detected and category breakdown is available');
  assert(categoryData.categories.length >= 4, `Sub-meter categories returned: ${categoryData.categories.length}`);

  // 5. 4-Step Registration / Society Onboarding
  const testEmail = `rwa-${Date.now()}@palmmeadows.com`;
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ramesh Sundaram',
      email: testEmail,
      password: 'password123',
      phone: '+91 99000 11223',
      societyName: 'Palm Meadows Gated Community',
      location: 'Whitefield',
      city: 'Bengaluru',
      apartments: 180,
      buildings: 6,
      floors: 4,
      facilities: ['Water Pumps', 'Common Lighting', 'Clubhouse', 'Swimming Pool']
    })
  });
  const regData: any = await regRes.json();
  assert(regRes.status === 201, '4-Step Onboarding completed and returned 201 Created');
  assert(regData.society?.name === 'Palm Meadows Gated Community', 'New society created with verified name');
  assert(regData.society?.apartments === 180, 'Apartment count recorded');

  const newSocietyHeaders = { 'Authorization': `Bearer ${regData.token}`, 'Content-Type': 'application/json' };

  // 6. Manual Bill Entry for Newly Onboarded Society
  const newBillRes = await fetch(`${BASE_URL}/bills/manual`, {
    method: 'POST',
    headers: newSocietyHeaders,
    body: JSON.stringify({
      billing_period: '2026-03',
      units_kwh: 12500,
      bill_amount: 98500,
      fixed_charges: 12000,
      energy_charges: 86500,
      due_date: '2026-04-12',
      notes: 'First onboarded bill'
    })
  });
  const newBill: any = await newBillRes.json();
  assert(newBillRes.status === 201, 'Manual bill entered and validated for new society');
  assert(newBill.bill?.units_kwh === 12500, 'Units consumed persisted into database');

  // 7. AI Insight Generation
  const aiGenRes = await fetch(`${BASE_URL}/ai/generate`, {
    method: 'POST',
    headers: authHeaders
  });
  const aiInsight: any = await aiGenRes.json();
  assert(aiInsight.summary && aiInsight.summary.length > 10, 'AI generated structured summary');
  assert(Array.isArray(aiInsight.observations), 'AI output contains observations array');
  assert(Array.isArray(aiInsight.possible_causes), 'AI output contains possible causes with cautious language');
  assert(aiInsight.disclaimer.includes('available society data'), 'AI output carries mandatory safety disclaimer');

  // 8. Recommendations & Action Tracking Lifecycle
  const recsRes = await fetch(`${BASE_URL}/recommendations`, { headers: authHeaders });
  const recs: any = await recsRes.json();
  assert(recs.length >= 3, `Recommendations loaded: ${recs.length}`);
  const targetRec = recs[0];

  // Record action on recommendation
  const actionRes = await fetch(`${BASE_URL}/recommendations/${targetRec.id}/actions`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      action_taken: 'Replaced mechanical timer with digital astronomical relay on pumps',
      action_date: '2026-03-01',
      notes: 'Completed by maintenance engineer',
      before_consumption: 20200,
      after_consumption: 18420
    })
  });
  const actionData: any = await actionRes.json();
  assert(actionRes.status === 201, 'Action recorded successfully');
  assert(actionData.caveat.includes('Other factors may also have contributed'), 'Causality disclaimer enforced');

  // 9. Monthly Report Generation
  const reportRes = await fetch(`${BASE_URL}/reports/generate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ month: '2026-03' })
  });
  const reportData: any = await reportRes.json();
  assert(reportRes.status === 201, 'Monthly executive report generated');
  assert(reportData.reportData?.societyName === 'Green Valley Residency', 'Report branded for society');
  assert(reportData.reportData?.totalConsumptionKwh === 18420, 'Report contains verified consumption');

  // 10. Public Pilot Request Submission & Platform Admin Lead Triage
  const pilotSubmit = await fetch(`${BASE_URL}/pilots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Aditi Varma',
      society_name: 'Adarsh Palm Retreat RWA',
      email: 'aditi.v@adarsh.org',
      phone: '+91 98800 22334',
      city: 'Bengaluru',
      apartments: 500,
      message: 'Looking for 3-month free pilot for clubhouse and 12 pump rooms.'
    })
  });
  assert(pilotSubmit.status === 201, 'Public Free Pilot lead captured successfully');

  // Platform Admin login & inspection
  const platAdminRes = await fetch(`${BASE_URL}/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'platform_admin' })
  });
  const platAdmin: any = await platAdminRes.json();
  const platHeaders = { 'Authorization': `Bearer ${platAdmin.token}`, 'Content-Type': 'application/json' };

  const leadsRes = await fetch(`${BASE_URL}/admin/pilots`, { headers: platHeaders });
  const leads: any = await leadsRes.json();
  assert(leads.some((l: any) => l.name === 'Aditi Varma'), 'Platform Admin retrieved captured pilot lead');

  console.log(`\n🎉 Test Suite Completed: ${passed}/${total} assertions passed!`);
}

runE2ETests().catch(console.error);
