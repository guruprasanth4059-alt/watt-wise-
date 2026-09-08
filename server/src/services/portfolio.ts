import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../database/db.js';
import { EnergyPortfolioSummary, EnergyTarget } from '../types/index.js';
import { getActiveSocietyTariff } from './tariffEngine.js';
import { getSustainabilityMetrics } from './sustainability.js';

export function getEnergyTargets(societyId: string): EnergyTarget[] {
  const rows = query<any>(
    `SELECT * FROM energy_targets WHERE society_id = ? ORDER BY target_year ASC`,
    [societyId]
  );
  return rows.map(r => ({
    id: r.id,
    society_id: r.society_id,
    target_year: r.target_year,
    consumption_reduction_pct: r.consumption_reduction_pct,
    cost_reduction_pct: r.cost_reduction_pct,
    renewable_contribution_pct: r.renewable_contribution_pct,
    peak_demand_target_kw: r.peak_demand_target_kw,
    notes: r.notes
  }));
}

export function createEnergyTarget(
  societyId: string,
  data: Partial<EnergyTarget>
): EnergyTarget {
  const id = `target-${uuidv4().slice(0, 8)}`;
  const currentYear = new Date().getFullYear();

  execute(
    `INSERT INTO energy_targets (id, society_id, target_year, consumption_reduction_pct, cost_reduction_pct, renewable_contribution_pct, peak_demand_target_kw, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      id,
      societyId,
      data.target_year || currentYear,
      data.consumption_reduction_pct ?? 10,
      data.cost_reduction_pct ?? 8,
      data.renewable_contribution_pct ?? 20,
      data.peak_demand_target_kw ?? null,
      data.notes || null
    ]
  );

  return queryOne<EnergyTarget>(`SELECT * FROM energy_targets WHERE id = ?`, [id])!;
}

export function updateEnergyTarget(
  id: string,
  societyId: string,
  data: Partial<EnergyTarget>
): EnergyTarget | null {
  const existing = queryOne<any>(`SELECT * FROM energy_targets WHERE id = ? AND society_id = ?`, [id, societyId]);
  if (!existing) return null;

  const sets: string[] = [];
  const values: any[] = [];

  if (data.target_year !== undefined) {
    sets.push('target_year = ?');
    values.push(data.target_year);
  }
  if (data.consumption_reduction_pct !== undefined) {
    sets.push('consumption_reduction_pct = ?');
    values.push(data.consumption_reduction_pct);
  }
  if (data.cost_reduction_pct !== undefined) {
    sets.push('cost_reduction_pct = ?');
    values.push(data.cost_reduction_pct);
  }
  if (data.renewable_contribution_pct !== undefined) {
    sets.push('renewable_contribution_pct = ?');
    values.push(data.renewable_contribution_pct);
  }
  if (data.peak_demand_target_kw !== undefined) {
    sets.push('peak_demand_target_kw = ?');
    values.push(data.peak_demand_target_kw);
  }
  if (data.notes !== undefined) {
    sets.push('notes = ?');
    values.push(data.notes);
  }

  if (sets.length > 0) {
    values.push(id, societyId);
    execute(`UPDATE energy_targets SET ${sets.join(', ')} WHERE id = ? AND society_id = ?`, values);
  }

  return queryOne<EnergyTarget>(`SELECT * FROM energy_targets WHERE id = ?`, [id]);
}

export function deleteEnergyTarget(id: string, societyId: string): boolean {
  execute(`DELETE FROM energy_targets WHERE id = ? AND society_id = ?`, [id, societyId]);
  return true;
}

export function getEnergyPortfolioSummary(societyId: string): EnergyPortfolioSummary {
  // 1. Annual energy consumption from bills or estimated
  const bills = query<any>(
    `SELECT consumption_kwh, amount FROM bills 
     WHERE society_id = ? 
     ORDER BY billing_period_start DESC LIMIT 12`,
    [societyId]
  );

  let annualEnergyKwh = bills.reduce((sum, b) => sum + (b.consumption_kwh || 0), 0);
  let annualEnergyCostInr = bills.reduce((sum, b) => sum + (b.amount || 0), 0);

  if (annualEnergyKwh === 0) {
    annualEnergyKwh = 245000;
    annualEnergyCostInr = 1960000;
  }

  // 2. Solar generation
  const solarSystems = query<any>(
    `SELECT * FROM solar_systems WHERE society_id = ? AND status = 'active'`,
    [societyId]
  );
  const totalSolarCapKwp = solarSystems.reduce((sum, s) => sum + (s.capacity_kwp || 0), 0);

  const solarRow = queryOne<any>(
    `SELECT SUM(generation_kwh) as total_gen 
     FROM solar_measurements 
     WHERE society_id = ? AND date >= date('now', '-365 days')`,
    [societyId]
  );
  let renewableGenerationKwh = solarRow?.total_gen || 0;
  if (renewableGenerationKwh === 0 && totalSolarCapKwp > 0) {
    renewableGenerationKwh = Math.round(totalSolarCapKwp * 1450); // ~1450 kWh/kWp/year in South India
  }

  const renewableContributionPct =
    annualEnergyKwh > 0
      ? Math.min(100, Math.round((renewableGenerationKwh / annualEnergyKwh) * 1000) / 10)
      : 0;

  // 3. Peak Demand
  const soc = queryOne<any>(
    `SELECT sanctioned_load_kw, contracted_demand_kva FROM societies WHERE id = ?`,
    [societyId]
  );
  const contractedPeakKw = soc?.sanctioned_load_kw || 120;

  const maxReading = queryOne<any>(
    `SELECT MAX(demand_kw) as max_kw 
     FROM meter_measurements 
     WHERE society_id = ? AND timestamp >= datetime('now', '-30 days')`,
    [societyId]
  );
  const currentPeakKw = maxReading?.max_kw ? Math.round(maxReading.max_kw * 10) / 10 : 98.4;

  // 4. EV Energy
  const evRow = queryOne<any>(
    `SELECT SUM(energy_consumed_kwh) as total_ev 
     FROM ev_sessions 
     WHERE society_id = ? AND start_time >= datetime('now', '-30 days')`,
    [societyId]
  );
  const evEnergyConsumedKwh = Math.round((evRow?.total_ev || 1420) * 10) / 10;

  // 5. Projects
  const projects = query<any>(
    `SELECT * FROM energy_projects WHERE society_id = ?`,
    [societyId]
  );

  const activeProjectsCount = projects.filter(
    p => p.status === 'in_progress' || p.status === 'completed' || p.status === 'monitoring'
  ).length;

  const totalInvestedCapexInr = projects.reduce(
    (sum, p) => sum + (p.actual_cost_inr || p.estimated_cost_inr || 0),
    0
  );

  const potentialAnnualSavingsInr = projects.reduce(
    (sum, p) => sum + (p.estimated_annual_savings_inr || 0),
    0
  );

  const realizedAnnualSavingsInr = projects
    .filter(p => p.status === 'completed' || p.status === 'monitoring')
    .reduce((sum, p) => sum + (p.observed_annual_savings_inr || p.estimated_annual_savings_inr || 0), 0);

  // 6. Sustainability / Carbon
  const sust = getSustainabilityMetrics(societyId, 365);
  const co2EmissionsTons = sust.gridEmissionsTons;
  const co2SavedTons = sust.solarAvoidedEmissionsTons;

  // 7. Energy Mix
  const gridKwh = Math.max(0, annualEnergyKwh - renewableGenerationKwh);
  const totalKwh = gridKwh + renewableGenerationKwh || 1;
  const energyMix = [
    {
      source: 'Grid (DISCOM)',
      percentage: Math.round((gridKwh / totalKwh) * 100),
      kwh: gridKwh,
      color: '#3B82F6'
    },
    {
      source: 'Rooftop Solar PV',
      percentage: Math.round((renewableGenerationKwh / totalKwh) * 100),
      kwh: renewableGenerationKwh,
      color: '#10B981'
    }
  ];

  return {
    annualEnergyKwh,
    annualEnergyCostInr,
    renewableGenerationKwh,
    renewableContributionPct,
    currentPeakKw,
    contractedPeakKw,
    evEnergyConsumedKwh,
    activeProjectsCount,
    potentialAnnualSavingsInr,
    realizedAnnualSavingsInr,
    totalInvestedCapexInr,
    co2EmissionsTons,
    co2SavedTons,
    energyMix
  };
}
