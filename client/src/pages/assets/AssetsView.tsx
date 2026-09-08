import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { EnergyAsset, EnergyFlowMap } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { StatCard } from '../../components/common/StatCard';
import {
  Layers,
  Zap,
  Sun,
  BatteryCharging,
  ArrowRight,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Activity,
  Cpu
} from 'lucide-react';

export const AssetsView: React.FC = () => {
  const [assets, setAssets] = useState<EnergyAsset[]>([]);
  const [flowMap, setFlowMap] = useState<EnergyFlowMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAsset, setNewAsset] = useState<Partial<EnergyAsset>>({
    name: '',
    asset_type: 'pump',
    location: '',
    building: '',
    capacity: 10,
    capacity_unit: 'kW',
    status: 'active',
    manufacturer: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [assetsData, flowData] = await Promise.all([
        api.get<EnergyAsset[]>('/assets'),
        api.get<EnergyFlowMap>('/assets/flow-map').catch(() => null)
      ]);
      setAssets(assetsData || []);
      setFlowMap(flowData);
    } catch (err) {
      console.error('Failed to load asset data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/assets', newAsset);
      setShowAddModal(false);
      setNewAsset({
        name: '',
        asset_type: 'pump',
        location: '',
        building: '',
        capacity: 10,
        capacity_unit: 'kW',
        status: 'active',
        manufacturer: ''
      });
      fetchData();
    } catch (err) {
      console.error('Failed to create asset:', err);
    }
  };

  const filteredAssets = assets.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.location && a.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.manufacturer && a.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'all' || a.asset_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalConnectedKw = assets.reduce((sum, a) => sum + (a.capacity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Energy Asset Management</h1>
            <Badge variant="primary">Phase 5</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Registered electrical equipment inventory, nameplate ratings, and live energy flow topology.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} icon={<RefreshCw size={14} />}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)} icon={<Plus size={14} />}>
            Register Asset
          </Button>
        </div>
      </div>

      {/* Top Stat Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Assets"
          value={assets.length}
          subtitle="Active community infrastructure"
          icon={<Layers className="text-blue-600" size={20} />}
        />
        <StatCard
          title="Connected Load"
          value={`${Math.round(totalConnectedKw)} kW`}
          subtitle="Sum of nameplate capacities"
          icon={<Zap className="text-amber-600" size={20} />}
        />
        <StatCard
          title="Grid Inflow"
          value={`${flowMap?.gridImportKw || 74.2} kW`}
          subtitle="Active sub-station draw"
          icon={<Activity className="text-indigo-600" size={20} />}
        />
        <StatCard
          title="Solar Generation"
          value={`${flowMap?.solarGenerationKw || 28.5} kW`}
          subtitle="Rooftop generation"
          icon={<Sun className="text-emerald-600" size={20} />}
        />
      </div>

      {/* Energy System Flow Map */}
      <Card
        title="Society Energy Flow Map"
        subtitle="End-to-end electrical distribution topology: Incomers → Main Switchboard → Sub-circuits"
        icon={<Cpu size={18} className="text-blue-600" />}
      >
        <div className="p-4 bg-slate-900 rounded-xl text-white overflow-x-auto">
          <div className="min-w-[700px] flex flex-col gap-6 items-center py-4">
            {/* Level 1: Incomers / Generation */}
            <div className="flex items-center justify-center gap-12 w-full">
              <div className="flex flex-col items-center bg-slate-800 border border-blue-500/40 rounded-lg p-3 w-48 text-center shadow-lg shadow-blue-500/10">
                <Zap className="text-blue-400 mb-1" size={24} />
                <span className="text-xs text-blue-300 font-semibold uppercase tracking-wider">11kV Grid Incomer</span>
                <span className="text-lg font-bold text-white mt-1">{flowMap?.gridImportKw || 74.2} kW</span>
                <span className="text-[11px] text-slate-400 mt-0.5">BESCOM 120kW Contract</span>
              </div>

              <div className="flex flex-col items-center bg-slate-800 border border-emerald-500/40 rounded-lg p-3 w-48 text-center shadow-lg shadow-emerald-500/10">
                <Sun className="text-emerald-400 mb-1" size={24} />
                <span className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">Rooftop Solar PV</span>
                <span className="text-lg font-bold text-white mt-1">{flowMap?.solarGenerationKw || 28.5} kW</span>
                <span className="text-[11px] text-slate-400 mt-0.5">35 kWp Clubhouse Array</span>
              </div>

              <div className="flex flex-col items-center bg-slate-800 border border-slate-600 rounded-lg p-3 w-48 text-center opacity-70">
                <Activity className="text-amber-400 mb-1" size={24} />
                <span className="text-xs text-amber-300 font-semibold uppercase tracking-wider">125kVA Backup DG</span>
                <span className="text-lg font-bold text-white mt-1">0.0 kW</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Standby (Grid Healthy)</span>
              </div>
            </div>

            {/* Central Bus */}
            <div className="w-full flex items-center justify-center relative py-2">
              <div className="h-8 w-0.5 bg-gradient-to-b from-blue-400 to-indigo-500"></div>
            </div>

            <div className="bg-gradient-to-r from-blue-900/80 via-indigo-900/80 to-purple-900/80 border border-indigo-500/60 rounded-xl px-8 py-3 w-3/4 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-3">
                <Cpu className="text-indigo-400" size={24} />
                <div>
                  <div className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Common LT Bus Switchboard</div>
                  <div className="text-xs text-slate-400">415V 3-Phase 50Hz • Main Power Factor 0.98 lag</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total Coincident Common Load</span>
                <span className="text-xl font-black text-white">
                  {Math.round(((flowMap?.gridImportKw || 74.2) + (flowMap?.solarGenerationKw || 28.5)) * 10) / 10} kW
                </span>
              </div>
            </div>

            <div className="w-full flex items-center justify-center relative py-2">
              <div className="h-8 w-0.5 bg-gradient-to-b from-indigo-500 to-slate-500"></div>
            </div>

            {/* Level 3: Distribution Feeders */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-300">Water Pumps & Sump</span>
                  <Badge variant="warning">26.2 kW</Badge>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">IE3 Borewell + Booster Set</p>
                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-blue-500 h-full w-[65%]"></div>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-300">EV Charging Bay</span>
                  <Badge variant="success">22.0 kW</Badge>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Dual Gun Type-2 Charger P1</p>
                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[50%]"></div>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-300">Passenger Elevators</span>
                  <Badge variant="info">18.0 kW</Badge>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Towers A & B (4x Lifts)</p>
                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-amber-500 h-full w-[45%]"></div>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-300">Basement Lighting</span>
                  <Badge variant="neutral">14.0 kW</Badge>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Radar Sensor LED Battens</p>
                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-purple-500 h-full w-[35%]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Asset Inventory Table */}
      <Card
        title="Asset Inventory"
        subtitle="Catalog of all electrical, mechanical, and generation assets registered in WattWise"
        icon={<Layers size={18} className="text-blue-600" />}
      >
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search assets by name, location, or manufacturer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Asset Types</option>
              <option value="pump">Pumps & Booster</option>
              <option value="solar">Solar PV</option>
              <option value="ev_charger">EV Chargers</option>
              <option value="lighting">Lighting Circuits</option>
              <option value="elevator">Elevators</option>
              <option value="generator">Backup DG</option>
              <option value="meter">Incomer / Transformers</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold">
              <tr>
                <th className="px-4 py-3 text-left">Asset Name</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Nameplate Rating</th>
                <th className="px-4 py-3 text-left">Manufacturer</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                        {asset.asset_type === 'solar' ? (
                          <Sun size={14} />
                        ) : asset.asset_type === 'ev_charger' ? (
                          <BatteryCharging size={14} />
                        ) : (
                          <Zap size={14} />
                        )}
                      </div>
                      <div>
                        <div>{asset.name}</div>
                        {asset.building && (
                          <div className="text-[11px] text-gray-400">{asset.building}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">
                    {asset.asset_type.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{asset.location || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {asset.capacity ? `${asset.capacity} ${asset.capacity_unit || 'kW'}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{asset.manufacturer || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={asset.status === 'active' ? 'success' : 'warning'}>
                      {asset.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No assets matched your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Register Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Register New Energy Asset</h2>
            <form onSubmit={handleCreateAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Asset Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sump Pump 3, Rooftop Solar Inverter 2"
                  value={newAsset.name}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Asset Type
                  </label>
                  <select
                    value={newAsset.asset_type}
                    onChange={(e) => setNewAsset({ ...newAsset, asset_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="pump">Water Pump / Sump</option>
                    <option value="solar">Rooftop Solar PV</option>
                    <option value="ev_charger">EV Charger</option>
                    <option value="lighting">Common Lighting</option>
                    <option value="elevator">Elevator / Lift</option>
                    <option value="generator">Diesel Generator</option>
                    <option value="battery">Battery Storage</option>
                    <option value="other">Other Asset</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Capacity Rating
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={newAsset.capacity}
                      onChange={(e) => setNewAsset({ ...newAsset, capacity: Number(e.target.value) })}
                      className="w-2/3 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <select
                      value={newAsset.capacity_unit}
                      onChange={(e) => setNewAsset({ ...newAsset, capacity_unit: e.target.value })}
                      className="w-1/3 px-2 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="kW">kW</option>
                      <option value="kWp">kWp</option>
                      <option value="HP">HP</option>
                      <option value="kWh">kWh</option>
                      <option value="kVA">kVA</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Basement 2 Sump Room"
                    value={newAsset.location || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Manufacturer / Model
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Grundfos, Kirloskar"
                    value={newAsset.manufacturer || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save Asset
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
