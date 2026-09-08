import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../database/db.js';
import { AuthenticatedRequest, authenticateToken, requireRole, getAuthorizedSocietyId } from '../middleware/auth.js';
import { calculateSocietyAnalytics, getCategoryBreakdown } from '../services/analytics.js';
import { Society, Bill, Report, AIInsight } from '../types/index.js';

export const reportsRouter = Router();

// 1. Get all generated reports
reportsRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const reports = query<any>(
      `SELECT id, society_id, month, created_by, created_at FROM reports WHERE society_id = ? ORDER BY month DESC`,
      [societyId]
    );
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve reports list.' });
  }
});

// 2. Generate new monthly executive report
reportsRouter.post('/generate', authenticateToken, requireRole('society_admin', 'committee_member'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { month } = req.body; // e.g. "2026-03"

    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const society = queryOne<Society>('SELECT * FROM societies WHERE id = ?', [societyId]);
    if (!society) {
      res.status(404).json({ error: 'Society not found.' });
      return;
    }

    const analytics = calculateSocietyAnalytics(societyId);
    const categoryData = getCategoryBreakdown(societyId, targetMonth);

    // Get recommendations
    const recommendations = query(
      `SELECT title, priority, suggested_action, estimated_savings, status 
       FROM recommendations WHERE society_id = ? LIMIT 5`,
      [societyId]
    );

    // Get completed actions
    const actions = query(
      `SELECT action_taken, action_date, before_consumption, after_consumption, measured_savings 
       FROM actions WHERE society_id = ? ORDER BY action_date DESC LIMIT 5`,
      [societyId]
    );

    // Get latest AI summary
    const aiInsight = queryOne<any>(
      `SELECT summary, observations, recommendations FROM ai_insights WHERE society_id = ? ORDER BY created_at DESC LIMIT 1`,
      [societyId]
    );

    const topConsumer = categoryData.available && categoryData.categories.length > 0
      ? categoryData.categories[0]
      : { name: 'Common Water Pumps (Estimated baseline)', percentage: 28.2 };

    const reportPayload = {
      societyName: society.name,
      location: `${society.location}, ${society.city || ''}`,
      apartments: society.apartments,
      buildings: society.buildings,
      month: targetMonth,
      generatedDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      totalConsumptionKwh: analytics.currentMonth?.consumptionKwh || 0,
      electricityCost: analytics.currentMonth?.billAmount || 0,
      consumptionChangePercent: analytics.consumptionChangePercent,
      potentialSavings: analytics.potentialSavings,
      measuredSavings: analytics.measuredSavings,
      costPerApartment: analytics.costPerApartment,
      consumptionPerApartment: analytics.consumptionPerApartment,
      costPerKwh: analytics.costPerKwh,
      energyScore: analytics.energyScore,
      topConsumer,
      categoryBreakdown: categoryData,
      recommendations,
      completedActions: actions,
      aiSummary: aiInsight ? aiInsight.summary : 'Consistent power demand across main common-area panels.'
    };

    const reportId = `rep-${uuidv4().slice(0, 8)}`;
    const user = queryOne('SELECT name FROM users WHERE id = ?', [req.user!.userId]);

    // Delete existing report for the month if re-generating
    execute('DELETE FROM reports WHERE society_id = ? AND month = ?', [societyId, targetMonth]);

    execute(
      `INSERT INTO reports (id, society_id, month, report_data, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [reportId, societyId, targetMonth, JSON.stringify(reportPayload), user?.name || 'Administrator']
    );

    // Notification
    execute(
      `INSERT INTO notifications (id, society_id, title, message, type, link)
       VALUES (?, ?, 'Executive Monthly Report Generated', ?, 'report_ready', '/reports')`,
      [`notif-${uuidv4().slice(0, 8)}`, societyId, `The ${targetMonth} Energy Report is ready for review.`]
    );

    res.status(201).json({
      message: 'Monthly report generated successfully.',
      reportId,
      month: targetMonth,
      reportData: reportPayload
    });
  } catch (err: any) {
    console.error('Report generation error:', err);
    res.status(500).json({ error: 'Failed to generate monthly energy report.' });
  }
});

// 3. Get specific report by ID
reportsRouter.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id } = req.params;

    const report = queryOne<Report>('SELECT * FROM reports WHERE id = ? AND society_id = ?', [id, societyId]);
    if (!report) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }

    res.json({
      ...report,
      report_data: JSON.parse((report.report_data as any) || '{}')
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve report details.' });
  }
});
