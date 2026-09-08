import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../database/db.js';
import { AuthenticatedRequest, authenticateToken, requireRole, getAuthorizedSocietyId } from '../middleware/auth.js';
import { Savings } from '../types/index.js';

export const savingsRouter = Router();

// 1. Get savings overview (Potential vs Measured)
savingsRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);

    // Get historical monthly savings
    const history = query<Savings>(
      `SELECT * FROM savings WHERE society_id = ? ORDER BY month ASC`,
      [societyId]
    );

    // Sum active recommendations for total potential monthly savings
    const potentialRow = queryOne<{ total: number }>(
      `SELECT SUM(estimated_savings) as total FROM recommendations WHERE society_id = ? AND status IN ('not_started', 'in_progress')`,
      [societyId]
    );
    const totalPotential = potentialRow?.total || 0;

    // Sum measured savings to date
    const measuredRow = queryOne<{ total: number }>(
      `SELECT SUM(measured_savings) as total FROM savings WHERE society_id = ?`,
      [societyId]
    );
    const totalMeasured = measuredRow?.total || 0;

    res.json({
      totalPotentialSavings: totalPotential,
      totalMeasuredSavings: totalMeasured,
      potentialLabel: 'Estimated / Potential — Not guaranteed',
      measuredLabel: 'Measured / Recorded based on verified billing reductions',
      history
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve savings data.' });
  }
});

// 2. Add or update manual verified savings entry (Society Admin only)
savingsRouter.post('/', authenticateToken, requireRole('society_admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { month, estimated_savings, measured_savings, notes } = req.body;

    if (!month) {
      res.status(400).json({ error: 'Month (YYYY-MM) is required.' });
      return;
    }

    const est = parseFloat(estimated_savings || '0');
    const measured = parseFloat(measured_savings || '0');

    const existing = queryOne<Savings>('SELECT id FROM savings WHERE society_id = ? AND month = ?', [societyId, month]);

    if (existing) {
      execute(
        `UPDATE savings SET estimated_savings = ?, measured_savings = ?, notes = ? WHERE id = ?`,
        [est, measured, notes || null, existing.id]
      );
    } else {
      execute(
        `INSERT INTO savings (id, society_id, month, estimated_savings, measured_savings, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [`sav-${uuidv4().slice(0, 8)}`, societyId, month, est, measured, notes || null]
      );
    }

    res.json({ message: 'Savings record updated.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save savings entry.' });
  }
});
