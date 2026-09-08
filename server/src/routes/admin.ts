import { Router, Response } from 'express';
import { query, queryOne, execute } from '../database/db.js';
import { AuthenticatedRequest, authenticateToken, requireRole } from '../middleware/auth.js';
import { PilotRequest, Society, Subscription } from '../types/index.js';

export const adminRouter = Router();

// Middleware: Platform Admin only!
adminRouter.use(authenticateToken);
adminRouter.use(requireRole('platform_admin'));

// 1. Platform metrics overview
adminRouter.get('/metrics', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const totalSocietiesRow = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM societies');
    const totalPilotsRow = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM subscriptions WHERE plan = 'pilot'");
    const totalPaidRow = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM subscriptions WHERE plan IN ('basic', 'pro', 'enterprise')");
    const totalLeadsRow = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM pilot_requests');

    // Prototype estimated annual revenue calculation
    const basicCount = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM subscriptions WHERE plan = 'basic'")?.count || 0;
    const proCount = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM subscriptions WHERE plan = 'pro'")?.count || 0;
    const estimatedRevenue = basicCount * 1999 + proCount * 4999;

    res.json({
      totalSocieties: totalSocietiesRow?.count || 0,
      activePilots: totalPilotsRow?.count || 0,
      paidSocieties: totalPaidRow?.count || 0,
      pilotRequestsCount: totalLeadsRow?.count || 0,
      estimatedPlatformRevenue: estimatedRevenue
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve platform metrics.' });
  }
});

// 2. List all pilot requests (leads)
adminRouter.get('/pilots', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const leads = query<PilotRequest>('SELECT * FROM pilot_requests ORDER BY created_at DESC');
    res.json(leads);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve pilot requests.' });
  }
});

// 3. Update pilot request status (new, contacted, pilot_started, converted, closed)
adminRouter.put('/pilots/:id/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['new', 'contacted', 'pilot_started', 'converted', 'closed'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid pilot request status.' });
      return;
    }

    execute(
      'UPDATE pilot_requests SET status = ?, notes = COALESCE(?, notes) WHERE id = ?',
      [status, notes || null, id]
    );

    res.json({ message: 'Pilot status updated.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update pilot request.' });
  }
});

// 4. List all registered societies with subscription info
adminRouter.get('/societies', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societies = query<any>(
      `SELECT s.*, sub.plan, sub.status as sub_status, sub.trial_end,
              (SELECT COUNT(*) FROM users WHERE society_id = s.id) as user_count,
              (SELECT COUNT(*) FROM bills WHERE society_id = s.id) as bill_count
       FROM societies s
       LEFT JOIN subscriptions sub ON s.id = sub.society_id
       ORDER BY s.created_at DESC`
    );

    res.json(societies);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve societies.' });
  }
});
