import { sectionConfig } from '@/config/timeline';

const dive = sectionConfig('positioning');
const landing = sectionConfig('landing');
const [START_KM] = dive.keys.altitudeKm;
const LANDING_START_KM = 0.6;
const LANDING_END = landing.keys.pinDrop[1];

const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * Altitude shown on the meter (km). Log-scale countdown across the dive
 * (35,786 km → 0.6 km), then down to 0 as the pin lands.
 */
export function altitudeKm(pDive: number, pLanding: number) {
  if (pLanding > 0) {
    const t = Math.min(1, pLanding / LANDING_END);
    return LANDING_START_KM * Math.pow(1 - t, 1.6);
  }
  const t = ease(Math.min(1, Math.max(0, pDive)));
  return Math.exp(Math.log(START_KM) + (Math.log(LANDING_START_KM) - Math.log(START_KM)) * t);
}

export function formatAltitude(km: number) {
  if (km >= 100) return `${Math.round(km).toLocaleString('en-US')} km`;
  if (km >= 1) return `${km.toFixed(1)} km`;
  return `${Math.round(km * 1000)} m`;
}
