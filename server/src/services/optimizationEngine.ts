import { query, queryOne } from '../database/db.js';
import { PeakManagementOverview } from '../types/index.js';

export function getPeakManagementOverview(
  societyId: string
): PeakManagementOverview & {
  sanctionedLoadKw: number;
  recordedPeakKw: number;
  headroomKw: number;
  potentialShavedKw: number;
  annualDemandSavingsInr: number;
  annualToUSavingsInr: number;
  totalAnnualSavingsInr: number;
  penaltyRiskAnnualInr: number;
  strategies: any[];
  disclaimer: string;
} {
  const society = queryOne<any>(
    `SELECT sanctioned_load_kw, name FROM societies WHERE id = ?`,
    [societyId]
  );
  const contractedThresholdKw = society?.sanctioned_load_kw || 120;

  const maxReading = queryOne<any>(
    `SELECT MAX(demand_kw) as max_kw 
     FROM meter_measurements 
     WHERE society_id = ? AND timestamp >= datetime('now', '-30 days')`,
    [societyId]
  );
  const historicalPeakKw = maxReading?.max_kw ? Math.round(maxReading.max_kw * 10) / 10 : 98.4;

  const currentReading = queryOne<any>(
    `SELECT demand_kw FROM meter_measurements 
     WHERE society_id = ? 
     ORDER BY timestamp DESC LIMIT 1`,
    [societyId]
  );
  const currentDemandKw = currentReading?.demand_kw ? Math.round(currentReading.demand_kw * 10) / 10 : 74.2;
  const forecastPeakKw = Math.round(historicalPeakKw * 1.05 * 10) / 10;

  const peakUtilization = historicalPeakKw / contractedThresholdKw;
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (peakUtilization >= 0.95) riskLevel = 'critical';
  else if (peakUtilization >= 0.85) riskLevel = 'high';
  else if (peakUtilization >= 0.7) riskLevel = 'medium';

  const majorContributors = [
    { name: 'Water Sump & Booster Pumps', loadKw: 26.2, percentage: 27 },
    { name: 'EV Charging Bay', loadKw: 22.0, percentage: 22 },
    { name: 'Passenger Elevators (4x)', loadKw: 18.0, percentage: 18 },
    { name: 'Common Area Lighting', loadKw: 14.0, percentage: 14 },
    { name: 'STP Aeration & Clubhouse', loadKw: 18.2, percentage: 19 }
  ];

  const preventionRecommendations = [
    'Automate water transfer pumping strictly outside the 18:00 - 22:00 peak tariff window.',
    'Enable smart EV charger throttling when community demand exceeds 96 kW (80% load).',
    'Stagger STP aeration blower cycles to avoid coinciding with evening lift and lighting surges.'
  ];

  const headroomKw = Math.round((contractedThresholdKw - historicalPeakKw) * 10) / 10;
  const potentialShavedKw = 16.5;
  const annualDemandSavingsInr = Math.round(potentialShavedKw * 300 * 12);
  const annualToUSavingsInr = Math.round(potentialShavedKw * 4 * 3.5 * 365);
  const totalAnnualSavingsInr = annualDemandSavingsInr + annualToUSavingsInr;
  const penaltyRiskAnnualInr = riskLevel === 'high' || riskLevel === 'critical' ? 65000 : 0;

  const strategies = [
    {
      id: 'strat-pumps',
      title: 'Hydro-Pneumatic & Overhead Tank Pump Staggering',
      targetAssetType: 'pump',
      action: 'Shift primary tank filling cycles to 11:00–15:00 (solar generation window) and 03:00–06:00 (night off-peak). Lock out non-emergency booster pumping between 18:00–21:30.',
      peakReductionKw: 10.5,
      annualSavingsInr: Math.round(10.5 * 300 * 12 + 10.5 * 3.5 * 4 * 365),
      implementationComplexity: 'Low (Timer / Smart Switch setup)'
    },
    {
      id: 'strat-ev-throttle',
      title: 'EV Charging Peak Demand Curtailment',
      targetAssetType: 'ev_charger',
      action: 'Throttle or pause community EV charging when society demand exceeds 80% of sanctioned load (96 kW). Incentivize scheduled night charging via smart app.',
      peakReductionKw: 6.0,
      annualSavingsInr: Math.round(6.0 * 300 * 12 + 6.0 * 2.5 * 4 * 365),
      implementationComplexity: 'Medium (OCPP Load Management rule)'
    }
  ];

  return {
    currentDemandKw,
    historicalPeakKw,
    forecastPeakKw,
    contractedThresholdKw,
    riskLevel,
    peakWindow: '18:30 - 21:45 IST',
    majorContributors,
    preventionRecommendations,
    sanctionedLoadKw: contractedThresholdKw,
    recordedPeakKw: historicalPeakKw,
    headroomKw,
    potentialShavedKw,
    annualDemandSavingsInr,
    annualToUSavingsInr,
    totalAnnualSavingsInr,
    penaltyRiskAnnualInr,
    strategies,
    disclaimer: 'Simulation / Estimate — Not Guaranteed'
  };
}
