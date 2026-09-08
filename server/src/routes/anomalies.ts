import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../database/db.js';
import { AuthenticatedRequest, authenticateToken, requireRole, getAuthorizedSocietyId } from '../middleware/auth.js';
import { getSocietyAnomalies } from '../services/intervalAnomalies.js';
import { logAuditEvent } from '../services/audit.js';

export const anomaliesRouter = Router();

// List all interval anomalies for the society
anomaliesRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const status = req.query.status as string | undefined;
    const anomalies = getSocietyAnomalies(societyId, status);
    res.json(anomalies);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load anomalies.' });
  }
});

// Get anomaly details with investigation notes
anomaliesRouter.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id } = req.params;

    const anomaly = queryOne<any>(
      `SELECT a.*, m.name as meter_name, m.type as meter_type, m.building, m.area
       FROM anomalies a
       LEFT JOIN meters m ON a.meter_id = m.id
       WHERE a.id = ? AND a.society_id = ?`,
      [id, societyId]
    );

    if (!anomaly) {
      res.status(404).json({ error: 'Anomaly event not found.' });
      return;
    }

    const investigations = query<any>(
      `SELECT i.*, u.name as investigator_name 
       FROM investigations i
       LEFT JOIN users u ON i.created_by = u.id
       WHERE i.anomaly_id = ? AND i.society_id = ?
       ORDER BY i.created_at DESC`,
      [id, societyId]
    );

    res.json({
      ...anomaly,
      recommended_checks: typeof anomaly.recommended_checks === 'string' ? JSON.parse(anomaly.recommended_checks || '[]') : anomaly.recommended_checks,
      investigations
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get anomaly details.' });
  }
});

// Update anomaly status
anomaliesRouter.put('/:id/status', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id } = req.params;
    const { status } = req.body;

    if (!['new', 'investigating', 'resolved', 'dismissed'].includes(status)) {
      res.status(400).json({ error: 'Invalid anomaly status.' });
      return;
    }

    execute(
      `UPDATE anomalies SET status = ?, updated_at = datetime('now') WHERE id = ? AND society_id = ?`,
      [status, id, societyId]
    );

    logAuditEvent({
      societyId,
      userId: req.user!.userId,
      eventType: 'action_completed',
      entityType: 'recommendation',
      entityId: id,
      metadata: { action: 'anomaly_status_updated', newStatus: status }
    });

    res.json({ message: `Anomaly status updated to ${status}.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update anomaly status.' });
  }
});

// Record investigation notes and findings
anomaliesRouter.post('/:id/investigate', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id } = req.params;
    const { possible_cause, notes, action_taken, resolution, resolve_anomaly } = req.body;

    const anomaly = queryOne<any>('SELECT id FROM anomalies WHERE id = ? AND society_id = ?', [id, societyId]);
    if (!anomaly) {
      res.status(404).json({ error: 'Anomaly not found.' });
      return;
    }

    const investigationId = `inv-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    execute(
      `INSERT INTO investigations (id, society_id, anomaly_id, possible_cause, notes, action_taken, resolution, resolved_at, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        investigationId,
        societyId,
        id,
        possible_cause || null,
        notes || null,
        action_taken || null,
        resolution || null,
        resolve_anomaly ? now : null,
        req.user!.userId,
        now
      ]
    );

    if (resolve_anomaly) {
      execute(
        `UPDATE anomalies SET status = 'resolved', updated_at = datetime('now') WHERE id = ?`,
        [id]
      );
    } else {
      execute(
        `UPDATE anomalies SET status = 'investigating', updated_at = datetime('now') WHERE id = ?`,
        [id]
      );
    }

    logAuditEvent({
      societyId,
      userId: req.user!.userId,
      eventType: 'action_completed',
      entityType: 'action',
      entityId: id,
      metadata: { action: 'anomaly_investigation_recorded', resolved: !!resolve_anomaly }
    });

    res.json({ message: 'Investigation recorded successfully.', investigationId });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record investigation.' });
  }
});
