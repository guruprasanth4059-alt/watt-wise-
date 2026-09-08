import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute, transaction } from '../database/db.js';
import { AuthenticatedRequest, authenticateToken, requireRole, getAuthorizedSocietyId } from '../middleware/auth.js';
import { Recommendation, Action } from '../types/index.js';

export const recommendationsRouter = Router();

// 1. Get all recommendations
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
    const { title, description, reason, suggested_action, priority, estimated_savings, category } = req.body;

    if (!title || !suggested_action) {
      res.status(400).json({ error: 'Title and suggested action are required.' });
      return;
    }

    const id = `rec-${uuidv4().slice(0, 8)}`;
    execute(
      `INSERT INTO recommendations (id, society_id, title, description, reason, suggested_action, priority, estimated_savings, status, category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'not_started', ?)`,
      [
        id,
        societyId,
        title.trim(),
        description || '',
        reason || '',
        suggested_action.trim(),
        priority || 'medium',
        parseFloat(estimated_savings || '0'),
        category || 'General'
      ]
    );

    const created = queryOne<Recommendation>('SELECT * FROM recommendations WHERE id = ?', [id]);
    res.status(201).json({ message: 'Recommendation added.', recommendation: created });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create recommendation.' });
  }
});

// 3. Update recommendation status (Not Started / In Progress / Completed)
recommendationsRouter.put('/:id/status', authenticateToken, requireRole('society_admin', 'committee_member'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id } = req.params;
    const { status } = req.body;

    if (!['not_started', 'in_progress', 'completed'].includes(status)) {
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

// 4. Record an Action Taken on a recommendation (Action Tracking)
recommendationsRouter.post('/:id/actions', authenticateToken, requireRole('society_admin', 'committee_member'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id: recommendationId } = req.params;
    const { action_taken, action_date, notes, before_consumption, after_consumption } = req.body;

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

    // Calculate measured savings if before and after provided (approx ₹7.8 per kWh)
    let measuredSavings: number | null = null;
    if (before && after && before > after) {
      const kwhSaved = before - after;
      measuredSavings = Math.round(kwhSaved * 7.8);
    }

    const actionId = `action-${uuidv4().slice(0, 8)}`;
    const user = queryOne('SELECT name FROM users WHERE id = ?', [req.user!.userId]);

    transaction(() => {
      // 1. Insert Action record
      execute(
        `INSERT INTO actions (id, society_id, recommendation_id, action_taken, action_date, notes, before_consumption, after_consumption, measured_savings, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          actionId,
          societyId,
          recommendationId,
          action_taken.trim(),
          action_date,
          notes || null,
          before,
          after,
          measuredSavings,
          user?.name || 'Administrator'
        ]
      );

      // 2. Mark recommendation as completed
      execute(
        `UPDATE recommendations SET status = 'completed', updated_at = datetime('now') WHERE id = ? AND society_id = ?`,
        [recommendationId, societyId]
      );

      // 3. Update or insert current month measured savings record if savings calculated
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
         VALUES (?, ?, 'Energy Conservation Action Recorded', ?, 'recommendation', '/savings')`,
        [
          `notif-${uuidv4().slice(0, 8)}`,
          societyId,
          `Action "${action_taken.slice(0, 40)}..." logged. Tracking impact on next billing cycle.`
        ]
      );
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

// 5. Get all recorded actions
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
