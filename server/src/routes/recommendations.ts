import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute, transaction } from '../database/db.js';
import { AuthenticatedRequest, authenticateToken, requireRole, getAuthorizedSocietyId } from '../middleware/auth.js';
import { Recommendation, Action, RecommendationStatus } from '../types/index.js';
import { logAuditEvent } from '../services/audit.js';

export const recommendationsRouter = Router();

// 1. Get all recommendations with assignment and evidence
recommendationsRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const recs = query<Recommendation>(
      `SELECT * FROM recommendations WHERE society_id = ? ORDER BY 
       CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       created_at DESC`,
      [societyId]
    );

    res.json(recs.map(r => ({
      ...r,
      estimated_savings_label: 'Potential estimate — not guaranteed'
    })));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load recommendations.' });
  }
});

// 2. Create custom recommendation (Society Admin only)
recommendationsRouter.post('/', authenticateToken, requireRole('society_admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const {
      title,
      description,
      reason,
      suggested_action,
      problem_observed,
      evidence,
      suggested_investigation,
      potential_impact,
      confidence,
      priority,
      estimated_savings,
      category,
      assigned_to,
      due_date
    } = req.body;

    if (!title || !suggested_action) {
      res.status(400).json({ error: 'Title and suggested action are required.' });
      return;
    }

    const id = `rec-${uuidv4().slice(0, 8)}`;
    execute(
      `INSERT INTO recommendations (
        id, society_id, title, description, reason, suggested_action, 
        problem_observed, evidence, suggested_investigation, potential_impact,
        confidence, priority, estimated_savings, status, category, assigned_to, due_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)`,
      [
        id,
        societyId,
        title.trim(),
        description || '',
        reason || problem_observed || '',
        suggested_action.trim(),
        problem_observed || reason || '',
        evidence || '',
        suggested_investigation || '',
        potential_impact || '',
        confidence || 'medium',
        priority || 'medium',
        parseFloat(estimated_savings || '0'),
        category || 'General',
        assigned_to || null,
        due_date || null
      ]
    );

    const created = queryOne<Recommendation>('SELECT * FROM recommendations WHERE id = ?', [id]);
    res.status(201).json({ message: 'Recommendation added.', recommendation: created });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create recommendation.' });
  }
});

// 3. Assign recommendation (Requirement 23)
recommendationsRouter.put('/:id/assign', authenticateToken, requireRole('society_admin', 'committee_member'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id } = req.params;
    const { assigned_to, due_date, status } = req.body;

    const existing = queryOne('SELECT id FROM recommendations WHERE id = ? AND society_id = ?', [id, societyId]);
    if (!existing) {
      res.status(404).json({ error: 'Recommendation not found.' });
      return;
    }

    const newStatus = status || 'assigned';
    execute(
      `UPDATE recommendations 
       SET assigned_to = ?, due_date = ?, status = ?, updated_at = datetime('now') 
       WHERE id = ? AND society_id = ?`,
      [assigned_to || null, due_date || null, newStatus, id, societyId]
    );

    const updated = queryOne('SELECT * FROM recommendations WHERE id = ?', [id]);
    res.json({ message: 'Recommendation assignment updated.', recommendation: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to assign recommendation.' });
  }
});

// 4. Update recommendation status
recommendationsRouter.put('/:id/status', authenticateToken, requireRole('society_admin', 'committee_member'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['new', 'assigned', 'not_started', 'in_progress', 'completed', 'dismissed'];
    if (!allowed.includes(status)) {
      res.status(400).json({ error: 'Invalid status.' });
      return;
    }

    const existing = queryOne('SELECT id FROM recommendations WHERE id = ? AND society_id = ?', [id, societyId]);
    if (!existing) {
      res.status(404).json({ error: 'Recommendation not found.' });
      return;
    }

    execute(
      `UPDATE recommendations SET status = ?, updated_at = datetime('now') WHERE id = ? AND society_id = ?`,
      [status, id, societyId]
    );

    const updated = queryOne('SELECT * FROM recommendations WHERE id = ?', [id]);
    res.json({ message: 'Recommendation status updated.', recommendation: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update recommendation status.' });
  }
});

// 5. Record an Intervention Action on a recommendation (Requirements 24, 25, 26, 27)
recommendationsRouter.post('/:id/actions', authenticateToken, requireRole('society_admin', 'committee_member'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id: recommendationId } = req.params;
    const {
      action_taken,
      action_date,
      person_responsible,
      notes,
      previous_condition,
      new_condition,
      before_consumption,
      after_consumption,
      measurement_period
    } = req.body;

    if (!action_taken || !action_date) {
      res.status(400).json({ error: 'Action taken and date are required.' });
      return;
    }

    const rec = queryOne<Recommendation>('SELECT * FROM recommendations WHERE id = ? AND society_id = ?', [recommendationId, societyId]);
    if (!rec) {
      res.status(404).json({ error: 'Recommendation not found.' });
      return;
    }

    const before = before_consumption ? parseFloat(before_consumption) : null;
    const after = after_consumption ? parseFloat(after_consumption) : null;

    let observedReductionKwh: number | null = null;
    let observedReductionPercent: number | null = null;
    let measuredSavings: number | null = null;

    if (before && after && before > after) {
      observedReductionKwh = Math.round((before - after) * 10) / 10;
      observedReductionPercent = Math.round(((before - after) / before) * 1000) / 10;
      // Deterministic tariff calculation (₹7.8 per kWh baseline rate)
      measuredSavings = Math.round(observedReductionKwh * 7.8);
    }

    const methodology = 'Recorded savings are calculated from verified post-action consumption compared with the selected baseline. This comparison does not establish causality.';
    const actionId = `action-${uuidv4().slice(0, 8)}`;
    const user = queryOne('SELECT name FROM users WHERE id = ?', [req.user!.userId]);
    const performer = person_responsible || user?.name || 'Administrator';

    transaction(() => {
      // 1. Insert Action record
      execute(
        `INSERT INTO actions (
          id, society_id, recommendation_id, action_taken, action_date, person_responsible, 
          notes, previous_condition, new_condition, before_consumption, after_consumption, 
          measurement_period, baseline_reference_kwh, post_action_average_kwh, 
          observed_reduction_kwh, observed_reduction_percent, measured_savings, 
          savings_confidence, methodology, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'medium', ?, ?)`,
        [
          actionId,
          societyId,
          recommendationId,
          action_taken.trim(),
          action_date,
          performer,
          notes || null,
          previous_condition || null,
          new_condition || null,
          before,
          after,
          measurement_period || `${action_date.slice(0, 7)} Follow-up`,
          before,
          after,
          observedReductionKwh,
          observedReductionPercent,
          measuredSavings,
          methodology,
          user?.name || 'Administrator'
        ]
      );

      // 2. Mark recommendation as completed
      execute(
        `UPDATE recommendations SET status = 'completed', updated_at = datetime('now') WHERE id = ? AND society_id = ?`,
        [recommendationId, societyId]
      );

      // 3. Update savings ledger if savings calculated
      if (measuredSavings && measuredSavings > 0) {
        const currentMonth = action_date.slice(0, 7);
        const existingSavings = queryOne('SELECT id, measured_savings FROM savings WHERE society_id = ? AND month = ?', [societyId, currentMonth]);
        if (existingSavings) {
          execute(
            `UPDATE savings SET measured_savings = measured_savings + ? WHERE id = ?`,
            [measuredSavings, existingSavings.id]
          );
        } else {
          execute(
            `INSERT INTO savings (id, society_id, month, estimated_savings, measured_savings, notes)
             VALUES (?, ?, ?, ?, ?, 'From recorded energy conservation action')`,
            [`sav-${uuidv4().slice(0, 8)}`, societyId, currentMonth, rec.estimated_savings, measuredSavings]
          );
        }
      }

      // 4. Create Notification
      execute(
        `INSERT INTO notifications (id, society_id, title, message, type, link)
         VALUES (?, ?, 'Energy Conservation Action Recorded', ?, 'action_completed', '/savings')`,
        [
          `notif-${uuidv4().slice(0, 8)}`,
          societyId,
          `Action "${action_taken.slice(0, 40)}..." recorded by ${performer}.`
        ]
      );

      // 5. Write audit log
      logAuditEvent({
        societyId,
        userId: req.user!.userId,
        eventType: 'action_completed',
        entityType: 'action',
        entityId: actionId,
        metadata: {
          recommendation_title: rec.title,
          action_taken,
          before_kwh: before,
          after_kwh: after,
          measured_savings: measuredSavings
        }
      });
    });

    const savedAction = queryOne<Action>('SELECT * FROM actions WHERE id = ?', [actionId]);

    res.status(201).json({
      message: 'Action recorded successfully.',
      action: savedAction,
      caveat: 'Consumption decreased after the recorded action. Other factors may also have contributed.'
    });
  } catch (err: any) {
    console.error('Record action error:', err);
    res.status(500).json({ error: 'Failed to record action.' });
  }
});

// 6. Get all recorded actions
recommendationsRouter.get('/actions/list', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const actions = query<any>(
      `SELECT a.*, r.title as recommendation_title, r.priority as recommendation_priority
       FROM actions a
       LEFT JOIN recommendations r ON a.recommendation_id = r.id
       WHERE a.society_id = ?
       ORDER BY a.action_date DESC`,
      [societyId]
    );

    res.json(actions);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve recorded actions.' });
  }
});
