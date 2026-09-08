import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateToken, getAuthorizedSocietyId } from '../middleware/auth.js';
import { getPilotScorecard, detectEnergyAnomalies, calculateSocietyAnalytics } from '../services/analytics.js';
import { evaluateDataQuality } from '../services/dataQuality.js';
import { calculateSocietyBaseline } from '../services/baseline.js';
import { query, queryOne } from '../database/db.js';
import { Society, Bill, Action } from '../types/index.js';

export const pilotRouter = Router();

// 1. Get Pilot Scorecard (Requirement 30)
pilotRouter.get('/scorecard', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const scorecard = getPilotScorecard(societyId);
    res.json(scorecard);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve pilot scorecard.' });
  }
});

// 2. Get Data Quality Report (Requirement 6 & 7)
pilotRouter.get('/data-quality', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const report = evaluateDataQuality(societyId);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to evaluate data quality.' });
  }
});

// 3. Get Deterministic Energy Anomalies (Requirement 15, 16, 17)
pilotRouter.get('/anomalies', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const anomalies = detectEnergyAnomalies(societyId);
    res.json(anomalies);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to detect energy anomalies.' });
  }
});

// 4. Get Pilot Baseline (Requirement 11 & 12)
pilotRouter.get('/baseline', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const baseline = calculateSocietyBaseline(societyId);
    res.json(baseline);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate baseline.' });
  }
});

// 5. Pilot Conversion Summary (Requirement 52)
pilotRouter.get('/conversion', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const society = queryOne<Society>('SELECT * FROM societies WHERE id = ?', [societyId]);
    const scorecard = getPilotScorecard(societyId);
    const analytics = calculateSocietyAnalytics(societyId);

    const verifiedBills = query<Bill>('SELECT * FROM bills WHERE society_id = ? AND verified = 1', [societyId]);
    const totalKwhAnalyzed = verifiedBills.reduce((acc, b) => acc + b.units_kwh, 0);
    const totalBillSpent = verifiedBills.reduce((acc, b) => acc + b.bill_amount, 0);

    const actions = query<Action>('SELECT * FROM actions WHERE society_id = ?', [societyId]);
    const completedActionsCount = actions.length;

    const totalRecordedReductionKwh = actions.reduce((acc, a) => acc + (a.observed_reduction_kwh || 0), 0);
    const totalRecordedRupeeSavings = actions.reduce((acc, a) => acc + (a.measured_savings || 0), 0);

    const conversionSummary = {
      societyName: society?.name || 'Society',
      city: society?.city || 'Bengaluru',
      apartments: society?.apartments || 100,
      pilotDurationDays: scorecard.daysTotal,
      dataCoverageMonths: scorecard.dataCoverageMonths,
      totalKwhAnalyzed,
      totalBillSpent,
      baselineAvgMonthlyKwh: scorecard.baselineAvgKwh,
      consumptionTrendPercent: scorecard.consumptionTrendPercent,
      completedActionsCount,
      totalRecordedReductionKwh,
      totalRecordedRupeeSavings,
      potentialOpportunityMonthly: scorecard.potentialSavingsMonthly,
      wattwiseEnergyScore: scorecard.energyScore,
      dataQualityStatus: scorecard.dataQualityStatus,
      methodologyNote: 'All metrics derived from verified invoices and recorded maintenance interventions. Recorded savings reflect differences from the historical baseline without asserting unilateral causality.'
    };

    res.json(conversionSummary);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate pilot conversion summary.' });
  }
});
