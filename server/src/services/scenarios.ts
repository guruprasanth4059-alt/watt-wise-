import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../database/db.js';
import { ScenarioSimulation } from '../types/index.js';
import { getActiveSocietyTariff } from './tariffEngine.js';

export interface ScenarioInput {
  title: string;
  scenarioType: 'pump_schedule' | 'led_retrofit' | 'solar_offset' | 'tariff_shift';
  parameters: Record<string, any>;
  userId?: string;
}

export function runScenarioSimulation(
  societyId: string,
  input: ScenarioInput
): ScenarioSimulation {
  const tariff = getActiveSocietyTariff(societyId);
  const rate = tariff?.rate_per_kwh || 8.0;

  let estimatedKwhMonthly = 0;
  let estimatedCostMonthly = 0;
  let paybackMonths: number | null = null;
  let confidence: 'low' | 'medium' | 'high' = 'medium';
  let notes = '';

  switch (input.scenarioType) {
    case 'pump_schedule': {
      // Inputs: hoursReducedPerDay (e.g. 1.0), pumpKwRating (e.g. 11.2 kW), capitalCostInr (optional, e.g. 15000 for automation controller)
      const hoursReduced = Number(input.parameters.hoursReducedPerDay || 1.0);
      const pumpKw = Number(input.parameters.pumpKwRating || 11.2);
      const capitalCost = Number(input.parameters.capitalCostInr || 0);

      // Deterministic calculation: hours/day * kW * 30 days
      estimatedKwhMonthly = Math.round(hoursReduced * pumpKw * 30);
      estimatedCostMonthly = Math.round(estimatedKwhMonthly * rate);
      if (capitalCost > 0 && estimatedCostMonthly > 0) {
        paybackMonths = Math.round((capitalCost / estimatedCostMonthly) * 10) / 10;
      }
      confidence = 'high';
      notes = `Reducing pump runtime by ${hoursReduced}h/day on an ${pumpKw} kW motor saves ~${estimatedKwhMonthly} kWh monthly.`;
      break;
    }

    case 'led_retrofit': {
      // Inputs: fixtureCount (e.g. 120), oldWattage (e.g. 36W), newWattage (e.g. 18W), operatingHoursPerDay (e.g. 18), fixtureCostEach (e.g. 450)
      const count = Number(input.parameters.fixtureCount || 100);
      const oldW = Number(input.parameters.oldWattage || 36);
      const newW = Number(input.parameters.newWattage || 18);
      const hrs = Number(input.parameters.operatingHoursPerDay || 18);
      const fixtureCost = Number(input.parameters.fixtureCostEach || 450);

      const deltaKw = ((oldW - newW) * count) / 1000;
      estimatedKwhMonthly = Math.round(deltaKw * hrs * 30);
      estimatedCostMonthly = Math.round(estimatedKwhMonthly * rate);
      const totalCapex = count * fixtureCost;
      if (totalCapex > 0 && estimatedCostMonthly > 0) {
        paybackMonths = Math.round((totalCapex / estimatedCostMonthly) * 10) / 10;
      }
      confidence = 'high';
      notes = `Replacing ${count} fixtures (${oldW}W → ${newW}W, ${hrs}h/day) yields ~${estimatedKwhMonthly} kWh reduction.`;
      break;
    }

    case 'solar_offset': {
      // Inputs: systemCapacityKwp (e.g. 20 kWp), capexPerKwp (e.g. 48000), solarDailyGenerationRatio (default 4.1 kWh/kWp/day)
      const capacityKwp = Number(input.parameters.systemCapacityKwp || 20);
      const capexPerKwp = Number(input.parameters.capexPerKwp || 48000);
      const dailyRatio = Number(input.parameters.solarDailyGenerationRatio || 4.1);

      // Standard Indian solar rooftop yield: ~4.1 to 4.3 kWh per kWp installed
      estimatedKwhMonthly = Math.round(capacityKwp * dailyRatio * 30);
      estimatedCostMonthly = Math.round(estimatedKwhMonthly * rate);
      const capexTotal = capacityKwp * capexPerKwp;
      if (capexTotal > 0 && estimatedCostMonthly > 0) {
        paybackMonths = Math.round((capexTotal / estimatedCostMonthly) * 10) / 10;
      }
      confidence = 'medium';
      notes = `A ${capacityKwp} kWp rooftop solar PV plant offsets ~${estimatedKwhMonthly} kWh of common-area utility demand per month.`;
      break;
    }

    case 'tariff_shift': {
      // Inputs: shiftedKwhMonthly (e.g. 1500), peakSurchargePerKwh (e.g. 2.50)
      const shiftedKwh = Number(input.parameters.shiftedKwhMonthly || 1500);
      const surcharge = Number(input.parameters.peakSurchargePerKwh || 2.50);

      estimatedKwhMonthly = 0; // Net kWh remains identical; savings stem from rate differential
      estimatedCostMonthly = Math.round(shiftedKwh * surcharge);
      confidence = 'high';
      notes = `Shifting ${shiftedKwh} kWh/month out of the peak tariff surcharge slot avoids ~₹${estimatedCostMonthly}/month in peak discom tariffs.`;
      break;
    }

    default:
      throw new Error(`Unsupported scenario type: ${input.scenarioType}`);
  }

  const scenarioId = `scen-${uuidv4().slice(0, 8)}`;
  execute(
    `INSERT INTO scenario_runs (id, society_id, user_id, title, scenario_type, parameters, estimated_kwh_monthly, estimated_cost_monthly, payback_months, confidence, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      scenarioId,
      societyId,
      input.userId || null,
      input.title,
      input.scenarioType,
      JSON.stringify(input.parameters || {}),
      estimatedKwhMonthly,
      estimatedCostMonthly,
      paybackMonths,
      confidence,
      notes
    ]
  );

  return queryOne<ScenarioSimulation>(`SELECT * FROM scenario_runs WHERE id = ?`, [scenarioId])!;
}

export function getScenarioHistory(societyId: string): ScenarioSimulation[] {
  const rows = query<any>(
    `SELECT * FROM scenario_runs WHERE society_id = ? ORDER BY created_at DESC LIMIT 20`,
    [societyId]
  );

  return rows.map(r => ({
    id: r.id,
    society_id: r.society_id,
    user_id: r.user_id,
    title: r.title,
    scenario_type: r.scenario_type,
    parameters: typeof r.parameters === 'string' ? JSON.parse(r.parameters || '{}') : r.parameters,
    estimated_kwh_monthly: r.estimated_kwh_monthly,
    estimated_cost_monthly: r.estimated_cost_monthly,
    payback_months: r.payback_months,
    confidence: r.confidence,
    notes: r.notes,
    created_at: r.created_at
  }));
}
