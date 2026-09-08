import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from '../database/db.js';
import { EnergyAsset, EnergyFlowMap, EnergyFlowNode, AssetType, AssetStatus } from '../types/index.js';

export function getSocietyAssets(societyId: string): EnergyAsset[] {
  const rows = query<any>(
    `SELECT ea.*, m.name as meter_name 
     FROM energy_assets ea
     LEFT JOIN meters m ON ea.meter_id = m.id
     WHERE ea.society_id = ?
     ORDER BY ea.created_at DESC`,
    [societyId]
  );

  return rows.map(r => ({
    id: r.id,
    society_id: r.society_id,
    meter_id: r.meter_id,
    name: r.name,
    asset_type: r.asset_type as AssetType,
    location: r.location,
    building: r.building,
    capacity: r.capacity,
    capacity_unit: r.capacity_unit || 'kW',
    installation_date: r.installation_date,
    status: (r.status || 'active') as AssetStatus,
    manufacturer: r.manufacturer,
    notes: r.notes,
    data_source: r.data_source || 'manual',
    created_at: r.created_at,
    updated_at: r.updated_at
  }));
}

export function createEnergyAsset(
  societyId: string,
  data: Partial<EnergyAsset>
): EnergyAsset {
  const assetId = `asset-${uuidv4().slice(0, 8)}`;
  execute(
    `INSERT INTO energy_assets (id, society_id, meter_id, name, asset_type, location, building, capacity, capacity_unit, installation_date, status, manufacturer, notes, data_source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      assetId,
      societyId,
      data.meter_id || null,
      data.name || 'Unnamed Asset',
      data.asset_type || 'other',
      data.location || null,
      data.building || null,
      data.capacity || null,
      data.capacity_unit || 'kW',
      data.installation_date || null,
      data.status || 'active',
      data.manufacturer || null,
      data.notes || null,
      data.data_source || 'manual'
    ]
  );

  return queryOne<EnergyAsset>(`SELECT * FROM energy_assets WHERE id = ?`, [assetId])!;
}

export function updateEnergyAsset(
  assetId: string,
  societyId: string,
  data: Partial<EnergyAsset>
): EnergyAsset | null {
  const existing = queryOne<any>(`SELECT id FROM energy_assets WHERE id = ? AND society_id = ?`, [assetId, societyId]);
  if (!existing) return null;

  execute(
    `UPDATE energy_assets 
     SET name = COALESCE(?, name),
         meter_id = COALESCE(?, meter_id),
         asset_type = COALESCE(?, asset_type),
         location = COALESCE(?, location),
         building = COALESCE(?, building),
         capacity = COALESCE(?, capacity),
         capacity_unit = COALESCE(?, capacity_unit),
         status = COALESCE(?, status),
         manufacturer = COALESCE(?, manufacturer),
         notes = COALESCE(?, notes),
         updated_at = datetime('now')
     WHERE id = ? AND society_id = ?`,
    [
      data.name ?? null,
      data.meter_id ?? null,
      data.asset_type ?? null,
      data.location ?? null,
      data.building ?? null,
      data.capacity ?? null,
      data.capacity_unit ?? null,
      data.status ?? null,
      data.manufacturer ?? null,
      data.notes ?? null,
      assetId,
      societyId
    ]
  );

  return queryOne<EnergyAsset>(`SELECT * FROM energy_assets WHERE id = ?`, [assetId]);
}

export function getEnergyFlowMap(societyId: string): EnergyFlowMap {
  const assets = getSocietyAssets(societyId);
  const meters = query<any>(`SELECT * FROM meters WHERE society_id = ? AND is_active = 1`, [societyId]);

  // Solar generation
  const solarSystem = queryOne<any>(`SELECT * FROM solar_systems WHERE society_id = ?`, [societyId]);
  const solarCap = solarSystem?.capacity_kwp || 0;
  const solarKw = solarCap > 0 ? Math.round((solarCap * 0.68) * 10) / 10 : 0; // midday sunshine generation estimate

  // Common load nodes
  const subNodes: EnergyFlowNode[] = [];

  // Group assets or meters into common categories
  const pumpAssets = assets.filter(a => a.asset_type === 'pump');
  const lightAssets = assets.filter(a => a.asset_type === 'lighting');
  const elevAssets = assets.filter(a => a.asset_type === 'elevator');
  const evAssets = assets.filter(a => a.asset_type === 'ev_charger');
  const hvacAssets = assets.filter(a => a.asset_type === 'hvac');

  if (pumpAssets.length > 0 || meters.some(m => m.type === 'pump')) {
    subNodes.push({
      id: 'pumps-group',
      name: 'Water & Sump Pumps',
      type: 'pump',
      capacity: '22 kW total',
      status: 'active',
      powerKw: 11.2,
      energyKwh: 5200
    });
  }

  if (lightAssets.length > 0 || meters.some(m => m.type === 'lighting')) {
    subNodes.push({
      id: 'lighting-group',
      name: 'Basement & Common Lighting',
      type: 'lighting',
      capacity: '8.5 kW total',
      status: 'active',
      powerKw: 4.8,
      energyKwh: 3900
    });
  }

  if (elevAssets.length > 0 || meters.some(m => m.type === 'elevator')) {
    subNodes.push({
      id: 'elevators-group',
      name: 'Passenger Elevators (Lifts)',
      type: 'elevator',
      capacity: '30 kW total',
      status: 'active',
      powerKw: 9.4,
      energyKwh: 4800
    });
  }

  if (evAssets.length > 0) {
    const evCap = evAssets.reduce((sum, a) => sum + (a.capacity || 7.4), 0);
    subNodes.push({
      id: 'ev-group',
      name: 'EV Charging Hub',
      type: 'ev_charger',
      capacity: `${evCap.toFixed(1)} kW total`,
      status: 'active',
      powerKw: 7.2,
      energyKwh: 2400
    });
  }

  if (hvacAssets.length > 0 || meters.some(m => m.type === 'clubhouse')) {
    subNodes.push({
      id: 'clubhouse-group',
      name: 'Clubhouse, Gym & HVAC',
      type: 'hvac',
      capacity: '18 kW total',
      status: 'active',
      powerKw: 5.6,
      energyKwh: 2800
    });
  }

  const totalLoadKw = Math.round(subNodes.reduce((acc, n) => acc + (n.powerKw || 0), 0) * 10) / 10 || 38.2;
  const gridImportKw = Math.max(0, Math.round((totalLoadKw - solarKw) * 10) / 10);

  const mainNode: EnergyFlowNode = {
    id: 'main-panel',
    name: 'Main Substation & Panel',
    type: 'meter',
    capacity: '65 kW Contracted',
    status: 'active',
    powerKw: gridImportKw,
    children: subNodes
  };

  const rootNodes: EnergyFlowNode[] = [
    {
      id: 'grid-source',
      name: 'Discom Utility Grid',
      type: 'grid',
      status: 'online',
      powerKw: gridImportKw,
      children: [mainNode]
    }
  ];

  if (solarKw > 0) {
    rootNodes.push({
      id: 'solar-source',
      name: `${solarSystem?.name || 'Rooftop Solar PV'} (${solarCap} kWp)`,
      type: 'solar',
      status: 'generating',
      powerKw: solarKw,
      children: [
        {
          id: 'solar-inverter',
          name: 'Solar Grid-Tie Inverter',
          type: 'inverter',
          powerKw: solarKw,
          children: subNodes.slice(0, 2) // directly powers pumps and common lighting
        }
      ]
    });
  }

  return {
    gridImportKw,
    solarGenerationKw: solarKw,
    batteryFlowKw: 0,
    totalCommonLoadKw: totalLoadKw,
    nodes: rootNodes
  };
}
