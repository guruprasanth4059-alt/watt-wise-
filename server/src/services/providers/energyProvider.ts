export interface RawMeasurement {
  timestamp: string; // ISO-8601 UTC
  energy_kwh: number;
  demand_kw?: number | null;
  voltage?: number | null;
  current?: number | null;
  power_factor?: number | null;
  frequency?: number | null;
  quality_status?: 'valid' | 'suspect' | 'missing' | 'estimated' | 'simulated';
}

export interface ProviderMeterInfo {
  externalId: string;
  name: string;
  type: string;
  serialNumber?: string;
}

export interface ProviderSyncStatus {
  status: 'connected' | 'syncing' | 'sync_error' | 'disconnected';
  lastSyncAt?: string;
  recordsCount?: number;
  errorMessage?: string;
}

export interface EnergyDataProvider {
  readonly providerId: string;
  readonly providerName: string;
  readonly isSimulated: boolean;

  connect(config: Record<string, any>): Promise<{ success: boolean; connectionId?: string; error?: string }>;
  disconnect(connectionId: string): Promise<boolean>;
  validateConnection(config: Record<string, any>): Promise<{ isValid: boolean; error?: string }>;
  fetchMeters(config: Record<string, any>): Promise<ProviderMeterInfo[]>;
  fetchMeasurements(params: {
    externalMeterId: string;
    from: string; // ISO string
    to: string;   // ISO string
    resolutionMinutes?: number;
  }): Promise<RawMeasurement[]>;
  getSyncStatus(connectionId: string): Promise<ProviderSyncStatus>;
}
