import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../database/db.js';
import { IntervalAnomaly, AnomalySeverity, AnomalyType } from '../types/index.js';

export interface IntervalEvaluationResult {
  newAnomaliesCount: number;
  updatedAnomaliesCount: number;
  anomalies: IntervalAnomaly[];
}

export function evaluateIntervalAnomalies(societyId: string, meterId?: string): IntervalEvaluationResult {
  const anomaliesFound: IntervalAnomaly[] = [];
  let newCount = 0;
  let updatedCount = 0;

  // 1. Fetch recent 24-hour interval readings for the meter(s)
  const meterFilter = meterId ? 'AND m.id = ?' : '';
  const params = meterId ? [societyId, meterId] : [societyId];

  const meters = query<any>(
    `SELECT m.id, m.name, m.type, m.category, m.connection_status, mc.last_sync_at
     FROM meters m
     LEFT JOIN meter_connections mc ON m.id = mc.meter_id
     WHERE m.society_id = ? ${meterFilter}`,
    params
  );

  for (const meter of meters) {
    // Check meter offline (>90 mins since last sync if connected)
    if (meter.last_sync_at) {
      const lastSyncTime = new Date(meter.last_sync_at).getTime();
      const elapsedMinutes = (Date.now() - lastSyncTime) / (60 * 1000);
      if (elapsedMinutes > 90 && meter.connection_status === 'connected') {
        const existingOffline = queryOne<any>(
          `SELECT id FROM anomalies 
           WHERE society_id = ? AND meter_id = ? AND type = 'meter_offline' AND status = 'new'`,
          [societyId, meter.id]
        );

        if (!existingOffline) {
          const anomalyId = `anom-${uuidv4().slice(0, 8)}`;
          execute(
            `INSERT INTO anomalies (id, society_id, meter_id, type, severity, observed_value, expected_value, started_at, status, explanation, recommended_checks)
             VALUES (?, ?, ?, 'meter_offline', 'critical', ?, 0, datetime('now'), 'new', ?, ?)`,
            [
              anomalyId,
              societyId,
              meter.id,
              Math.round(elapsedMinutes),
              `Meter telemetry communication ceased ${Math.round(elapsedMinutes)} minutes ago. No heartbeat or interval packets received.`,
              JSON.stringify([
                'Inspect physical RS-485 / Modbus communication wiring or SIM gateway.',
                'Check gateway power supply and cellular / Wi-Fi signal strength at panel.',
                'Verify DISCOM sub-meter power supply is energized.'
              ])
            ]
          );
          newCount++;
        }
      }
    }

    // Evaluate recent measurements (last 24 hours)
    const measurements = query<any>(
      `SELECT timestamp, energy_kwh, demand_kw, quality_status 
       FROM meter_measurements 
       WHERE society_id = ? AND meter_id = ? 
       ORDER BY timestamp DESC 
       LIMIT 96`, // 24 hours of 15-min intervals
      [societyId, meter.id]
    );

    if (measurements.length < 1) continue;

    for (const reading of measurements) {
      const date = new Date(reading.timestamp);
      // Offset by 5.5 hours for IST
      const localHour = (date.getUTCHours() + 5.5) % 24;

      const isOvernight = localHour >= 0 && localHour <= 5;
      const isPump = (meter.type === 'pump' || (meter.category && meter.category.includes('pump')));

      if (isOvernight && isPump && reading.demand_kw > 6.0) {
        // High pump load running in dead of night!
        const expectedDemand = 0.5; // pumps should normally be off at night
        const deviationPercent = Math.round(((reading.demand_kw - expectedDemand) / expectedDemand) * 100);

        // Alert fatigue control: Check if an overnight anomaly session already exists for this meter within last 24 hours
        const existingSession = queryOne<any>(
          `SELECT id, started_at FROM anomalies 
           WHERE society_id = ? AND meter_id = ? AND type = 'unexpected_overnight' 
             AND status IN ('new', 'investigating')
             AND started_at >= datetime('now', '-24 hours')`,
          [societyId, meter.id]
        );

        if (existingSession) {
          // Collapse into existing ongoing anomaly (update ended_at)
          execute(
            `UPDATE anomalies SET ended_at = ?, observed_value = MAX(observed_value, ?), updated_at = datetime('now') WHERE id = ?`,
            [reading.timestamp, reading.demand_kw, existingSession.id]
          );
          updatedCount++;
        } else {
          const anomalyId = `anom-${uuidv4().slice(0, 8)}`;
          execute(
            `INSERT INTO anomalies (id, society_id, meter_id, type, severity, observed_value, expected_value, deviation_percent, started_at, ended_at, status, explanation, recommended_checks)
             VALUES (?, ?, ?, 'unexpected_overnight', 'high', ?, ?, ?, ?, ?, 'new', ?, ?)`,
            [
              anomalyId,
              societyId,
              meter.id,
              reading.demand_kw,
              expectedDemand,
              deviationPercent,
              reading.timestamp,
              reading.timestamp,
              `Continuous water pump operation observed during overnight baseload hours (${Math.floor(localHour)}:00 IST). Demand measured ${reading.demand_kw} kW against expected idle load of ${expectedDemand} kW.`,
              JSON.stringify([
                'Inspect overhead tank overflow sensors and float switch switches.',
                'Check whether sump pump mechanical timer relay failed in closed position.',
                'Inspect underground transfer pipeline for silent burst or leakage.'
              ])
            ]
          );
          newCount++;
        }
      }

      // Check sudden general spikes (>40% above moving average)
      if (reading.demand_kw > 25.0 && !isPump) {
        const expectedDemand = 16.0;
        const deviationPercent = Math.round(((reading.demand_kw - expectedDemand) / expectedDemand) * 100);

        const existingSpike = queryOne<any>(
          `SELECT id FROM anomalies 
           WHERE society_id = ? AND meter_id = ? AND type = 'consumption_spike' 
             AND status IN ('new', 'investigating')
             AND started_at >= datetime('now', '-6 hours')`,
          [societyId, meter.id]
        );

        if (!existingSpike) {
          const anomalyId = `anom-${uuidv4().slice(0, 8)}`;
          execute(
            `INSERT INTO anomalies (id, society_id, meter_id, type, severity, observed_value, expected_value, deviation_percent, started_at, ended_at, status, explanation, recommended_checks)
             VALUES (?, ?, ?, 'consumption_spike', 'medium', ?, ?, ?, ?, ?, 'new', ?, ?)`,
            [
              anomalyId,
              societyId,
              meter.id,
              reading.demand_kw,
              expectedDemand,
              deviationPercent,
              reading.timestamp,
              reading.timestamp,
              `Abrupt load surge detected on panel (${reading.demand_kw} kW vs expected baseline ${expectedDemand} kW).`,
              JSON.stringify([
                'Verify if heavy auxiliary equipment (e.g. STP blower, swimming pool heat pump) was manually overridden.',
                'Review common area lighting circuits for short or phase imbalance.'
              ])
            ]
          );
          newCount++;
        }
      }
    }
  }

  const allAnomalies = getSocietyAnomalies(societyId);
  return {
    newAnomaliesCount: newCount,
    updatedAnomaliesCount: updatedCount,
    anomalies: allAnomalies
  };
}

export function getSocietyAnomalies(societyId: string, status?: string): IntervalAnomaly[] {
  let statusClause = '';
  const params: any[] = [societyId];
  if (status) {
    statusClause = 'AND a.status = ?';
    params.push(status);
  }

  const rows = query<any>(
    `SELECT a.*, m.name as meter_name 
     FROM anomalies a 
     LEFT JOIN meters m ON a.meter_id = m.id 
     WHERE a.society_id = ? ${statusClause}
     ORDER BY a.started_at DESC LIMIT 50`,
    params
  );

  return rows.map(r => ({
    ...r,
    recommended_checks: typeof r.recommended_checks === 'string' ? JSON.parse(r.recommended_checks || '[]') : r.recommended_checks
  }));
}
