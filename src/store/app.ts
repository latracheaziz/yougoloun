import { create } from 'zustand';
import type { Dir, Lang } from '@content/types';
import type { SectionId } from '@/config/timeline';
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
  stepTier: (delta: 1 | -1) => void;
  setTier: (tier: QualityTier) => void;

  activeSection: SectionId;
  setActiveSection: (id: SectionId) => void;

  reducedMotion: boolean;
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
}));
