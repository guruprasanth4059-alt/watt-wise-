import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../database/db.js';
import { AuthenticatedRequest, authenticateToken, requireRole, getAuthorizedSocietyId } from '../middleware/auth.js';
import { generateEnergyInsights, AIAnalysisRequest } from '../services/ai.js';
import { calculateSocietyAnalytics } from '../services/analytics.js';
import { Society, Meter, Action, AIInsight } from '../types/index.js';

export const aiRouter = Router();

// 1. Get latest insights
aiRouter.get('/insights', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const rows = query<any>(
      `SELECT * FROM ai_insights WHERE society_id = ? ORDER BY created_at DESC LIMIT 5`,
      [societyId]
    );

    const formatted = rows.map(r => ({
      ...r,
      observations: JSON.parse(r.observations || '[]'),
      possible_causes: JSON.parse(r.possible_causes || '[]'),
      recommendations: JSON.parse(r.recommendations || '[]'),
      disclaimer: 'AI-generated insight based on available society data.'
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: 'AI insights are temporarily unavailable. Your electricity data is safe.' });
  }
});

// 2. Trigger AI Generation based on latest live society metrics
aiRouter.post('/generate', authenticateToken, requireRole('society_admin', 'committee_member'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const society = queryOne<Society>('SELECT * FROM societies WHERE id = ?', [societyId]);
    if (!society) {
      res.status(404).json({ error: 'Society not found.' });
      return;
    }

    const analytics = calculateSocietyAnalytics(societyId);
    const meters = query<Meter>('SELECT name, type FROM meters WHERE society_id = ?', [societyId]);
    const actions = query<Action>('SELECT action_taken, action_date FROM actions WHERE society_id = ? ORDER BY action_date DESC LIMIT 5', [societyId]);

    const requestData: AIAnalysisRequest = {
      society: {
        name: society.name,
        apartments: society.apartments,
        buildings: society.buildings,
        facilities: JSON.parse((society.facilities as any) || '[]')
      },
      currentMonth: analytics.currentMonth ? {
        period: analytics.currentMonth.period,
        consumptionKwh: analytics.currentMonth.consumptionKwh,
        billAmount: analytics.currentMonth.billAmount
      } : null,
      previousMonth: analytics.previousMonth ? {
        period: analytics.previousMonth.period,
        consumptionKwh: analytics.previousMonth.consumptionKwh,
        billAmount: analytics.previousMonth.billAmount
      } : null,
      consumptionChangePercent: analytics.consumptionChangePercent,
      historicalData: analytics.history,
      meters: meters.map(m => ({ name: m.name, type: m.type })),
      actions: actions.map(a => ({ action_taken: a.action_taken, action_date: a.action_date }))
    };

    const aiResult = await generateEnergyInsights(requestData);

    const insightId = `ai-${uuidv4().slice(0, 8)}`;
    const period = analytics.currentMonth?.period || new Date().toISOString().slice(0, 7);

    execute(
      `INSERT INTO ai_insights (id, society_id, period, summary, observations, possible_causes, recommended_checks, recommendations, confidence, data_limitations, prompt_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        insightId,
        societyId,
        period,
        aiResult.summary,
        JSON.stringify(aiResult.observations),
        JSON.stringify(aiResult.possible_causes),
        JSON.stringify(aiResult.recommended_checks),
        JSON.stringify(aiResult.recommendations),
        aiResult.confidence,
        JSON.stringify(aiResult.data_limitations),
        JSON.stringify(requestData)
      ]
    );

    // Create notification
    execute(
      `INSERT INTO notifications (id, society_id, title, message, type, link)
       VALUES (?, ?, 'New AI Consumption Insight', ?, 'ai_insight', '/insights')`,
      [`notif-${uuidv4().slice(0, 8)}`, societyId, `WattWise AI evaluated the latest electricity period (${period}).`]
    );

    res.json({
      id: insightId,
      society_id: societyId,
      period,
      summary: aiResult.summary,
      observations: aiResult.observations,
      possible_causes: aiResult.possible_causes,
      recommended_checks: aiResult.recommended_checks,
      recommendations: aiResult.recommendations,
      confidence: aiResult.confidence,
      data_limitations: aiResult.data_limitations,
      disclaimer: aiResult.disclaimer,
      created_at: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('AI generation error:', err);
    res.status(500).json({ error: 'AI insights are temporarily unavailable. Your electricity data is safe.' });
  }
});
