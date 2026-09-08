import { query, queryOne } from '../database/db.js';
import { Bill, Society } from '../types/index.js';

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
}

export function calculateSocietyAnalytics(societyId: string): AnalyticsSummary {
  const society = queryOne<Society>('SELECT * FROM societies WHERE id = ?', [societyId]);
  const apartments = society?.apartments || 100;

  // Get all verified bills in chronological order
  const bills = query<Bill>(
    `SELECT * FROM bills 
     WHERE society_id = ? AND verified = 1 
     ORDER BY billing_period ASC`,
    [societyId]
  );

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
      history: []
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
     WHERE society_id = ? AND status IN ('not_started', 'in_progress')`,
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
    history
  };
}

export function getCategoryBreakdown(societyId: string, period?: string) {
  // Query consumption joined with meters to get actual category data
  const rows = query<{ type: string; name: string; units_kwh: number }>(
    `SELECT m.type, m.name, c.units_kwh
     FROM consumption c
     JOIN meters m ON c.meter_id = m.id
     WHERE c.society_id = ? ${period ? 'AND c.period = ?' : ''}
     ORDER BY c.units_kwh DESC`,
    period ? [societyId, period] : [societyId]
  );

  // Filter out the main general meter if sub-meters exist
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
