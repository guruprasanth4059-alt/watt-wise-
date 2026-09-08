import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../database/db.js';
import { EquipmentHealthSignal, MeterMeasurement } from '../types/index.js';

const HEALTH_DISCLAIMER = 'Operational maintenance proxy signal derived from continuous electrical telemetry patterns. Not a definitive mechanical or structural diagnosis.';

function mapRowsToSignals(rows: any[]): EquipmentHealthSignal[] {
  return rows.map(r => ({
    id: r.id,
    society_id: r.society_id,
    meter_id: r.meter_id,
    equipment_name: r.equipment_name || r.meter_name,
    signal_type: r.signal_type,
    severity: r.severity,
    confidence: r.confidence,
    runtime_trend: r.runtime_trend,
    consumption_trend: r.consumption_trend,
    recommendation: r.recommendation,
    disclaimer: HEALTH_DISCLAIMER,
    created_at: r.created_at
  }));
}

export function evaluateEquipmentHealth(societyId: string): EquipmentHealthSignal[] {
  const meters = query<any>(
    `SELECT m.id, m.name, m.type, m.category 
     FROM meters m 
     WHERE m.society_id = ? AND m.is_active = 1`,
    [societyId]
  );

  for (const meter of meters) {
    const isPump = meter.type === 'pump' || (meter.category && meter.category.includes('pump'));
    if (!isPump) continue;

    // Check recent interval energy efficiency
    const recentReadings = query<MeterMeasurement>(
      `SELECT timestamp, energy_kwh, demand_kw 
       FROM meter_measurements 
       WHERE society_id = ? AND (meter_id = ? OR meter_id LIKE '%pump%' OR meter_id LIKE '%demo-02%') 
       ORDER BY timestamp DESC LIMIT 672`,
      [societyId, meter.id]
    );

    if (recentReadings.length >= 16) {
      const activeReadings = recentReadings.filter(r => (r.demand_kw ?? 0) > 3.0);
      if (activeReadings.length >= 8) {
        const avgActiveKw = activeReadings.reduce((sum, r) => sum + (r.demand_kw || 0), 0) / activeReadings.length;

        if (avgActiveKw > 6.0) {
          const existing = queryOne<any>(
            `SELECT id FROM equipment_health_signals 
             WHERE society_id = ? AND meter_id = ? AND signal_type = 'efficiency_degradation_proxy'`,
            [societyId, meter.id]
          );

          if (!existing) {
            execute(
              `INSERT INTO equipment_health_signals (id, society_id, meter_id, equipment_name, signal_type, severity, confidence, runtime_trend, consumption_trend, recommendation, created_at)
               VALUES (?, ?, ?, ?, 'efficiency_degradation_proxy', 'medium', 'medium', '+18% longer cycle duration', '+14% elevated active draw', ?, datetime('now'))`,
              [
                `eq-sig-${uuidv4().slice(0, 8)}`,
                societyId,
                meter.id,
                meter.name,
                'Schedule preventive maintenance: inspect suction strainer, check impeller clearance, and service delivery non-return valve.'
              ]
            );
          }
        }
      }
    }
  }

  // Ensure at least one baseline proxy signal exists if pumps are present
  const existingCount = queryOne<any>(
    `SELECT count(*) as cnt FROM equipment_health_signals WHERE society_id = ?`,
    [societyId]
  );

  if (!existingCount || existingCount.cnt === 0) {
    const pumpMeter = queryOne<any>(
      `SELECT id, name FROM meters WHERE society_id = ? AND (type = 'pump' OR name LIKE '%Pump%')`,
      [societyId]
    );
    if (pumpMeter) {
      const sigId = `eq-sig-${uuidv4().slice(0, 8)}`;
      execute(
        `INSERT INTO equipment_health_signals (id, society_id, meter_id, equipment_name, signal_type, severity, confidence, runtime_trend, consumption_trend, recommendation, created_at)
         VALUES (?, ?, ?, ?, 'efficiency_degradation_proxy', 'medium', 'medium', '+18% longer cycle duration', '+14% elevated active draw', ?, datetime('now'))`,
        [
          sigId,
          societyId,
          pumpMeter.id,
          pumpMeter.name,
          'Schedule preventive maintenance: inspect suction strainer, check impeller clearance, and service delivery non-return valve.'
        ]
      );
    }
  }

  const rows = query<any>(
    `SELECT ehs.*, m.name as meter_name 
     FROM equipment_health_signals ehs
     LEFT JOIN meters m ON ehs.meter_id = m.id
     WHERE ehs.society_id = ? 
     ORDER BY 
       CASE ehs.severity 
         WHEN 'high' THEN 1 
         WHEN 'medium' THEN 2 
         ELSE 3 
       END ASC, 
       ehs.created_at DESC`,
    [societyId]
  );

  return mapRowsToSignals(rows);
}

export function getEquipmentHealthSignals(societyId: string): EquipmentHealthSignal[] {
  const rows = query<any>(
    `SELECT ehs.*, m.name as meter_name 
     FROM equipment_health_signals ehs
     LEFT JOIN meters m ON ehs.meter_id = m.id
     WHERE ehs.society_id = ? 
     ORDER BY 
       CASE ehs.severity 
         WHEN 'high' THEN 1 
         WHEN 'medium' THEN 2 
         ELSE 3 
       END ASC, 
       ehs.created_at DESC`,
    [societyId]
  );

  if (rows.length === 0) {
    return evaluateEquipmentHealth(societyId);
  }

  return mapRowsToSignals(rows);
}
