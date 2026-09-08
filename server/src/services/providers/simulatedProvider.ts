import { EnergyDataProvider, ProviderMeterInfo, ProviderSyncStatus, RawMeasurement } from './energyProvider.js';

export class SimulatedSmartMeterProvider implements EnergyDataProvider {
  readonly providerId = 'simulated_smart_meter';
  readonly providerName = 'Simulated Smart Meter (DEMO / SIMULATED DATA)';
  readonly isSimulated = true;

  async connect(config: Record<string, any>): Promise<{ success: boolean; connectionId?: string; error?: string }> {
    return {
      success: true,
      connectionId: `conn-sim-${Date.now().toString(36)}`
    };
  }

  async disconnect(connectionId: string): Promise<boolean> {
    return true;
  }

  async validateConnection(config: Record<string, any>): Promise<{ isValid: boolean; error?: string }> {
    return { isValid: true };
  }

  async fetchMeters(config: Record<string, any>): Promise<ProviderMeterInfo[]> {
    return [
      {
        externalId: 'EXT-SIM-MAIN-01',
        name: 'Main Feeder 415V Panel (Simulated)',
        type: 'common_area',
        serialNumber: 'SIM-BESCOM-99120'
      },
      {
        externalId: 'EXT-SIM-PUMP-02',
        name: 'Primary Sump Water Pump 15HP (Simulated)',
        type: 'pump',
        serialNumber: 'SIM-PUMP-4481'
      },
      {
        externalId: 'EXT-SIM-LIGHT-03',
        name: 'Basement & Perimeter Lighting Panel (Simulated)',
        type: 'lighting',
        serialNumber: 'SIM-LIGHT-8821'
      }
    ];
  }

  async fetchMeasurements(params: {
    externalMeterId: string;
    from: string;
    to: string;
    resolutionMinutes?: number;
  }): Promise<RawMeasurement[]> {
    const resolution = params.resolutionMinutes || 15;
    const fromTime = new Date(params.from).getTime();
    const toTime = new Date(params.to).getTime();

    const measurements: RawMeasurement[] = [];
    const intervalMs = resolution * 60 * 1000;

    const isPump = params.externalMeterId.toLowerCase().includes('pump');
    const isLighting = params.externalMeterId.toLowerCase().includes('light');

    const startBoundary = Math.floor(fromTime / intervalMs) * intervalMs;
    const endBoundary = Math.floor(toTime / intervalMs) * intervalMs;

    // Deterministic pseudo-random seed generator
    let seed = Math.abs(startBoundary % 100000);
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let t = startBoundary; t <= endBoundary; t += intervalMs) {
      const date = new Date(t);
      const hour = date.getUTCHours() + 5.5; // India offset approx for time of day simulation
      const normalizedHour = (hour % 24);

      let demandKw = 12.0;

      if (isPump) {
        // Pumps typically run 06:00-08:30 and 18:00-19:30
        const isMorningRun = normalizedHour >= 6 && normalizedHour <= 8.5;
        const isEveningRun = normalizedHour >= 18 && normalizedHour <= 19.5;
        // Inject a simulated overnight anomaly between 02:00 and 04:00 on recent days
        const isOvernightSpike = normalizedHour >= 2 && normalizedHour <= 3.75;

        if (isMorningRun) {
          demandKw = 11.2 + random() * 1.5;
        } else if (isEveningRun) {
          demandKw = 10.8 + random() * 1.2;
        } else if (isOvernightSpike) {
          // Anomalous continuous overnight run!
          demandKw = 12.4 + random() * 2.0;
        } else {
          demandKw = 0.2 + random() * 0.3; // idle float switch / standby
        }
      } else if (isLighting) {
        // Lighting active 18:00 - 06:00, peak 19:00 - 23:00
        if (normalizedHour >= 19 && normalizedHour <= 23) {
          demandKw = 4.8 + random() * 0.6;
        } else if (normalizedHour > 23 || normalizedHour < 6) {
          demandKw = 3.2 + random() * 0.4;
        } else {
          demandKw = 0.8 + random() * 0.3; // daytime minimal basement lights
        }
      } else {
        // Main Feeder aggregate diurnal curve
        if (normalizedHour >= 6 && normalizedHour <= 9) {
          demandKw = 26.0 + random() * 5.0; // morning peak
        } else if (normalizedHour >= 18 && normalizedHour <= 22) {
          demandKw = 28.0 + random() * 6.0; // evening peak
        } else if (normalizedHour >= 10 && normalizedHour <= 17) {
          demandKw = 16.0 + random() * 3.0; // daytime baseline
        } else {
          demandKw = 9.0 + random() * 2.5; // overnight baseline
        }
      }

      const hoursFraction = resolution / 60;
      const energyKwh = parseFloat((demandKw * hoursFraction).toFixed(4));
      const voltage = parseFloat((230 + (random() - 0.5) * 6).toFixed(1));
      const current = parseFloat(((demandKw * 1000) / (voltage * 0.95 * 1.732)).toFixed(2));
      const powerFactor = parseFloat((0.92 + random() * 0.06).toFixed(3));
      const frequency = parseFloat((49.95 + random() * 0.1).toFixed(2));

      measurements.push({
        timestamp: date.toISOString(),
        energy_kwh: energyKwh,
        demand_kw: parseFloat(demandKw.toFixed(2)),
        voltage,
        current,
        power_factor: powerFactor,
        frequency,
        quality_status: 'simulated'
      });
    }

    return measurements;
  }

  async getSyncStatus(connectionId: string): Promise<ProviderSyncStatus> {
    return {
      status: 'connected',
      lastSyncAt: new Date().toISOString(),
      recordsCount: 672
    };
  }
}
