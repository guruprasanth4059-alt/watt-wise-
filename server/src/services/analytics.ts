import { query, queryOne } from '../database/db.js';
import { Bill, Society, PilotStatus, PilotScorecardData } from '../types/index.js';
import { evaluateDataQuality, DataQualityReport } from './dataQuality.js';
import { calculateSocietyBaseline, BaselineResult } from './baseline.js';

export interface AnalyticsSummary {
  currentMonth: {
    period: string;
    consumptionKwh: number;
    billAmount: number;
    fixedCharges: number;
    energyCharges: number;
  } | null;
  previousMonth: {
    period: string;
    consumptionKwh: number;
    billAmount: number;
  } | null;
  consumptionChangePercent: number; // e.g. -4.1
  averageConsumptionKwh: number;
  averageBillAmount: number;
  costPerKwh: number;
  consumptionPerApartment: number;
  costPerApartment: number;
  consumptionPerBuilding: number;
  potentialSavings: number;
  measuredSavings: number;
  energyScore: number;
  energyScoreComponents: {
    trendScore: number;
    dataCompletenessScore: number;
    savingsProgressScore: number;
    efficiencyScore: number;
  };
  hasSubmeterData: boolean;
  history: Array<{
    period: string;
    consumptionKwh: number;
    billAmount: number;
    costPerKwh: number;
  }>;
  dataQuality: DataQualityReport;
  baseline: BaselineResult;
  profile: {
    peakMonth: { period: string; units_kwh: number; bill_amount: number } | null;
    lowestMonth: { period: string; units_kwh: number; bill_amount: number } | null;
    medianConsumptionKwh: number;
    rolling3MonthAvgKwh: number;
  };
}

export interface EnergyAnomaly {
  id: string;
  severity: 'high' | 'medium' | 'low';
  period: string;
  observed: string;
  changePercent: number;
  possibleExplanations: string[];
  recommendedChecks: string[];
}

export function calculateSocietyAnalytics(societyId: string): AnalyticsSummary {
  const society = queryOne<Society>('SELECT * FROM societies WHERE id = ?', [societyId]);
  const apartments = society?.apartments || 100;
  const buildings = Math.max(1, society?.buildings || 1);

  // Get all verified bills in chronological order
  const bills = query<Bill>(
    `SELECT * FROM bills 
     WHERE society_id = ? AND verified = 1 
     ORDER BY billing_period ASC`,
    [societyId]
  );

  const dq = evaluateDataQuality(societyId);
  const baseline = calculateSocietyBaseline(societyId);

  if (bills.length === 0) {
    return {
      currentMonth: null,
      previousMonth: null,
      consumptionChangePercent: 0,
      averageConsumptionKwh: 0,
      averageBillAmount: 0,
      costPerKwh: 0,
      consumptionPerApartment: 0,
      costPerApartment: 0,
      consumptionPerBuilding: 0,
      potentialSavings: 0,
      measuredSavings: 0,
      energyScore: 60,
      energyScoreComponents: {
        trendScore: 15,
        dataCompletenessScore: 10,
        savingsProgressScore: 15,
        efficiencyScore: 20
      },
      hasSubmeterData: false,
      history: [],
      dataQuality: dq,
      baseline,
      profile: {
        peakMonth: null,
        lowestMonth: null,
        medianConsumptionKwh: 0,
        rolling3MonthAvgKwh: 0
      }
    };
  }

  const current = bills[bills.length - 1];
  const previous = bills.length > 1 ? bills[bills.length - 2] : null;

  // Percentage change: ((current - previous) / previous) * 100
  let consumptionChangePercent = 0;
  if (previous && previous.units_kwh > 0) {
    consumptionChangePercent = Math.round(((current.units_kwh - previous.units_kwh) / previous.units_kwh) * 1000) / 10;
  }

  // Averages
  const totalKwh = bills.reduce((acc, b) => acc + b.units_kwh, 0);
  const totalAmount = bills.reduce((acc, b) => acc + b.bill_amount, 0);
  const avgKwh = Math.round(totalKwh / bills.length);
  const avgAmount = Math.round(totalAmount / bills.length);

  // Derived metrics
  const costPerKwh = current.units_kwh > 0 ? Math.round((current.bill_amount / current.units_kwh) * 100) / 100 : 0;
  const consumptionPerApartment = Math.round((current.units_kwh / apartments) * 10) / 10;
  const costPerApartment = Math.round(current.bill_amount / apartments);
  const consumptionPerBuilding = Math.round((current.units_kwh / buildings) * 10) / 10;

  // Check sub-meters
  const subMeterRecords = query(
    `SELECT c.id FROM consumption c 
     JOIN meters m ON c.meter_id = m.id 
     WHERE c.society_id = ? AND m.type != 'common_area' 
     LIMIT 1`,
    [societyId]
  );
  const hasSubmeterData = subMeterRecords.length > 0;

  // Potential savings: estimated from active recommendations
  const activeRecs = query<{ totalEst: number }>(
    `SELECT SUM(estimated_savings) as totalEst FROM recommendations 
     WHERE society_id = ? AND status IN ('new', 'assigned', 'not_started', 'in_progress')`,
    [societyId]
  );
  const potentialSavings = activeRecs[0]?.totalEst || 0;

  // Measured savings
  const latestSavings = query<{ measured_savings: number }>(
    `SELECT measured_savings FROM savings 
     WHERE society_id = ? 
     ORDER BY month DESC LIMIT 1`,
    [societyId]
  );
  const measuredSavings = latestSavings[0]?.measured_savings || 0;

  // Calculate WattWise Internal Score (0 - 100)
  // Components:
  // 1. Trend Score (max 30): rewarding steady or reduced consumption
  let trendScore = 20;
  if (consumptionChangePercent < -3) trendScore = 30;
  else if (consumptionChangePercent < 0) trendScore = 25;
  else if (consumptionChangePercent < 5) trendScore = 18;
  else trendScore = 10;

  // 2. Data Completeness (max 25): number of bills and sub-meters
  let dataCompletenessScore = Math.min(bills.length * 3, 15);
  if (hasSubmeterData) dataCompletenessScore += 10;

  // 3. Savings Progress (max 25): active actions taken
  const completedActions = query<{ count: number }>(
    `SELECT COUNT(*) as count FROM actions WHERE society_id = ?`,
    [societyId]
  )[0]?.count || 0;
  const savingsProgressScore = Math.min(completedActions * 10 + (measuredSavings > 0 ? 10 : 0), 25);

  // 4. Efficiency Score (max 20): based on benchmark kWh/apartment
  let efficiencyScore = 15;
  if (consumptionPerApartment < 70) efficiencyScore = 20;
  else if (consumptionPerApartment < 90) efficiencyScore = 16;
  else efficiencyScore = 12;

  const energyScore = Math.min(100, Math.max(0, trendScore + dataCompletenessScore + savingsProgressScore + efficiencyScore));

  const history = bills.slice(-12).map(b => ({
    period: b.billing_period,
    consumptionKwh: b.units_kwh,
    billAmount: b.bill_amount,
    costPerKwh: b.units_kwh > 0 ? Math.round((b.bill_amount / b.units_kwh) * 100) / 100 : 0
  }));

  // Energy Profile: Peak, Lowest, Median, Rolling 3-Month
  const sortedByKwh = [...bills].sort((a, b) => b.units_kwh - a.units_kwh);
  const peakMonth = sortedByKwh[0] ? { period: sortedByKwh[0].billing_period, units_kwh: sortedByKwh[0].units_kwh, bill_amount: sortedByKwh[0].bill_amount } : null;
  const lowestMonth = sortedByKwh[sortedByKwh.length - 1] ? { period: sortedByKwh[sortedByKwh.length - 1].billing_period, units_kwh: sortedByKwh[sortedByKwh.length - 1].units_kwh, bill_amount: sortedByKwh[sortedByKwh.length - 1].bill_amount } : null;

  const medianIdx = Math.floor(sortedByKwh.length / 2);
  const medianConsumptionKwh = sortedByKwh[medianIdx]?.units_kwh || 0;

  const last3Bills = bills.slice(-3);
  const rolling3MonthAvgKwh = last3Bills.length > 0 
    ? Math.round(last3Bills.reduce((acc, b) => acc + b.units_kwh, 0) / last3Bills.length) 
    : 0;

  return {
    currentMonth: {
      period: current.billing_period,
      consumptionKwh: current.units_kwh,
      billAmount: current.bill_amount,
      fixedCharges: current.fixed_charges,
      energyCharges: current.energy_charges
    },
    previousMonth: previous ? {
      period: previous.billing_period,
      consumptionKwh: previous.units_kwh,
      billAmount: previous.bill_amount
    } : null,
    consumptionChangePercent,
    averageConsumptionKwh: avgKwh,
    averageBillAmount: avgAmount,
    costPerKwh,
    consumptionPerApartment,
    costPerApartment,
    consumptionPerBuilding,
    potentialSavings,
    measuredSavings,
    energyScore,
    energyScoreComponents: {
      trendScore,
      dataCompletenessScore,
      savingsProgressScore,
      efficiencyScore
    },
    hasSubmeterData,
    history,
    dataQuality: dq,
    baseline,
    profile: {
      peakMonth,
      lowestMonth,
      medianConsumptionKwh,
      rolling3MonthAvgKwh
    }
  };
}

export function detectEnergyAnomalies(societyId: string): EnergyAnomaly[] {
  const bills = query<Bill>(
    `SELECT * FROM bills 
     WHERE society_id = ? AND verified = 1 
     ORDER BY billing_period ASC`,
    [societyId]
  );

  if (bills.length < 2) return [];

  const anomalies: EnergyAnomaly[] = [];

  for (let i = 1; i < bills.length; i++) {
    const prev = bills[i - 1];
    const curr = bills[i];

    if (prev.units_kwh <= 0) continue;

    const changePct = Math.round(((curr.units_kwh - prev.units_kwh) / prev.units_kwh) * 1000) / 10;
    const absChange = Math.abs(changePct);

    // Configurable thresholds: High (>30%), Medium (18-30%), Low (10-18%)
    if (absChange >= 10) {
      let severity: 'high' | 'medium' | 'low' = 'low';
      if (absChange >= 30) severity = 'high';
      else if (absChange >= 18) severity = 'medium';

      const isIncrease = changePct > 0;
      const observed = `${curr.billing_period} common-area electricity consumption was ${isIncrease ? '+' : ''}${changePct}% compared with ${prev.billing_period} (${curr.units_kwh.toLocaleString()} kWh vs ${prev.units_kwh.toLocaleString()} kWh).`;

      const possibleExplanations = isIncrease
        ? [
            'Possible water pump runtime extension due to higher summer tank replenishment demand.',
            'Seasonal clubhouse air-conditioning or swimming pool filtration schedule change.',
            'Basement ventilation fans or common lighting timer drift remaining on during daylight hours.'
          ]
        : [
            'Recorded equipment maintenance or digital timer calibration completed.',
            'Seasonal shift in occupancy or cooling requirements.',
            'Reduced common facility operating hours.'
          ];

      const recommendedChecks = isIncrease
        ? [
            'Review pump automation logs and float valve operation in underground sumps.',
            'Verify astronomical timer relay schedules on outdoor streetlights and corridor lighting.',
            'Inspect elevator standby power consumption.'
          ]
        : [
            'Record any physical maintenance actions taken during this cycle in the Action Center to track verified savings.'
          ];

      anomalies.push({
        id: `anom-${curr.id}`,
        severity,
        period: curr.billing_period,
        observed,
        changePercent: changePct,
        possibleExplanations,
        recommendedChecks
      });
    }
  }

  return anomalies.reverse();
}

export function getCategoryBreakdown(societyId: string, period?: string) {
  const rows = query<{ type: string; name: string; units_kwh: number }>(
    `SELECT m.type, m.name, c.units_kwh
     FROM consumption c
     JOIN meters m ON c.meter_id = m.id
     WHERE c.society_id = ? ${period ? 'AND c.period = ?' : ''}
     ORDER BY c.units_kwh DESC`,
    period ? [societyId, period] : [societyId]
  );

  const subMeterRows = rows.filter(r => r.type !== 'common_area');

  if (subMeterRows.length === 0) {
    return {
      available: false,
      message: 'Category-level data unavailable. Add sub-meters or upload category-level records to unlock this breakdown.',
      categories: []
    };
  }

  const total = subMeterRows.reduce((acc, r) => acc + r.units_kwh, 0);

  const categories = subMeterRows.map(r => ({
    type: r.type,
    name: r.name,
    unitsKwh: r.units_kwh,
    percentage: total > 0 ? Math.round((r.units_kwh / total) * 1000) / 10 : 0
  }));

  return {
    available: true,
    message: null,
    totalSubmeterKwh: total,
    categories
  };
}

export function getPilotScorecard(societyId: string): PilotScorecardData {
  const society = queryOne<Society>('SELECT * FROM societies WHERE id = ?', [societyId]);
  const analytics = calculateSocietyAnalytics(societyId);
  const dq = evaluateDataQuality(societyId);

  // Pilot date calculations (default 90-day pilot)
  const now = new Date();
  const pilotStart = society?.pilot_start_date ? new Date(society.pilot_start_date) : new Date(Date.now() - 42 * 86400000);
  const pilotEnd = society?.pilot_end_date ? new Date(society.pilot_end_date) : new Date(pilotStart.getTime() + 90 * 86400000);

  const daysTotal = 90;
  const msElapsed = Math.max(0, now.getTime() - pilotStart.getTime());
  const daysElapsed = Math.min(daysTotal, Math.floor(msElapsed / 86400000));
  const daysRemaining = Math.max(0, daysTotal - daysElapsed);

  let pilotStatus: PilotStatus = society?.pilot_status || 'active_pilot';
  if (daysRemaining <= 7 && daysRemaining > 0) pilotStatus = 'ending_soon';
  else if (daysRemaining === 0) pilotStatus = 'completed';

  const actionsCount = query<{ count: number }>('SELECT COUNT(*) as count FROM actions WHERE society_id = ?', [societyId])[0]?.count || 0;
  const openRecsCount = query<{ count: number }>(
    `SELECT COUNT(*) as count FROM recommendations WHERE society_id = ? AND status != 'completed'`, 
    [societyId]
  )[0]?.count || 0;

  // Internal Pilot Health Score (0 - 100)
  // Distinct from WattWise Energy Score:
  // Evaluates how actively the pilot is progressing: data completeness, active verified bills, actions taken
  let pilotHealthScore = 0;
  if (analytics.dataQuality.status === 'good') pilotHealthScore += 40;
  else if (analytics.dataQuality.status === 'needs_review') pilotHealthScore += 25;
  else pilotHealthScore += 10;

  if (analytics.baseline.status === 'established') pilotHealthScore += 30;
  else if (analytics.baseline.status === 'preliminary') pilotHealthScore += 15;

  if (actionsCount >= 2) pilotHealthScore += 20;
  else if (actionsCount >= 1) pilotHealthScore += 10;

  if (openRecsCount > 0) pilotHealthScore += 10;
  pilotHealthScore = Math.min(100, pilotHealthScore);

  return {
    societyName: society?.name || 'Society',
    pilotStatus,
    startDate: pilotStart.toISOString().slice(0, 10),
    endDate: pilotEnd.toISOString().slice(0, 10),
    daysTotal,
    daysElapsed,
    daysRemaining,
    dataCoverageMonths: analytics.dataQuality.coverageMonths,
    baselineStatus: analytics.baseline.status,
    baselineAvgKwh: analytics.baseline.avgMonthlyKwh,
    dataQualityStatus: analytics.dataQuality.status,
    consumptionTrendPercent: analytics.consumptionChangePercent,
    billTrendPercent: analytics.consumptionChangePercent, // correlate
    potentialSavingsMonthly: analytics.potentialSavings,
    recordedSavingsTotal: analytics.measuredSavings,
    actionsCompleted: actionsCount,
    recommendationsOpen: openRecsCount,
    energyScore: analytics.energyScore,
    pilotHealthScore
  };
}
