import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../database/db.js';
import { EnergyOpportunity, Recommendation } from '../types/index.js';
import { getActiveSocietyTariff } from './tariffEngine.js';

export function generateOpportunities(societyId: string): EnergyOpportunity[] {
  const tariff = getActiveSocietyTariff(societyId);
  const rate = tariff?.rate_per_kwh || 8.0;

  // Check existing opportunities count
  const existingCount = queryOne<{ count: number }>(
    `SELECT count(*) as count FROM energy_opportunities WHERE society_id = ?`,
    [societyId]
  )?.count || 0;

  if (existingCount === 0) {
    // Seed high-impact deterministic opportunities tailored to standard Indian apartment complexes
    const initialOpportunities: Array<{
      category: EnergyOpportunity['category'];
      title: string;
      description: string;
      evidence: string;
      kwh: number;
      confidence: 'low' | 'medium' | 'high';
      priority: 'high' | 'medium' | 'low';
      action: string;
    }> = [
      {
        category: 'water_pumps',
        title: 'Automation & Level-Based Cascade Pumping for Overhead Tanks',
        description: 'Implement dual ultrasonic continuous level sensors to eliminate dry runs and overflow hysteresis.',
        evidence: 'Sub-meter measurements show water pump circuits consuming 38% of common-area power with frequent 30-min dry-idle tails.',
        kwh: 1250,
        confidence: 'high',
        priority: 'high',
        action: 'Replace mechanical float switches with microcontroller-based ultrasonic level controller and automated sequential pump staging.'
      },
      {
        category: 'lighting',
        title: 'Basement & Stilt Parking Radar Motion Sensor Retrofit',
        description: 'Upgrade 24x7 36W fluorescent batten fixtures to 18W radar micro-dimming LED fixtures.',
        evidence: 'Basement lighting panel draws a flat 4.8 kW continuously 24 hours a day including mid-day low-traffic hours.',
        kwh: 1800,
        confidence: 'high',
        priority: 'high',
        action: 'Install 18W radar sensor LED battens that drop to 20% standby brightness when no vehicle or pedestrian movement is detected.'
      },
      {
        category: 'tariff_optimization',
        title: 'Shift STP Aeration Blowers to Off-Peak Tariff Window',
        description: 'Reschedule sewage treatment plant coarse bubble aeration cycles to BESCOM off-peak slot (22:00 to 06:00).',
        evidence: 'STP blowers currently run during peak evening tariff hours (18:00–22:00) attracting utility peak surcharges.',
        kwh: 650,
        confidence: 'medium',
        priority: 'medium',
        action: 'Reprogram STP control panel PLC timers to run aeration cycles primarily between 22:00 and 06:00.'
      },
      {
        category: 'elevators',
        title: 'Elevator Idle Sleep Mode & Modernization Drive Calibration',
        description: 'Enable automatic car fan, lighting, and inverter drive sleep timeout after 3 minutes of inactivity.',
        evidence: 'Elevator panel maintains 850W standby parasitic draw per shaft even between 01:00 and 05:00.',
        kwh: 420,
        confidence: 'medium',
        priority: 'low',
        action: 'Request OEM elevator maintenance vendor to enable V3F drive power-save mode during annual servicing.'
      }
    ];

    for (const opp of initialOpportunities) {
      const oppId = `opp-${uuidv4().slice(0, 8)}`;
      const costImpact = Math.round(opp.kwh * rate);

      execute(
        `INSERT INTO energy_opportunities (id, society_id, category, title, description, evidence, estimated_impact_kwh, estimated_impact_inr, confidence, priority, suggested_action, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'identified', datetime('now'), datetime('now'))`,
        [
          oppId,
          societyId,
          opp.category,
          opp.title,
          opp.description,
          opp.evidence,
          opp.kwh,
          costImpact,
          opp.confidence,
          opp.priority,
          opp.action
        ]
      );
    }
  }

  return getOpportunities(societyId);
}

export function getOpportunities(societyId: string): EnergyOpportunity[] {
  const rows = query<any>(
    `SELECT * FROM energy_opportunities 
     WHERE society_id = ? 
     ORDER BY 
       CASE priority 
         WHEN 'high' THEN 1 
         WHEN 'medium' THEN 2 
         ELSE 3 
       END ASC, 
       estimated_impact_inr DESC`,
    [societyId]
  );

  return rows.map(r => ({
    id: r.id,
    society_id: r.society_id,
    meter_id: r.meter_id,
    category: r.category,
    title: r.title,
    description: r.description,
    evidence: r.evidence,
    estimated_impact_kwh: r.estimated_impact_kwh,
    estimated_impact_inr: r.estimated_impact_inr,
    confidence: r.confidence,
    priority: r.priority,
    suggested_action: r.suggested_action,
    owner: r.owner,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at
  }));
}

export function convertOpportunityToRecommendation(
  oppId: string,
  societyId: string,
  userId: string
): Recommendation {
  const opp = queryOne<any>(
    `SELECT * FROM energy_opportunities WHERE id = ? AND society_id = ?`,
    [oppId, societyId]
  );

  if (!opp) {
    throw new Error('Opportunity not found.');
  }

  const recId = `rec-${uuidv4().slice(0, 8)}`;
  execute(
    `INSERT INTO recommendations (id, society_id, title, description, reason, suggested_action, evidence, potential_impact, priority, estimated_savings, status, category, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_started', ?, datetime('now'))`,
    [
      recId,
      societyId,
      opp.title,
      opp.description,
      opp.evidence,
      opp.suggested_action,
      opp.evidence,
      `Estimated monthly impact: ~${opp.estimated_impact_kwh} kWh (₹${opp.estimated_impact_inr})`,
      opp.priority,
      opp.estimated_impact_inr,
      opp.category
    ]
  );

  // Update opportunity status
  execute(
    `UPDATE energy_opportunities SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?`,
    [oppId]
  );

  return queryOne<Recommendation>(`SELECT * FROM recommendations WHERE id = ?`, [recId])!;
}
