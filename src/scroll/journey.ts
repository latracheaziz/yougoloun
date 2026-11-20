import { rangeProgress, timeline, type SectionId } from '@/config/timeline';
import { useApp } from '@/store/app';

/**
 * Per-frame scroll state — a plain mutable object, read by the WebGL layer in useFrame
 * and by DOM animations, without React re-renders.
 */
export const sectionIds = timeline.sections.map((s) => s.id) as SectionId[];
export const sectionIndex = Object.fromEntries(sectionIds.map((id, i) => [id, i])) as Record<SectionId, number>;

export const journey = {
  /** Current scroll position (px). */
  y: 0,
  /** Scroll velocity from Lenis (px / frame), 0 with native scroll. */
  velocity: 0,
  /** Height of one stage (px). */
  stageH: 0,
  /** Track start offsets and lengths (px). */
  starts: [] as number[],
  lengths: [] as number[],
  /** Index of the section whose track contains `y`. */
  index: 0,
  /** Local progress 0..1 of every section (clamped: past sections = 1, future = 0). */
  p: new Float32Array(sectionIds.length),
  /** 0..1 across all tracks. */
  global: 0,
  /** Scroll position (px) where the space part ends and the light document begins. */
  tracksEnd: 0,
};

/** Local progress of a section by id. */
export const progressOf = (id: SectionId) => journey.p[sectionIndex[id]];

type Listener = () => void;
const listeners = new Set<Listener>();
export function onJourney(fn: Listener) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** Pin the stage height in px. Only call on width / orientation changes (not on mobile URL-bar resizes). */
export function setStageHeight() {
  journey.stageH = window.innerHeight;
  document.documentElement.style.setProperty('--stage-h', `${journey.stageH}px`);
}

export function measure() {
  const tracks = sectionIds.map((id) => document.querySelector<HTMLElement>(`[data-track="${id}"]`));
  if (tracks.some((t) => !t)) return;
  const scrollY = window.scrollY;
  journey.starts = tracks.map((t) => t!.getBoundingClientRect().top + scrollY);
  journey.lengths = tracks.map((t) => t!.offsetHeight);
  update(journey.y);
}

export function update(y: number, velocity = 0) {
  journey.y = y;
  journey.velocity = velocity;
  const n = sectionIds.length;
  let index = 0;
  for (let i = 0; i < n; i++) {
    const start = journey.starts[i] ?? 0;
    const len = journey.lengths[i] || 1;
    journey.p[i] = Math.min(1, Math.max(0, (y - start) / len));
    if (y >= start) index = i;
  }
  journey.index = index;
  const end = (journey.starts[n - 1] ?? 0) + (journey.lengths[n - 1] ?? 0);
  journey.global = end > 0 ? Math.min(1, Math.max(0, y / end)) : 0;
  journey.tracksEnd = end;

  // inside the space part the active section is the current track; the light part sets its own
  if (y < end - journey.stageH * 0.5) {
    const active = sectionIds[index];
    if (useApp.getState().activeSection !== active) useApp.getState().setActiveSection(active);
  }
  listeners.forEach((fn) => fn());
}

/** Fade every stage in/out from its `content.enter` / `content.exit` ranges (see timeline.ts). */
export function bindStages() {
  const stages = sectionIds.map((id) => document.querySelector<HTMLElement>(`[data-stage="${id}"]`));
  const last = sectionIds.map(() => ({ in: -1, out: -1 }));
  const apply = () => {
    timeline.sections.forEach((s, i) => {
      const el = stages[i];
      if (!el) return;
      const p = journey.p[i];
      const vin = s.content.enter ? rangeProgress(p, s.content.enter) : 1;
      const vout = s.content.exit ? rangeProgress(p, s.content.exit) : 0;
      if (vin === last[i].in && vout === last[i].out) return;
      last[i] = { in: vin, out: vout };
      el.style.setProperty('--in', vin.toFixed(4));
      el.style.setProperty('--out', vout.toFixed(4));
      el.toggleAttribute('data-active', vin * (1 - vout) > 0.05);
    });
  };
  apply();
  return onJourney(apply);
}
