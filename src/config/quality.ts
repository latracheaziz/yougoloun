/**
 * Rendering quality tiers. Chosen once at start-up from the device AND its GPU (integrated GPUs start at
 * 'medium'); drei's <PerformanceMonitor> can then step the tier at runtime.
 *
 * The client saw renderScale < 1 / no AA / plain materials as "low quality", so every tier keeps the
 * screen's resolution (up to the DPR cap), MSAA and clear-coat. The tiers trade the EXPENSIVE extras
 * instead: mirror reflections (a whole extra scene render), ambient occlusion, shadow-map size, MSAA
 * samples, bloom levels and particle counts.
 */
export type QualityTier = 'high' | 'medium' | 'low';
export type TextureSet = 'hd' | 'sd';

export interface QualityPreset {
  maxDpr: number;
  /** Multiplier on the device pixel ratio (kept at 1). */
  renderScale: number;
  /**
   * While the page scrolls, render at 1× density (restored ~0.35 s after it stops): smooth motion on
   * integrated GPUs, every still frame at full sharpness. Off on the high tier.
   */
  motionDpr: boolean;
  /** Bloom mip levels (fewer = cheaper, tighter glow). */
  bloomLevels: number;
  /** Particle budget multiplier: clouds, foliage cards, dive layers… */
  particles: number;
  /** MSAA samples of the postprocessing composer. */
  msaa: number;
  /** Screen-space ambient occlusion (N8AO), always half resolution when on. */
  ao: boolean;
  /** Mirror reflection on the pool in view (one at a time). */
  reflector: boolean;
  /** Sun shadow map size (px). */
  shadowMap: number;
  /**
   * Postprocessing composer (AO, bloom, MSAA buffer, vignette). Off → the renderer tone-maps itself
   * (same Neutral curve) with the browser's native MSAA: same colours and edges, no glow — and ~40% faster
   * on integrated GPUs (measured).
   */
  post: boolean;
}

export const qualityPresets: Record<QualityTier, QualityPreset> = {
  high: { maxDpr: 2, renderScale: 1, motionDpr: false, bloomLevels: 5, particles: 1, msaa: 4, ao: true, reflector: true, shadowMap: 2048, post: true },
  medium: { maxDpr: 1.25, renderScale: 1, motionDpr: true, bloomLevels: 4, particles: 0.7, msaa: 4, ao: false, reflector: false, shadowMap: 1024, post: false },
  low: { maxDpr: 1.5, renderScale: 1, motionDpr: true, bloomLevels: 3, particles: 0.45, msaa: 2, ao: false, reflector: false, shadowMap: 1024, post: false },
};

export const tierOrder: QualityTier[] = ['low', 'medium', 'high'];

/** Integrated / mobile / software GPUs, from an existing context (WEBGL_debug_renderer_info). */
export function isWeakGpu(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    return /intel|uhd|iris|mali|adreno|powervr|swiftshader|llvmpipe|basic render/i.test(name);
  } catch {
    return false;
  }
}

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
