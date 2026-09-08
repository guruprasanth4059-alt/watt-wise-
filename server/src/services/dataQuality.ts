import { query } from '../database/db.js';
import { Bill } from '../types/index.js';

export interface DataQualityIssue {
  type: 'missing_month' | 'duplicate_period' | 'spike' | 'unverified' | 'invalid_value' | 'missing_field';
  severity: 'high' | 'medium' | 'low';
  period?: string;
  message: string;
  actionableHint: string;
}

export interface DataQualityReport {
  status: 'good' | 'needs_review' | 'insufficient';
  score: number; // 0 - 100
  coverageMonths: number;
  verifiedBills: number;
  totalBills: number;
  missingMonths: string[];
  warnings: string[];
  issues: DataQualityIssue[];
  duplicateCount: number;
}

export function evaluateDataQuality(societyId: string): DataQualityReport {
  const bills = query<Bill>(
    `SELECT * FROM bills WHERE society_id = ? ORDER BY billing_period ASC`,
    [societyId]
  );

  const issues: DataQualityIssue[] = [];
  const missingMonths: string[] = [];
  const warnings: string[] = [];

  if (bills.length === 0) {
    return {
      status: 'insufficient',
      score: 0,
      coverageMonths: 0,
      verifiedBills: 0,
      totalBills: 0,
      missingMonths: [],
      warnings: ['No electricity bills recorded yet.'],
      issues: [{
        type: 'missing_field',
        severity: 'high',
        message: 'No bills found for this society.',
        actionableHint: 'Upload your first electricity bill to start establishing data coverage.'
      }],
      duplicateCount: 0
    };
  }

  const verifiedBills = bills.filter(b => b.verified === 1);
  const unverifiedCount = bills.length - verifiedBills.length;

  if (unverifiedCount > 0) {
    issues.push({
      type: 'unverified',
      severity: 'medium',
      message: `${unverifiedCount} uploaded bill(s) pending human verification.`,
      actionableHint: 'Review and confirm extracted values on the Bills verification screen.'
    });
    warnings.push(`${unverifiedCount} bill(s) need verification.`);
  }

  // Check duplicate periods
  const periodCounts: Record<string, number> = {};
  let duplicateCount = 0;
  bills.forEach(b => {
    periodCounts[b.billing_period] = (periodCounts[b.billing_period] || 0) + 1;
  });
  Object.entries(periodCounts).forEach(([period, count]) => {
    if (count > 1) {
      duplicateCount += (count - 1);
      issues.push({
        type: 'duplicate_period',
        severity: 'high',
        period,
        message: `Multiple bills (${count}) recorded for cycle ${period}.`,
        actionableHint: 'Verify whether multiple meters exist or remove accidental duplicate entries.'
      });
      warnings.push(`Duplicate billing entry detected for cycle ${period}.`);
    }
  });

  // Check invalid numeric values (negative or zero)
  bills.forEach(b => {
    if (b.units_kwh <= 0) {
      issues.push({
        type: 'invalid_value',
        severity: 'high',
        period: b.billing_period,
        message: `Non-positive units consumed (${b.units_kwh} kWh) in ${b.billing_period}.`,
        actionableHint: 'Correct the meter units recorded for this invoice.'
      });
    }
    if (b.bill_amount <= 0) {
      issues.push({
        type: 'invalid_value',
        severity: 'high',
        period: b.billing_period,
        message: `Non-positive bill amount (₹${b.bill_amount}) in ${b.billing_period}.`,
        actionableHint: 'Correct the tariff amount recorded for this invoice.'
      });
    }
  });

  // Check sequence continuity and spikes (> 25% change)
  // Extract sorted YYYY-MM periods
  const uniquePeriods = Array.from(new Set(bills.map(b => b.billing_period))).sort();
  for (let i = 1; i < bills.length; i++) {
    const prev = bills[i - 1];
    const curr = bills[i];

    if (prev.units_kwh > 0 && curr.units_kwh > 0) {
      const changePct = ((curr.units_kwh - prev.units_kwh) / prev.units_kwh) * 100;
      if (Math.abs(changePct) >= 28) {
        issues.push({
          type: 'spike',
          severity: Math.abs(changePct) >= 40 ? 'high' : 'medium',
          period: curr.billing_period,
          message: `Consumption changed by ${changePct > 0 ? '+' : ''}${Math.round(changePct)}% in ${curr.billing_period} compared with previous month.`,
          actionableHint: 'Verify the bill values before using this month as an undisturbed baseline.'
        });
        warnings.push(`Unusual ${Math.round(changePct)}% consumption change in ${curr.billing_period}.`);
      }
    }
  }

  // Detect missing months in chronological sequence if YYYY-MM format
  if (uniquePeriods.length >= 2) {
    const parseMonth = (p: string) => {
      const parts = p.split('-');
      if (parts.length === 2) {
        return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) };
      }
      return null;
    };

    for (let i = 0; i < uniquePeriods.length - 1; i++) {
      const start = parseMonth(uniquePeriods[i]);
      const next = parseMonth(uniquePeriods[i + 1]);
      if (start && next) {
        let curY = start.year;
        let curM = start.month + 1;
        if (curM > 12) {
          curY++;
          curM = 1;
        }
        while (curY < next.year || (curY === next.year && curM < next.month)) {
          const missing = `${curY}-${String(curM).padStart(2, '0')}`;
          missingMonths.push(missing);
          issues.push({
            type: 'missing_month',
            severity: 'medium',
            period: missing,
            message: `Electricity bill for ${missing} is missing in historical sequence.`,
            actionableHint: `Upload the invoice for ${missing} to ensure continuous baseline calculations.`
          });
          warnings.push(`Cycle ${missing} is missing.`);
          curM++;
          if (curM > 12) {
            curY++;
            curM = 1;
          }
        }
      }
    }
  }

  // Calculate composite data quality score (0 - 100)
  let score = 100;
  if (verifiedBills.length < 3) score -= 30;
  else if (verifiedBills.length < 6) score -= 10;

  score -= (unverifiedCount * 10);
  score -= (duplicateCount * 20);
  score -= (missingMonths.length * 15);
  score -= (issues.filter(i => i.type === 'invalid_value').length * 25);
  score = Math.max(10, Math.min(100, score));

  // Determine overall status
  let status: 'good' | 'needs_review' | 'insufficient' = 'good';
  if (verifiedBills.length < 2 || score < 40) {
    status = 'insufficient';
  } else if (score < 80 || issues.some(i => i.severity === 'high') || missingMonths.length > 0 || unverifiedCount > 0) {
    status = 'needs_review';
  }

  return {
    status,
    score,
    coverageMonths: uniquePeriods.length,
    verifiedBills: verifiedBills.length,
    totalBills: bills.length,
    missingMonths,
    warnings: Array.from(new Set(warnings)).slice(0, 5),
    issues,
    duplicateCount
  };
}
