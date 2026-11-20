/**
 * Rendering quality tiers. The texture set (hd/sd) is chosen once at start-up;
 * drei's <PerformanceMonitor> can then step the tier down (DPR, effects, particles) at runtime.
 */
export type QualityTier = 'high' | 'medium' | 'low';
export type TextureSet = 'hd' | 'sd';

export interface QualityPreset {
  maxDpr: number;
  /** Multiplier on the device pixel ratio — the PerformanceMonitor's main lever on 1× screens. */
  renderScale: number;
  /** Bloom mip levels (fewer = cheaper, tighter glow). */
  bloomLevels: number;
  earthSegments: number;
  stars: number;
  bloom: boolean;
  chromaticAberration: boolean;
  /** MeshTransmissionMaterial for the services glass panel (Phase 3). */
  transmission: boolean;
  /** Particle budget multiplier for dive clouds, sand, embers… */
  particles: number;
}

export const qualityPresets: Record<QualityTier, QualityPreset> = {
  high: { maxDpr: 2, renderScale: 1, bloomLevels: 7, earthSegments: 160, stars: 7000, bloom: true, chromaticAberration: true, transmission: true, particles: 1 },
  medium: { maxDpr: 1.5, renderScale: 0.85, bloomLevels: 6, earthSegments: 128, stars: 4500, bloom: true, chromaticAberration: false, transmission: false, particles: 0.65 },
  low: { maxDpr: 1.25, renderScale: 0.72, bloomLevels: 5, earthSegments: 80, stars: 2600, bloom: true, chromaticAberration: false, transmission: false, particles: 0.4 },
};

export const tierOrder: QualityTier[] = ['low', 'medium', 'high'];

export function detectDevice() {
  if (typeof window === 'undefined') return { tier: 'high' as QualityTier, textures: 'hd' as TextureSet, mobile: false };
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 768;
  const mobile = coarse && narrow;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowMemory = (nav.deviceMemory ?? 8) <= 4;
  const fewCores = (navigator.hardwareConcurrency ?? 8) <= 4;

  let tier: QualityTier = mobile ? 'low' : lowMemory || fewCores ? 'medium' : 'high';
  // dev-only: force a tier with ?tier=low|medium|high
  const forced = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('tier') : null;
  if (forced === 'low' || forced === 'medium' || forced === 'high') tier = forced;
  const textures: TextureSet = mobile || narrow ? 'sd' : 'hd';
  return { tier, textures, mobile };
}
