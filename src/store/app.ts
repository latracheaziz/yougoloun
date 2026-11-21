import { create } from 'zustand';
import type { Dir, Lang } from '@content/types';
import { detectDevice, tierOrder, type QualityTier, type TextureSet } from '@/config/quality';

/** Low-frequency app state (React re-renders on change). Per-frame scroll data lives in scroll/journey.ts. */
interface AppState {
  lang: Lang;
  dir: Dir;
  setLang: (lang: Lang, dir: Dir) => void;

  tier: QualityTier;
  /** Best tier this device may reach (the start-up detection); runtime upgrades never exceed it. */
  maxTier: QualityTier;
  textures: TextureSet;
  mobile: boolean;
  /** Dev: the tier was forced with ?tier= — the PerformanceMonitor must not change it. */
  tierLocked: boolean;
  stepTier: (delta: 1 | -1) => void;
  setTier: (tier: QualityTier) => void;

  /** Section currently on screen: a space track id, or a light section id (see NavTarget). */
  activeSection: string;
  setActiveSection: (id: string) => void;

  reducedMotion: boolean;

  /** The WebGL canvas is mounted and has its globe ready (the paper layer may reveal it). */
  glReady: boolean;
  setGlReady: (ready: boolean) => void;
}

const device = detectDevice();
const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const useApp = create<AppState>((set, get) => ({
  lang: 'ar',
  dir: 'rtl',
  setLang: (lang, dir) => set({ lang, dir }),

  tier: device.tier,
  maxTier: device.tier,
  textures: device.textures,
  mobile: device.mobile,
  tierLocked: device.locked,
  stepTier: (delta) => {
    const { tier, maxTier } = get();
    const max = tierOrder.indexOf(maxTier);
    const next = tierOrder[Math.min(max, Math.max(0, tierOrder.indexOf(tier) + delta))];
    if (next !== tier) set({ tier: next });
  },
  setTier: (tier) => set({ tier }),

  activeSection: 'home',
  setActiveSection: (id) => set({ activeSection: id }),

  reducedMotion: reduced,

  glReady: false,
  setGlReady: (glReady) => set({ glReady }),
}));
