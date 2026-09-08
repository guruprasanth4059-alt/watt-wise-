import { v4 as uuidv4 } from 'uuid';
import { execute, query } from '../database/db.js';
import { AuditLog } from '../types/index.js';

export function logAuditEvent(params: {
  societyId: string;
  userId: string;
  eventType: 'login' | 'society_created' | 'bill_uploaded' | 'bill_verified' | 'bill_edited' | 'bill_deleted' | 'user_added' | 'role_changed' | 'recommendation_created' | 'action_completed' | 'report_generated' | 'subscription_changed';
  entityType: 'bill' | 'meter' | 'recommendation' | 'action' | 'report' | 'user' | 'society' | 'subscription';
  entityId?: string | null;
  metadata?: Record<string, any>;
}): void {
  try {
    const logId = `audit-${uuidv4().slice(0, 8)}`;
    execute(
      `INSERT INTO audit_logs (id, society_id, user_id, event_type, entity_type, entity_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        logId,
        params.societyId,
        params.userId,
        params.eventType,
        params.entityType,
        params.entityId || null,
        JSON.stringify(params.metadata || {})
      ]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export function getSocietyAuditLogs(societyId: string, limit = 50): AuditLog[] {
  const logs = query<any>(
    `SELECT a.*, u.name as user_name, u.email as user_email
     FROM audit_logs a
     LEFT JOIN users u ON a.user_id = u.id
     WHERE a.society_id = ?
     ORDER BY a.created_at DESC
     LIMIT ?`,
    [societyId, limit]
  );

  return logs.map(l => ({
    ...l,
    metadata: typeof l.metadata === 'string' ? JSON.parse(l.metadata || '{}') : l.metadata
  }));
}
