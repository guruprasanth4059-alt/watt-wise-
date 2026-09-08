import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../database/db.js';
import { Bill, Baseline } from '../types/index.js';
import { evaluateDataQuality } from './dataQuality.js';

export interface BaselineResult {
  status: 'not_established' | 'preliminary' | 'established';
  periodStart: string | null;
  periodEnd: string | null;
  avgMonthlyKwh: number;
  avgMonthlyBill: number;
  totalConsumptionKwh: number;
  verifiedMonthsCount: number;
  quality: 'good' | 'needs_review' | 'insufficient';
  message: string;
  recommendation: string;
}

export function calculateSocietyBaseline(societyId: string): BaselineResult {
  // Query verified bills in chronological order
  const verifiedBills = query<Bill>(
    `SELECT * FROM bills 
     WHERE society_id = ? AND verified = 1 
     ORDER BY billing_period ASC`,
    [societyId]
  );

  const dq = evaluateDataQuality(societyId);

  if (verifiedBills.length === 0) {
    return {
      status: 'not_established',
      periodStart: null,
      periodEnd: null,
      avgMonthlyKwh: 0,
      avgMonthlyBill: 0,
      totalConsumptionKwh: 0,
      verifiedMonthsCount: 0,
      quality: 'insufficient',
      message: 'Baseline not established.',
      recommendation: 'Upload and verify at least 3 months of historical electricity bills to establish an energy baseline.'
    };
  }

  const periodStart = verifiedBills[0].billing_period;
  const periodEnd = verifiedBills[verifiedBills.length - 1].billing_period;
  const totalKwh = verifiedBills.reduce((acc, b) => acc + b.units_kwh, 0);
  const totalAmount = verifiedBills.reduce((acc, b) => acc + b.bill_amount, 0);
  const avgMonthlyKwh = Math.round((totalKwh / verifiedBills.length) * 10) / 10;
  const avgMonthlyBill = Math.round(totalAmount / verifiedBills.length);

  if (verifiedBills.length < 3) {
    return {
      status: 'preliminary',
      periodStart,
      periodEnd,
      avgMonthlyKwh,
      avgMonthlyBill,
      totalConsumptionKwh: totalKwh,
      verifiedMonthsCount: verifiedBills.length,
      quality: 'needs_review',
      message: `Preliminary baseline (${verifiedBills.length} month${verifiedBills.length > 1 ? 's' : ''} available).`,
      recommendation: 'More historical data is recommended before evaluating conservation interventions.'
    };
  }

  // 3+ months established baseline
  const quality: 'good' | 'needs_review' | 'insufficient' = dq.status === 'insufficient' ? 'needs_review' : dq.status;

  // Persist / update baseline table
  const existing = queryOne('SELECT id FROM baselines WHERE society_id = ?', [societyId]);
  if (existing) {
    execute(
      `UPDATE baselines 
       SET period_start = ?, period_end = ?, avg_monthly_kwh = ?, avg_monthly_bill = ?, verified_months_count = ?, quality = ?, status = 'established', updated_at = datetime('now')
       WHERE society_id = ?`,
      [periodStart, periodEnd, avgMonthlyKwh, avgMonthlyBill, verifiedBills.length, quality, societyId]
    );
  } else {
    execute(
      `INSERT INTO baselines (id, society_id, period_start, period_end, avg_monthly_kwh, avg_monthly_bill, verified_months_count, quality, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'established')`,
      [`base-${uuidv4().slice(0, 8)}`, societyId, periodStart, periodEnd, avgMonthlyKwh, avgMonthlyBill, verifiedBills.length, quality]
    );
  }

  return {
    status: 'established',
    periodStart,
    periodEnd,
    avgMonthlyKwh,
    avgMonthlyBill,
    totalConsumptionKwh: totalKwh,
    verifiedMonthsCount: verifiedBills.length,
    quality,
    message: `Baseline established across ${verifiedBills.length} billing cycles (${periodStart} to ${periodEnd}).`,
    recommendation: 'Baseline is suitable for comparing post-action consumption changes.'
  };
}
