import { Router, Response } from 'express';
import { query, queryOne, execute } from '../database/db.js';
import { AuthenticatedRequest, authenticateToken, getAuthorizedSocietyId } from '../middleware/auth.js';
import { Notification } from '../types/index.js';

export const notificationsRouter = Router();

// 1. Get notifications for current user's society
notificationsRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const notifications = query<Notification>(
      `SELECT * FROM notifications 
       WHERE society_id = ? AND (user_id = ? OR user_id IS NULL)
       ORDER BY created_at DESC 
       LIMIT 20`,
      [societyId, req.user!.userId]
    );

    const unreadCountRow = queryOne<{ unread: number }>(
      `SELECT COUNT(*) as unread FROM notifications 
       WHERE society_id = ? AND (user_id = ? OR user_id IS NULL) AND read = 0`,
      [societyId, req.user!.userId]
    );

    res.json({
      notifications,
      unreadCount: unreadCountRow?.unread || 0
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

// 2. Mark specific notification as read
notificationsRouter.put('/:id/read', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id } = req.params;

    execute(
      `UPDATE notifications SET read = 1 WHERE id = ? AND society_id = ?`,
      [id, societyId]
    );

    res.json({ message: 'Notification marked as read.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// 3. Mark all notifications as read
notificationsRouter.put('/read-all', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);

    execute(
      `UPDATE notifications SET read = 1 WHERE society_id = ? AND (user_id = ? OR user_id IS NULL)`,
      [societyId, req.user!.userId]
    );

    res.json({ message: 'All notifications marked as read.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark notifications as read.' });
  }
});
