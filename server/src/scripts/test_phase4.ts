import { query, queryOne } from '../database/db.js';
import { generateSocietyForecast, getForecastAccuracyMetrics } from '../services/forecasting/forecastingEngine.js';
import { evaluatePredictiveAnomalies } from '../services/predictiveAnomalies.js';
import { generateOpportunities, convertOpportunityToRecommendation } from '../services/opportunities.js';
import { runScenarioSimulation, getScenarioHistory } from '../services/scenarios.js';
import { getEquipmentHealthSignals } from '../services/equipmentHealth.js';
import { getSocietyBenchmarks } from '../services/benchmarking.js';
import { askEnergyCopilot } from '../services/copilot.js';
import { generateCommitteeBriefing } from '../services/committee.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${details ? ` - ${details}` : ''}`);
    failed++;
  }
}

async function runPhase4Tests() {
  console.log('\n=============================================================');
  console.log('       WATTWISE PHASE 4 PREDICTIVE INTELLIGENCE TEST SUITE   ');
  console.log('=============================================================\n');

  // Find Green Valley Residency
  const society = queryOne<any>('SELECT * FROM societies WHERE name = ?', ['Green Valley Residency']);
  if (!society) {
    console.error('Green Valley Residency not found. Run seed script first.');
    process.exit(1);
  }
  const societyId = society.id;

  // -------------------------------------------------------------
  // TEST 1: Forecasting Engine & Model Calibration
  // -------------------------------------------------------------
  console.log('\n--- 1. Forecasting Engine & Accuracy Metrics ---');
  try {
    const forecast = await generateSocietyForecast(societyId);
    assert(forecast.status === 'ready', 'Forecast generated successfully with status "ready"');
    assert(forecast.expectedMonthlyKwh > 0, `Expected monthly kWh is positive (${forecast.expectedMonthlyKwh} kWh)`);
    assert(forecast.expectedMonthlyCost > 0, `Expected monthly cost is positive (₹${forecast.expectedMonthlyCost})`);
    assert(forecast.rangeMinKwh < forecast.expectedMonthlyKwh, 'Deterministic range min is less than expected kWh');
    assert(forecast.rangeMaxKwh > forecast.expectedMonthlyKwh, 'Deterministic range max is greater than expected kWh');
    assert(forecast.dailyPredictions.length === 7, 'Generates 7 daily predictions for the week ahead');
    assert(['moving_avg', 'seasonal_baseline', 'trend_aware', 'ml_regression'].includes(forecast.modelType), `Model selected: ${forecast.modelType}`);

    // Verify accuracy metrics calculation
    const accuracy = getForecastAccuracyMetrics(societyId);
    assert(Array.isArray(accuracy), 'Accuracy metrics returned as an array');
    console.log(`     Model: ${forecast.modelType} | Horizon: 30d | Confidence: ${forecast.confidence}`);
  } catch (err: any) {
    assert(false, 'Forecasting engine threw error', err.message);
  }

  // -------------------------------------------------------------
  // TEST 2: Peak Demand Forecasting
  // -------------------------------------------------------------
  console.log('\n--- 2. Peak-Demand Risk Forecasting ---');
  try {
    const forecast = await generateSocietyForecast(societyId);
    const peak = forecast.peakForecast;
    assert(peak.expectedPeakKw > 0, `Expected peak demand calculated (${peak.expectedPeakKw} kW)`);
    assert(typeof peak.likelyTimeWindow === 'string' && peak.likelyTimeWindow.length > 0, `Likely peak window identified: ${peak.likelyTimeWindow}`);
    assert(['low', 'medium', 'high'].includes(peak.riskLevel), `Peak risk level categorized: ${peak.riskLevel}`);
    assert(Array.isArray(peak.potentialDrivers) && peak.potentialDrivers.length > 0, 'Potential peak drivers identified');
  } catch (err: any) {
    assert(false, 'Peak demand forecasting threw error', err.message);
  }

  // -------------------------------------------------------------
  // TEST 3: Predictive Anomaly Detection (Leading Indicators)
  // -------------------------------------------------------------
  console.log('\n--- 3. Predictive Anomaly Detection (Leading Indicators) ---');
  try {
    const anomalies = evaluatePredictiveAnomalies(societyId);
    assert(Array.isArray(anomalies) && anomalies.length > 0, `Detected ${anomalies.length} predictive anomaly patterns`);
    const baseloadAnomaly = anomalies.find(a => a.pattern_type === 'baseload_creep');
    assert(!!baseloadAnomaly, 'Detected baseload creep leading indicator');
    if (baseloadAnomaly) {
      assert(baseloadAnomaly.observed_change.toLowerCase().includes('creep') || baseloadAnomaly.observed_change.toLowerCase().includes('baseload'), 'Observed change describes baseload pattern');
      assert(baseloadAnomaly.expected_future_impact.length > 0, 'Expected future financial impact documented');
      assert(baseloadAnomaly.recommended_action.length > 0, 'Recommended preventive action provided');
    }
  } catch (err: any) {
    assert(false, 'Predictive anomaly detection threw error', err.message);
  }

  // -------------------------------------------------------------
  // TEST 4: Energy Opportunity Engine & Conversion
  // -------------------------------------------------------------
  console.log('\n--- 4. Energy Opportunity Engine & Conversion ---');
  try {
    const opps = generateOpportunities(societyId);
    assert(Array.isArray(opps) && opps.length > 0, `Generated ${opps.length} prioritized energy opportunities`);
    
    // Check categories
    const categories = new Set(opps.map(o => o.category));
    assert(categories.has('water_pumps') || categories.has('lighting'), 'Opportunities include water pumps or lighting');
    
    // Check deterministic financials
    const sampleOpp = opps[0];
    assert(sampleOpp.estimated_impact_inr > 0, `Opportunity financial impact calculated (₹${sampleOpp.estimated_impact_inr}/mo)`);
    assert(sampleOpp.estimated_impact_kwh > 0, `Opportunity energy impact calculated (${sampleOpp.estimated_impact_kwh} kWh/mo)`);
    assert(sampleOpp.evidence.length > 0, 'Deterministic analytical evidence provided');

    // Test conversion of opportunity to recommendation
    const rec = convertOpportunityToRecommendation(sampleOpp.id, societyId, 'test-admin');
    assert(rec.title === sampleOpp.title, 'Converted opportunity title matches');
    assert(rec.society_id === societyId, 'Converted recommendation assigned to correct society');
  } catch (err: any) {
    assert(false, 'Energy opportunity engine threw error', err.message);
  }

  // -------------------------------------------------------------
  // TEST 5: Deterministic What-If Scenario Simulator
  // -------------------------------------------------------------
  console.log('\n--- 5. Deterministic What-If Scenario Simulations ---');
  try {
    // 5A: Pump Scheduling Simulation
    const pumpSim = runScenarioSimulation(societyId, {
      title: 'Water Pump Optimization',
      scenarioType: 'pump_schedule',
      parameters: {
        pumpKwRating: 11.2,
        hoursReducedPerDay: 2.0,
        capitalCostInr: 15000
      }
    });
    // Expected math: 2.0 hrs * 11.2 kW * 30 days = 672 kWh
    assert(pumpSim.estimated_kwh_monthly === 672, `Pump sim kWh matches physics formula (${pumpSim.estimated_kwh_monthly} kWh)`);
    assert(pumpSim.estimated_cost_monthly > 0, `Pump sim monthly savings positive (₹${pumpSim.estimated_cost_monthly})`);
    assert(pumpSim.payback_months !== null && pumpSim.payback_months > 0, `Payback period calculated (${pumpSim.payback_months} months)`);

    // 5B: LED Retrofit Simulation
    const ledSim = runScenarioSimulation(societyId, {
      title: 'Basement LED Retrofit',
      scenarioType: 'led_retrofit',
      parameters: {
        fixtureCount: 100,
        oldWattage: 36,
        newWattage: 18,
        operatingHoursPerDay: 12,
        fixtureCostEach: 400
      }
    });
    // Expected math: ((36 - 18) * 100 / 1000) * 12 * 30 = 648 kWh
    assert(ledSim.estimated_kwh_monthly === 648, `LED retrofit kWh matches formula (${ledSim.estimated_kwh_monthly} kWh)`);

    // 5C: History ledger
    const history = getScenarioHistory(societyId);
    assert(history.length >= 2, `Scenario runs persisted in database (found ${history.length} runs)`);
  } catch (err: any) {
    assert(false, 'Scenario simulation threw error', err.message);
  }

  // -------------------------------------------------------------
  // TEST 6: Non-Invasive Equipment Health Telemetry Signals
  // -------------------------------------------------------------
  console.log('\n--- 6. Non-Invasive Equipment Health Signals ---');
  try {
    const signals = getEquipmentHealthSignals(societyId);
    assert(Array.isArray(signals) && signals.length > 0, `Generated ${signals.length} equipment health signals`);
    const signal = signals[0];
    assert(typeof signal.disclaimer === 'string' && signal.disclaimer.includes('proxy'), 'Health signal includes explicit non-invasive proxy disclaimer');
    assert(signal.recommendation.length > 0, 'Health signal provides preventive inspection recommendation');
  } catch (err: any) {
    assert(false, 'Equipment health signals threw error', err.message);
  }

  // -------------------------------------------------------------
  // TEST 7: Advanced Privacy-Preserving Benchmarking
  // -------------------------------------------------------------
  console.log('\n--- 7. Privacy-Preserving Cohort Benchmarking ---');
  try {
    const benchmark = getSocietyBenchmarks(societyId);
    assert(typeof benchmark.status === 'string', 'Benchmark evaluation returned valid status');
    // If cohort size is < 3, must return unavailable status with ZERO fabricated percentiles
    if (benchmark.cohortSize < 3) {
      assert(benchmark.status === 'unavailable', 'Correctly falls back to "unavailable" when cohort < 3');
      assert(benchmark.societyMetrics.kwhPerApartment === 0, 'Never fabricates benchmark metrics');
    } else {
      assert(benchmark.status === 'available', 'Cohort benchmark available when >= 3 societies in cohort');
    }
  } catch (err: any) {
    assert(false, 'Benchmarking threw error', err.message);
  }

  // -------------------------------------------------------------
  // TEST 8: AI Energy Copilot RAG Grounding & Structured Response
  // -------------------------------------------------------------
  console.log('\n--- 8. AI Energy Copilot RAG Grounding ---');
  try {
    const copilotReply = await askEnergyCopilot(
      societyId,
      'Why is our electricity bill high and what can we do about our water pumps?'
    );
    assert(copilotReply.role === 'assistant', 'Copilot returns assistant response');
    assert(copilotReply.content.length > 20, 'Copilot generated substantive grounded content');
    assert(Array.isArray(copilotReply.evidence), 'Copilot response contains structured evidence items');
    assert(Array.isArray(copilotReply.recommended_actions), 'Copilot response contains recommended actions');
    assert(Array.isArray(copilotReply.links), 'Copilot response contains deep links');
  } catch (err: any) {
    assert(false, 'AI Energy Copilot threw error', err.message);
  }

  // -------------------------------------------------------------
  // TEST 9: Management Committee Decision Support Briefing
  // -------------------------------------------------------------
  console.log('\n--- 9. Management Committee Decision Pack ---');
  try {
    const briefing = await generateCommitteeBriefing(societyId, 'test-admin');
    assert(typeof briefing.meetingMonth === 'string', `Briefing generated for month: ${briefing.meetingMonth}`);
    assert(Array.isArray(briefing.topIssues) && briefing.topIssues.length <= 5, `Top issues condensed to max 5 (found ${briefing.topIssues.length})`);
    assert(Array.isArray(briefing.topOpportunities) && briefing.topOpportunities.length <= 5, `Top opportunities condensed to max 5 (found ${briefing.topOpportunities.length})`);
    assert(briefing.financialImpact.forecastedMonthEnd > 0, `Financial outlook includes forecasted month-end bill (₹${briefing.financialImpact.forecastedMonthEnd})`);
    assert(briefing.actionItems.length > 0, `Includes governance action items (found ${briefing.actionItems.length})`);
    assert(briefing.executiveBriefing.length > 50, 'Includes synthesized executive committee memo');
  } catch (err: any) {
    assert(false, 'Committee briefing threw error', err.message);
  }

  // -------------------------------------------------------------
  // TEST 10: Multi-Tenant Isolation
  // -------------------------------------------------------------
  console.log('\n--- 10. Strict Multi-Tenant Isolation ---');
  try {
    const otherSocietyForecast = await generateSocietyForecast('non-existent-society-uuid');
    assert(otherSocietyForecast.status === 'insufficient_data', 'Other / non-existent society safely receives "insufficient_data"');
  } catch (err: any) {
    assert(false, 'Multi-tenant isolation threw error', err.message);
  }

  // Summary
  console.log('\n=============================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4Tests().catch(err => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
