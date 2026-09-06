import { TransferConfig } from '../types/transport';
import { DEFAULT_TRANSFER_CONFIG } from '../data/transferDefaults';
import { DEFAULT_MUNICIPIO_MULTIPLIERS } from '../data/municipioPriceMultipliers';
import { apiGet, apiPut } from './apiClient';
import { getAdminPassword } from './authStore';

export async function getTransferConfig(): Promise<TransferConfig> {
  try {
    const data = await apiGet<unknown>('transfer-config');
    const record = (data as Record<string, unknown>)?.record ?? data;
    const merged = mergeConfigWithDefaults(record as Partial<TransferConfig>);
    return ensureDistanceDiscountFields(merged);
  } catch (error) {
    console.error('Failed to fetch transfer config:', error);
    return {
      ...DEFAULT_TRANSFER_CONFIG,
      vehicleTypes: [...DEFAULT_TRANSFER_CONFIG.vehicleTypes],
    };
  }
}

export async function saveTransferConfig(config: TransferConfig): Promise<void> {
  await apiPut<unknown>('transfer-config', { record: config });
}

function mergeConfigWithDefaults(partial: Partial<TransferConfig>): TransferConfig {
  const partialAny = partial as Partial<TransferConfig> & { municipioMultipliers?: Record<string, number> };

  return {
    airport: partial.airport ?? DEFAULT_TRANSFER_CONFIG.airport,
    currency: partial.currency ?? DEFAULT_TRANSFER_CONFIG.currency,
    vehicleTypes: Array.isArray(partial.vehicleTypes) && partial.vehicleTypes.length > 0
      ? partial.vehicleTypes.map((vt) => ({
          ...DEFAULT_TRANSFER_CONFIG.vehicleTypes.find((dv) => dv.key === vt.key),
          ...vt,
        }))
      : [...DEFAULT_TRANSFER_CONFIG.vehicleTypes],
    zones: Array.isArray(partial.zones) ? partial.zones : [],
    modifiers: {
      ...DEFAULT_TRANSFER_CONFIG.modifiers,
      ...(partial.modifiers ?? {}),
      municipioMultipliers: {
        ...DEFAULT_MUNICIPIO_MULTIPLIERS,
        ...(partial.modifiers?.municipioMultipliers ?? partialAny.municipioMultipliers ?? {}),
      },
    },
  };
}

function ensureDistanceDiscountFields(config: TransferConfig): TransferConfig {
  if (config.modifiers.minimumPrice === undefined || config.modifiers.minimumPrice === null) {
    config.modifiers.minimumPrice = DEFAULT_TRANSFER_CONFIG.modifiers.minimumPrice;
  }

  if (config.modifiers.distanceDiscountMaxPercent === undefined) {
    config.modifiers.distanceDiscountMaxPercent = DEFAULT_TRANSFER_CONFIG.modifiers.distanceDiscountMaxPercent;
  }

  if (config.modifiers.distanceDiscountSaturationKm === undefined) {
    config.modifiers.distanceDiscountSaturationKm =
      (config.modifiers as any).distanceDiscountHalfKm ?? DEFAULT_TRANSFER_CONFIG.modifiers.distanceDiscountSaturationKm;
  }

  delete (config.modifiers as any).distanceDiscountKm;
  delete (config.modifiers as any).distanceDiscountPercent;
  delete (config.modifiers as any).distanceDiscountHalfKm;

  return config;
}

export async function createVehicleType(config: TransferConfig, newVt: TransferConfig['vehicleTypes'][0]): Promise<TransferConfig> {
  const updated = {
    ...config,
    vehicleTypes: [...config.vehicleTypes, newVt],
  };
  await saveTransferConfig(updated);
  return updated;
}

export async function updateVehicleType(config: TransferConfig, updatedVt: TransferConfig['vehicleTypes'][0]): Promise<TransferConfig> {
  const updated = {
    ...config,
    vehicleTypes: config.vehicleTypes.map((v) => (v.key === updatedVt.key ? updatedVt : v)),
  };
  await saveTransferConfig(updated);
  return updated;
}

export async function deleteVehicleType(config: TransferConfig, vehicleKey: string): Promise<TransferConfig> {
  const updated = {
    ...config,
    vehicleTypes: config.vehicleTypes.filter((v) => v.key !== vehicleKey),
  };
  await saveTransferConfig(updated);
  return updated;
}

export async function updateModifiers(config: TransferConfig, newModifiers: TransferConfig['modifiers']): Promise<TransferConfig> {
  const updated = { ...config, modifiers: newModifiers };
  await saveTransferConfig(updated);
  return updated;
}

export async function uploadVehicleImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'transport_vehicles');

  const adminPassword = getAdminPassword() ?? '';

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'X-Admin-Password': adminPassword,
      },
      body: formData,
    });
    const data = await response.json();
    return data.secure_url || '';
  } catch (error) {
    console.error('Vehicle image upload failed:', error);
    return '';
  }
}

export async function createZone(config: TransferConfig, newZone: any): Promise<TransferConfig> {
  const zones = config.zones || [];
  const updated = {
    ...config,
    zones: [...zones, newZone],
  };
  await saveTransferConfig(updated);
  return updated;
}

export async function updateZone(config: TransferConfig, updatedZone: any): Promise<TransferConfig> {
  const zones = config.zones || [];
  const updated = {
    ...config,
    zones: zones.map((z) => (z.key === updatedZone.key ? updatedZone : z)),
  };
  await saveTransferConfig(updated);
  return updated;
}

export async function deleteZone(config: TransferConfig, zoneKey: string): Promise<TransferConfig> {
  const zones = config.zones || [];
  const updated = {
    ...config,
    zones: zones.filter((z) => z.key !== zoneKey),
  };
  await saveTransferConfig(updated);
  return updated;
}

export async function updateMunicipioPriceMultipliers(config: TransferConfig, newMultipliers: Record<string, number>): Promise<TransferConfig> {
  const updated = {
    ...config,
    modifiers: {
      ...config.modifiers,
      municipioMultipliers: newMultipliers,
    },
  };
  await saveTransferConfig(updated);
  return updated;
}
