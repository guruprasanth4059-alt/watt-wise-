import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute, transaction } from '../database/db.js';
import { providerRegistry } from './providers/registry.js';
import { RawMeasurement } from './providers/energyProvider.js';
import { evaluateIntervalAnomalies } from './intervalAnomalies.js';
import { logAuditEvent } from './audit.js';
import { MeterConnection, ConnectionStatus } from '../types/index.js';

export interface IngestionResult {
  success: boolean;
  recordsIngested: number;
  recordsSkipped: number;
  anomaliesDetected: number;
  lastSyncAt: string;
  errorMessage?: string;
}

export async function connectMeterToProvider(params: {
  societyId: string;
  meterId: string;
  providerId: string;
  externalMeterId?: string;
  config?: Record<string, any>;
  userId: string;
}): Promise<MeterConnection> {
  const provider = providerRegistry.get(params.providerId);
  if (!provider) {
    throw new Error(`Provider "${params.providerId}" is not registered or supported.`);
  }

  // Validate connection with provider
  const validation = await provider.validateConnection(params.config || {});
  if (!validation.isValid) {
    throw new Error(`Provider connection failed: ${validation.error || 'Invalid credentials or configuration'}`);
  }

  const existing = queryOne<MeterConnection>(
    'SELECT * FROM meter_connections WHERE meter_id = ?',
    [params.meterId]
  );

  const connectionId = existing?.id || `conn-${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();
  const dataSource = provider.isSimulated ? 'demo' : 'smart_meter';

  if (existing) {
    execute(
      `UPDATE meter_connections 
       SET provider = ?, status = 'connected', external_meter_id = ?, data_source = ?, config = ?, updated_at = ?
       WHERE id = ?`,
      [params.providerId, params.externalMeterId || null, dataSource, JSON.stringify(params.config || {}), now, existing.id]
    );
  } else {
    execute(
      `INSERT INTO meter_connections (id, society_id, meter_id, provider, status, external_meter_id, data_source, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'connected', ?, ?, ?, ?, ?)`,
      [connectionId, params.societyId, params.meterId, params.providerId, params.externalMeterId || null, dataSource, JSON.stringify(params.config || {}), now, now]
    );
  }

  // Update meter metadata
  execute(
    `UPDATE meters SET connection_status = 'connected', data_source = ? WHERE id = ?`,
    [dataSource, params.meterId]
  );

  logAuditEvent({
    societyId: params.societyId,
    userId: params.userId,
    eventType: 'bill_verified', // audit category
    entityType: 'meter',
    entityId: params.meterId,
    metadata: { action: 'meter_connected', provider: params.providerId, externalMeterId: params.externalMeterId }
  });

  return queryOne<MeterConnection>('SELECT * FROM meter_connections WHERE id = ?', [connectionId])!;
}

export async function syncMeterData(params: {
  societyId: string;
  meterId: string;
  daysBack?: number;
  userId?: string;
}): Promise<IngestionResult> {
  const connection = queryOne<MeterConnection>(
    'SELECT * FROM meter_connections WHERE meter_id = ? AND society_id = ?',
    [params.meterId, params.societyId]
  );

  if (!connection) {
    throw new Error('Meter does not have an active provider connection.');
  }

  const provider = providerRegistry.get(connection.provider);
  if (!provider) {
    throw new Error(`Provider "${connection.provider}" is unavailable.`);
  }

  const daysBack = params.daysBack || 7;
  const to = new Date();
  const from = new Date(to.getTime() - daysBack * 24 * 60 * 60 * 1000);

  // Set syncing status
  execute(`UPDATE meter_connections SET status = 'syncing' WHERE id = ?`, [connection.id]);
  execute(`UPDATE meters SET connection_status = 'syncing' WHERE id = ?`, [params.meterId]);

  try {
    const rawMeasurements = await provider.fetchMeasurements({
      externalMeterId: connection.external_meter_id || params.meterId,
      from: from.toISOString(),
      to: to.toISOString(),
      resolutionMinutes: 15
    });

    let recordsIngested = 0;
    let recordsSkipped = 0;
    const now = new Date().toISOString();

    // Idempotent batch insertion
    transaction(() => {
      for (const m of rawMeasurements) {
        // Validation checks on impossible values
        if (m.energy_kwh < 0 || (m.demand_kw && m.demand_kw > 1000) || (m.voltage && (m.voltage < 100 || m.voltage > 350))) {
          recordsSkipped++;
          continue;
        }

        const measurementId = `meas-${uuidv4().slice(0, 8)}`;
        const source = provider.isSimulated ? 'demo' : 'smart_meter';
        const quality = m.quality_status || (provider.isSimulated ? 'simulated' : 'valid');

        // SQLite Upsert using UNIQUE(meter_id, timestamp, source)
        execute(
          `INSERT INTO meter_measurements (id, society_id, meter_id, timestamp, energy_kwh, demand_kw, voltage, current, power_factor, frequency, source, quality_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(meter_id, timestamp, source) DO UPDATE SET
             energy_kwh = excluded.energy_kwh,
             demand_kw = excluded.demand_kw,
             voltage = excluded.voltage,
             current = excluded.current,
             power_factor = excluded.power_factor,
             frequency = excluded.frequency,
             quality_status = excluded.quality_status`,
          [
            measurementId,
            params.societyId,
            params.meterId,
            m.timestamp,
            m.energy_kwh,
            m.demand_kw || null,
            m.voltage || null,
            m.current || null,
            m.power_factor || null,
            m.frequency || null,
            source,
            quality
          ]
        );
        recordsIngested++;
      }
    });

    // Update connection health and last sync
    execute(
      `UPDATE meter_connections 
       SET status = 'connected', last_sync_at = ?, last_success_at = ?, records_received = records_received + ?, last_error_message = NULL, updated_at = ?
       WHERE id = ?`,
      [now, now, recordsIngested, now, connection.id]
    );

    execute(
      `UPDATE meters SET connection_status = 'connected' WHERE id = ?`,
      [params.meterId]
    );

    // Evaluate interval anomalies on newly ingested data
    const evalResult = evaluateIntervalAnomalies(params.societyId, params.meterId);

    if (params.userId) {
      logAuditEvent({
        societyId: params.societyId,
        userId: params.userId,
        eventType: 'bill_verified',
        entityType: 'meter',
        entityId: params.meterId,
        metadata: { action: 'meter_synced', recordsIngested, anomaliesFound: evalResult.newAnomaliesCount }
      });
    }

    return {
      success: true,
      recordsIngested,
      recordsSkipped,
      anomaliesDetected: evalResult.newAnomaliesCount,
      lastSyncAt: now
    };
  } catch (err: any) {
    const now = new Date().toISOString();
    execute(
      `UPDATE meter_connections 
       SET status = 'sync_error', last_error_at = ?, last_error_message = ?, updated_at = ?
       WHERE id = ?`,
      [now, err.message || 'Sync failed', now, connection.id]
    );
    execute(
      `UPDATE meters SET connection_status = 'sync_error' WHERE id = ?`,
      [params.meterId]
    );

    throw err;
  }
}

export function disconnectMeter(societyId: string, meterId: string, userId: string): boolean {
  execute(
    `UPDATE meter_connections 
     SET status = 'disconnected', updated_at = datetime('now')
     WHERE meter_id = ? AND society_id = ?`,
    [meterId, societyId]
  );

  execute(
    `UPDATE meters SET connection_status = 'disconnected' WHERE id = ? AND society_id = ?`,
    [meterId, societyId]
  );

  logAuditEvent({
    societyId,
    userId,
    eventType: 'bill_verified',
    entityType: 'meter',
    entityId: meterId,
    metadata: { action: 'meter_disconnected' }
  });

  return true;
}

export function getMeterConnectionHealth(societyId: string, meterId: string): any {
  const conn = queryOne<any>(
    `SELECT mc.*, m.name as meter_name, m.meter_number, m.type, m.building, m.area
     FROM meter_connections mc
     JOIN meters m ON mc.meter_id = m.id
     WHERE mc.meter_id = ? AND mc.society_id = ?`,
    [meterId, societyId]
  );

  if (!conn) return null;

  let latencyMinutes = 0;
  if (conn.last_sync_at) {
    latencyMinutes = Math.round((Date.now() - new Date(conn.last_sync_at).getTime()) / (60 * 1000));
  }

  return {
    ...conn,
    latencyMinutes,
    isSimulated: conn.data_source === 'demo'
  };
}
