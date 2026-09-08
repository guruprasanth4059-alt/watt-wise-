import { db, execute, query, queryOne } from '../database/db.js';
import { providerRegistry } from '../services/providers/registry.js';
import { connectMeterToProvider, syncMeterData } from '../services/ingestion.js';
import { evaluateIntervalAnomalies, getSocietyAnomalies } from '../services/intervalAnomalies.js';
import { calculateEstimatedRunningCost, saveSocietyTariff } from '../services/tariffEngine.js';
import { getDataReconciliation, getNearRealTimeEnergySummary } from '../services/analytics.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

async function runPhase3Tests() {
  console.log('====================================================');
  console.log('🚀 WATTWISE PHASE 3 AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  // Test 1: Provider Registry & Simulated Adapter
  console.log('--- Test 1: Provider Architecture & Data Adapter ---');
  const providers = providerRegistry.getAll();
  assert(providers.length >= 1, 'Provider registry contains at least 1 provider');
  
  const simProvider = providerRegistry.get('simulated');
  assert(!!simProvider, 'Simulated smart meter provider is registered');

  const testStart = new Date(Date.now() - 2 * 3600 * 1000); // 2 hours ago
  const testEnd = new Date();
  const sampleData = await simProvider.fetchMeasurements({
    externalMeterId: 'P3-TEST-MAIN',
    from: testStart.toISOString(),
    to: testEnd.toISOString(),
    resolutionMinutes: 15
  });

  assert(sampleData.length >= 7, `Generated 15-min intervals: got ${sampleData.length}`);
  const firstSample = sampleData[0];
  assert(firstSample.energy_kwh > 0, `Sample energy_kwh > 0 (${firstSample.energy_kwh} kWh)`);
  assert(firstSample.demand_kw !== undefined && firstSample.demand_kw! > 0, `Active power demand_kw present (${firstSample.demand_kw} kW)`);
  assert(firstSample.voltage !== undefined && firstSample.voltage! >= 220 && firstSample.voltage! <= 245, `Voltage nominal 230V ±5% (${firstSample.voltage}V)`);
  assert(firstSample.power_factor !== undefined && firstSample.power_factor! >= 0.85 && firstSample.power_factor! <= 1.0, `Power factor realistic (${firstSample.power_factor})`);
  assert(firstSample.frequency !== undefined && firstSample.frequency! >= 49.5 && firstSample.frequency! <= 50.5, `Grid frequency nominal ~50Hz (${firstSample.frequency}Hz)`);

  // Test 2: Ingestion Service & Idempotency (Zero Duplicates)
  console.log('\n--- Test 2: Ingestion Service & Idempotency ---');
  const testSocietyId = 'test-soc-phase3';
  const testMeterId = 'test-meter-phase3';

  // Create test society and test meter
  execute(`
    INSERT OR IGNORE INTO societies (id, name, location, city, apartments, buildings, timezone)
    VALUES (?, 'Test Society Phase 3', 'Indiranagar', 'Bengaluru', 50, 2, 'Asia/Kolkata')
  `, [testSocietyId]);

  execute(`
    INSERT OR REPLACE INTO meters (id, society_id, name, meter_number, type, category, building, is_active, data_source, connection_status)
    VALUES (?, ?, 'Phase 3 Test Pump Meter', 'P3-TEST-MTR-01', 'pump', 'pump', 'Block A', 1, 'smart_meter', 'disconnected')
  `, [testMeterId, testSocietyId]);

  // Clean test measurements if any
  execute(`DELETE FROM meter_measurements WHERE meter_id = ?`, [testMeterId]);
  execute(`DELETE FROM anomalies WHERE meter_id = ?`, [testMeterId]);
  execute(`DELETE FROM meter_connections WHERE meter_id = ?`, [testMeterId]);

  // Connect meter to simulated provider
  const conn = await connectMeterToProvider({
    societyId: testSocietyId,
    meterId: testMeterId,
    providerId: 'simulated',
    externalMeterId: 'SIM-PUMP-01',
    userId: 'usr-tester'
  });
  assert(conn.status === 'connected', 'Meter connected to simulated provider successfully');

  // Run first sync (ingests last 1 day of 15-min intervals)
  const syncRes1 = await syncMeterData({
    societyId: testSocietyId,
    meterId: testMeterId,
    daysBack: 1,
    userId: 'usr-tester'
  });
  assert(syncRes1.success === true, `First sync succeeded with ${syncRes1.recordsIngested} records ingested`);
  assert(syncRes1.recordsIngested > 0, `Sync ingested at least 1 record (${syncRes1.recordsIngested})`);

  const initialCountRow = queryOne<{ count: number }>(
    `SELECT count(*) as count FROM meter_measurements WHERE meter_id = ?`,
    [testMeterId]
  );
  const initialCount = initialCountRow?.count || 0;
  assert(initialCount > 0, `Database has ${initialCount} measurements stored`);

  // Run second sync over the same time window (IDEMPOTENCY VERIFICATION)
  const syncRes2 = await syncMeterData({
    societyId: testSocietyId,
    meterId: testMeterId,
    daysBack: 1,
    userId: 'usr-tester'
  });
  assert(syncRes2.success === true, 'Second sync completed successfully');

  const afterSecondSyncRow = queryOne<{ count: number }>(
    `SELECT count(*) as count FROM meter_measurements WHERE meter_id = ?`,
    [testMeterId]
  );
  assert(
    afterSecondSyncRow?.count === initialCount,
    `Idempotency verified: measurement count remained exactly ${initialCount} with 0 duplicate records created`
  );

  // Test 3: Deterministic Interval Anomaly Engine
  console.log('\n--- Test 3: Deterministic Interval Anomaly Detection ---');
  
  // Clean anomalies and measurements for clean test
  execute(`DELETE FROM anomalies WHERE society_id = ?`, [testSocietyId]);
  execute(`DELETE FROM meter_measurements WHERE meter_id = ?`, [testMeterId]);

  // Insert an intentional overnight surge reading into meter_measurements (Hour 02:00 AM)
  const overnightDate = new Date();
  overnightDate.setHours(2, 30, 0, 0);
  execute(
    `INSERT OR REPLACE INTO meter_measurements (id, society_id, meter_id, timestamp, energy_kwh, demand_kw, source, quality_status)
     VALUES ('test-meas-surge', ?, ?, ?, 6.8, 27.2, 'smart_meter', 'valid')`,
    [testSocietyId, testMeterId, overnightDate.toISOString()]
  );

  const evalResult = evaluateIntervalAnomalies(testSocietyId, testMeterId);
  assert(evalResult.newAnomaliesCount > 0, `Interval anomaly evaluation detected abnormal event (count=${evalResult.newAnomaliesCount})`);

  const anomalies = getSocietyAnomalies(testSocietyId);
  const surgeAnomaly = anomalies.find(a => a.type === 'unexpected_overnight' || a.type === 'consumption_spike');
  assert(!!surgeAnomaly, `Detected anomaly type is valid (${surgeAnomaly?.type})`);
  assert(surgeAnomaly?.severity === 'high' || surgeAnomaly?.severity === 'critical', `Flagged with high/critical severity (${surgeAnomaly?.severity})`);

  // Test 4: Alert Fatigue Suppression (Grouping Consecutive Intervals)
  console.log('\n--- Test 4: Alert Fatigue Suppression ---');
  
  // Insert 4 more consecutive abnormal intervals (15 mins apart)
  for (let i = 1; i <= 4; i++) {
    const t = new Date(overnightDate.getTime() + i * 15 * 60 * 1000);
    execute(
      `INSERT OR REPLACE INTO meter_measurements (id, society_id, meter_id, timestamp, energy_kwh, demand_kw, source, quality_status)
       VALUES (?, ?, ?, ?, 6.5, 26.0, 'smart_meter', 'valid')`,
      [`test-meas-consec-${i}`, testSocietyId, testMeterId, t.toISOString()]
    );
  }

  // Re-evaluate
  const reEvalResult = evaluateIntervalAnomalies(testSocietyId, testMeterId);
  const activeAnomalies = getSocietyAnomalies(testSocietyId, 'new');
  assert(
    activeAnomalies.length === 1,
    `Alert fatigue suppression verified: 5 consecutive abnormal readings collapsed into 1 ongoing anomaly session (active anomalies count = ${activeAnomalies.length})`
  );

  // Test 5: Tariff Engine Calculations
  console.log('\n--- Test 5: Tariff Engine (Slab & Estimated Cost) ---');
  saveSocietyTariff({
    societyId: testSocietyId,
    name: 'BESCOM LT-2 Test Tariff',
    rateType: 'slab',
    ratePerKwh: 7.5,
    configuration: {
      slabs: [
        { upTo: 50, rate: 4.15 },
        { upTo: 100, rate: 5.60 },
        { upTo: Infinity, rate: 7.15 }
      ]
    }
  });

  // For 120 kWh:
  // First 50 kWh @ 4.15 = 207.5
  // Next 50 kWh (50-100) @ 5.60 = 280.0
  // Next 20 kWh (>100) @ 7.15 = 143.0
  // Total Energy Charges = 630.5 => Math.round(630.5) = 631
  const costResult = calculateEstimatedRunningCost(120, testSocietyId);
  assert(costResult.cost === 631, `Slab tariff computed correctly: expected ₹631, got ₹${costResult.cost}`);
  assert(costResult.isEstimated === true, 'Tariff result clearly flags isEstimated = true');

  // Test 6: Data Reconciliation & Near-Real-Time Summary
  console.log('\n--- Test 6: Data Reconciliation & Near-Real-Time Analytics ---');
  
  // Insert a test bill for reconciliation
  const testBillPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  execute(`
    INSERT OR REPLACE INTO bills (id, society_id, meter_id, billing_period, units_kwh, bill_amount, fixed_charges, energy_charges, other_charges, verified, verification_status)
    VALUES ('test-recon-bill', ?, ?, ?, 100.0, 800.0, 100.0, 700.0, 0.0, 1, 'verified')
  `, [testSocietyId, testMeterId, testBillPeriod]);

  const recon = getDataReconciliation(testSocietyId);
  assert(recon !== null, 'Data reconciliation service returned result');
  assert(typeof recon.differencePercent === 'number', `Reconciliation variance computed: ${recon.differencePercent}%`);
  assert(recon.reconciliationStatus === 'matched' || recon.reconciliationStatus === 'review_needed', `Reconciliation status categorized correctly: ${recon.reconciliationStatus}`);

  const rtSummary = getNearRealTimeEnergySummary(testSocietyId);
  assert(rtSummary !== null, 'Near-real-time summary returned');
  assert(rtSummary.timeOfDay !== undefined, 'Time of Day distribution included');
  assert(rtSummary.loadProfile.length === 24, `24-hour diurnal profile has 24 hourly bins (got ${rtSummary.loadProfile.length})`);

  // Test 7: Multi-Tenant Data Isolation
  console.log('\n--- Test 7: Multi-Tenant Isolation ---');
  const otherSocietyId = 'other-soc-404';
  const otherAnomalies = getSocietyAnomalies(otherSocietyId);
  assert(otherAnomalies.length === 0, `Multi-tenant isolation verified: other society cannot access test society anomalies (got ${otherAnomalies.length})`);

  // Cleanup test artifacts
  execute(`DELETE FROM anomalies WHERE society_id = ?`, [testSocietyId]);
  execute(`DELETE FROM meter_measurements WHERE meter_id = ?`, [testMeterId]);
  execute(`DELETE FROM meter_connections WHERE meter_id = ?`, [testMeterId]);
  execute(`DELETE FROM bills WHERE society_id = ?`, [testSocietyId]);
  execute(`DELETE FROM meters WHERE id = ?`, [testMeterId]);
  execute(`DELETE FROM societies WHERE id = ?`, [testSocietyId]);

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3Tests().catch((err) => {
  console.error('Fatal error in Phase 3 test suite:', err);
  process.exit(1);
});
