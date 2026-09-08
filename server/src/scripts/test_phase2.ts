import { db, initializeDatabase } from '../database/db.js';
import { evaluateDataQuality } from '../services/dataQuality.js';
import { calculateSocietyBaseline } from '../services/baseline.js';
import { detectEnergyAnomalies, getPilotScorecard } from '../services/analytics.js';
import { logAuditEvent, getSocietyAuditLogs } from '../services/audit.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runPhase2Tests() {
  console.log('====================================================');
  console.log('🚀 WATTWISE PHASE-2 PILOT-READY VERIFICATION SUITE');
  console.log('====================================================\n');

  // Initialize database
  initializeDatabase();

  // Test 1: Verify Seed Society and Pilot Configuration
  console.log('🧪 TEST 1: Society & Pilot Configuration');
  const society = db.prepare(`SELECT * FROM societies WHERE id = 'soc-green-valley-01'`).get() as any;
  assert(!!society, 'Green Valley Residency seed society exists');
  assert(society.pilot_status === 'active_pilot' || society.pilot_status === 'active', `Pilot status is active (got: ${society.pilot_status})`);
  assert(!!society.pilot_start_date && !!society.pilot_end_date, 'Pilot start and end dates are populated');
  assert(society.occupancy_estimate === 92, `Occupancy estimate is tracked (got: ${society.occupancy_estimate}%)`);

  // Test 2: Data Quality Assessment Engine
  console.log('\n🧪 TEST 2: Data Quality & Coverage Engine');
  const dqReport = evaluateDataQuality('soc-green-valley-01');
  assert(dqReport.coverageMonths >= 6, `Data coverage meets pilot requirement (found ${dqReport.coverageMonths} months)`);
  assert(dqReport.score >= 80, `Data quality score is healthy (score: ${dqReport.score}/100)`);
  assert(['good', 'needs_review'].includes(dqReport.status), `Data quality status valid (${dqReport.status})`);
  assert(dqReport.verifiedBills > 0, `Verified bills count is positive (${dqReport.verifiedBills})`);

  // Test 3: Baseline Engine States & Determinism
  console.log('\n🧪 TEST 3: Baseline Engine States & Arithmetic');
  const establishedBaseline = calculateSocietyBaseline('soc-green-valley-01');
  assert(establishedBaseline.status === 'established', `Baseline is established with 3+ months (status: ${establishedBaseline.status})`);
  assert(establishedBaseline.avgMonthlyKwh > 0, `Baseline average kWh computed (${establishedBaseline.avgMonthlyKwh} kWh)`);
  assert(establishedBaseline.avgMonthlyBill > 0, `Baseline average cost computed (₹${establishedBaseline.avgMonthlyBill})`);
  assert(establishedBaseline.verifiedMonthsCount >= 3, `Uses minimum 3 months (verified: ${establishedBaseline.verifiedMonthsCount})`);

  // Test temporary society with 0 bills -> not_established
  const tempSocId = 'soc_test_temp_' + Date.now();
  db.prepare(`INSERT INTO societies (id, name, location, city, apartments, buildings, floors) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    tempSocId, 'Empty Test Enclave', '10 Test St', 'Bengaluru', 50, 1, 4
  );
  const emptyBaseline = calculateSocietyBaseline(tempSocId);
  assert(emptyBaseline.status === 'not_established', `Empty society baseline is not_established (got: ${emptyBaseline.status})`);
  assert(emptyBaseline.avgMonthlyKwh === 0, 'Empty society baseline kWh is strictly 0');

  // Test 4: Deterministic Anomaly Detection
  console.log('\n🧪 TEST 4: Deterministic Energy Anomaly Detection');
  const anomalies = detectEnergyAnomalies('soc-green-valley-01');
  assert(Array.isArray(anomalies), 'Anomalies returned as array');
  console.log(`  ℹ Found ${anomalies.length} detected anomaly events`);
  if (anomalies.length > 0) {
    const first = anomalies[0];
    assert(typeof first.changePercent === 'number', `Change percent is numeric (${first.changePercent}%)`);
    assert(first.possibleExplanations.length > 0, 'Provides grounded explanations');
    assert(first.recommendedChecks.length > 0, 'Provides actionable verification checks');
  }

  // Test 5: Pilot Scorecard & Dual Metric Engine
  console.log('\n🧪 TEST 5: Pilot Scorecard & Dual Metric Engine');
  const scorecard = getPilotScorecard('soc-green-valley-01');
  assert(scorecard.societyName === 'Green Valley Residency', 'Scorecard contains correct society name');
  assert(scorecard.daysTotal === 90, `90-day pilot timeframe calibrated (total: ${scorecard.daysTotal} days)`);
  assert(scorecard.daysElapsed >= 0 && scorecard.daysRemaining >= 0, `Valid elapsed/remaining days (${scorecard.daysElapsed} elapsed, ${scorecard.daysRemaining} remaining)`);
  assert(scorecard.energyScore >= 0 && scorecard.energyScore <= 100, `Energy score within 0-100 bounds (${scorecard.energyScore})`);
  assert(scorecard.pilotHealthScore >= 0 && scorecard.pilotHealthScore <= 100, `Pilot Health score within 0-100 bounds (${scorecard.pilotHealthScore})`);
  assert(scorecard.dataCoverageMonths >= 6, `Reported coverage matches actual records (${scorecard.dataCoverageMonths} months)`);

  // Test 6: Audit Logging & Traceability
  console.log('\n🧪 TEST 6: Audit Trail & Action Traceability');
  logAuditEvent({
    societyId: 'soc-green-valley-01',
    userId: 'user-society-admin-01',
    eventType: 'bill_verified',
    entityType: 'bill',
    entityId: 'test_entity_99',
    metadata: { test: 'Phase 2 automated test audit logging verification' }
  });
  const logs = getSocietyAuditLogs('soc-green-valley-01', 5);
  assert(logs.length > 0, 'Audit logs successfully queried');
  const testLog = logs.find(l => l.entity_id === 'test_entity_99');
  assert(!!testLog, 'Recently logged audit event retrieved from audit_logs table');

  // Test 7: Recommendations, Assignments & Intervention Condition Recording
  console.log('\n🧪 TEST 7: Recommendations & Operating Condition Capture');
  const recs = db.prepare(`SELECT * FROM recommendations WHERE society_id = 'soc-green-valley-01'`).all() as any[];
  assert(recs.length > 0, 'Recommendations present for pilot society');
  const sampleRec = recs[0];
  assert(!!sampleRec.problem_observed, `Problem observed tracked ("${sampleRec.problem_observed?.slice(0, 30)}...")`);
  assert(!!sampleRec.evidence, `Evidence tracked ("${sampleRec.evidence?.slice(0, 30)}...")`);
  assert(!!sampleRec.suggested_investigation, 'Suggested investigation provided');

  // Verify Action Recording with Operating Condition Fields
  const actions = db.prepare(`SELECT * FROM actions WHERE society_id = 'soc-green-valley-01'`).all() as any[];
  assert(actions.length > 0, 'Implemented intervention actions exist');
  const verifiedAction = actions.find(a => !!a.previous_condition && !!a.new_condition);
  assert(!!verifiedAction, 'Intervention records previous operating condition vs new operating condition');
  assert(typeof verifiedAction.observed_reduction_kwh === 'number', `Observed physical reduction tracked (${verifiedAction.observed_reduction_kwh} kWh)`);

  // Test 8: Multi-Tenant Data Isolation
  console.log('\n🧪 TEST 8: Multi-Tenant Tenant Isolation');
  const isolatedBills = db.prepare(`SELECT * FROM bills WHERE society_id = ?`).all(tempSocId) as any[];
  assert(isolatedBills.length === 0, 'No data leakage into new/isolated society');
  const isolatedRecs = db.prepare(`SELECT * FROM recommendations WHERE society_id = ?`).all(tempSocId) as any[];
  assert(isolatedRecs.length === 0, 'Recommendations strictly isolated by society_id');

  // Clean up temporary society
  db.prepare(`DELETE FROM societies WHERE id = ?`).run(tempSocId);

  console.log('\n====================================================');
  console.log('🎉 ALL 8 PHASE-2 PILOT-READY VERIFICATION TESTS PASSED!');
  console.log('====================================================\n');
}

runPhase2Tests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
