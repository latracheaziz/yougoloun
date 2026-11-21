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
  /** MSAA samples of the postprocessing composer (smooth edges on the glossy objects). */
  msaa: number;
  /** Screen-space ambient occlusion (N8AO): grounds the architecture. */
  ao: 'full' | 'half' | 'off';
}

export const qualityPresets: Record<QualityTier, QualityPreset> = {
  // Resolution is never scaled below the screen's own (that read as "low quality"); the tiers trade
  // DPR above 1.5, bloom levels, stars, particles and MSAA instead.
  high: { maxDpr: 2, renderScale: 1, bloomLevels: 6, earthSegments: 160, stars: 4000, bloom: true, chromaticAberration: false, transmission: true, particles: 1, msaa: 8, ao: 'full' },
  medium: { maxDpr: 1.75, renderScale: 1, bloomLevels: 5, earthSegments: 128, stars: 3000, bloom: true, chromaticAberration: false, transmission: false, particles: 0.65, msaa: 4, ao: 'half' },
  low: { maxDpr: 1.5, renderScale: 1, bloomLevels: 4, earthSegments: 80, stars: 1800, bloom: true, chromaticAberration: false, transmission: false, particles: 0.4, msaa: 4, ao: 'off' },
};

export const tierOrder: QualityTier[] = ['low', 'medium', 'high'];

export function detectDevice() {
  if (typeof window === 'undefined') return { tier: 'high' as QualityTier, textures: 'hd' as TextureSet, mobile: false, locked: false };
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 768;
  const mobile = coarse && narrow;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowMemory = (nav.deviceMemory ?? 8) <= 4;
  const fewCores = (navigator.hardwareConcurrency ?? 8) <= 4;

  let tier: QualityTier = mobile ? 'low' : lowMemory || fewCores ? 'medium' : 'high';
  // dev-only: force a tier with ?tier=low|medium|high
  const forced = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('tier') : null;
  const locked = forced === 'low' || forced === 'medium' || forced === 'high';
  if (locked) tier = forced;
  const textures: TextureSet = mobile || narrow ? 'sd' : 'hd';
  return { tier, textures, mobile, locked };
}
