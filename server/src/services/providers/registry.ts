import { EnergyDataProvider } from './energyProvider.js';
import { SimulatedSmartMeterProvider } from './simulatedProvider.js';

class ProviderRegistry {
  private providers: Map<string, EnergyDataProvider> = new Map();

  constructor() {
    // Register simulated provider for development, testing, and demo
    const simProvider = new SimulatedSmartMeterProvider();
    this.register(simProvider);
  }

  register(provider: EnergyDataProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  get(providerId: string): EnergyDataProvider | undefined {
    if (providerId === 'simulated' || providerId === 'demo') {
      return this.providers.get('simulated_smart_meter');
    }
    return this.providers.get(providerId);
  }

  getAll(): Array<{ providerId: string; providerName: string; isSimulated: boolean }> {
    return Array.from(this.providers.values()).map(p => ({
      providerId: p.providerId,
      providerName: p.providerName,
      isSimulated: p.isSimulated
    }));
  }
}

export const providerRegistry = new ProviderRegistry();
