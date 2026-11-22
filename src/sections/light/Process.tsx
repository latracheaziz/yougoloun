import { useEffect, useRef, useState, type ComponentType, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useContent } from '@/i18n/LangContext';
import { useReveal } from '@/interaction/useReveal';
import { useApp } from '@/store/app';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { getLenis } from '@/scroll/SmoothScroll';
import { SectionMark } from '@/components/SectionMark';
import { BubbleMark } from '@/components/Wordmark';
import { feedPosts, platforms, trackingTags } from '@/config/light';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * PDF §8 — "How we work", as a live growth dashboard.
 *
 * Desktop: the section pins (CSS sticky) and scroll walks through the four steps. The step list
 * (start side) has a gradient rail that fills with the scroll; the active step opens. Beside it, one
 * navy dashboard panel plays a scene per step: audit radar → roadmap + tracking → production +
 * channels going live → conversions, A/B winner, scaling budget. The panel leans toward the
 * pointer; the conversions chart has a crosshair. Click a step to jump to it.
 * Touch / tablet / reduced motion: the steps stack, each with its own panel, played as it comes in.
 * Copy: steps from the PDF (`process`), dashboard labels from `ui.process`.
 */

const PIN_MEDIA = '(min-width: 1024px) and (prefers-reduced-motion: no-preference)';
const FINE = '(hover: hover) and (pointer: fine)';
/** Scroll length of one step while pinned (svh). */
const STEP_SVH = 85;

const pad = (n: number) => String(n).padStart(2, '0');
/** Physical `left` (%) of a point of a chart drawn LTR and mirrored in RTL. */
const side = (x: number, rtl: boolean) => (rtl ? 100 - x : x);

/** Section on screen (lower part of the viewport excluded with `margin`). */
function useInView(ref: RefObject<HTMLElement | null>, margin = '0px') {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return inView;
}

/**
 * A scene's entrance: built when it becomes active, reverted when it leaves (the natural DOM state
 * is the finished state, so an outgoing scene fades out complete and reduced motion shows it as is).
 */
function useScene(scope: RefObject<HTMLElement | null>, active: boolean, build: (tl: gsap.core.Timeline, rtl: boolean) => void) {
  const reduced = useApp((s) => s.reducedMotion);
  const t = useContent();
  useGSAP(
    () => {
      if (!active || reduced) return;
      build(gsap.timeline({ defaults: { duration: 0.9, ease: 'expo.out' } }), t.dir === 'rtl');
    },
    { scope, dependencies: [active, reduced, t.lang], revertOnUpdate: true },
  );
}

/* ── Glyphs (24×24) ─────────────────────────────────────────────────────────────────────── */
const GLYPHS = {
  check: 'M5 12.5l4.2 4.2L19 7',
  play: 'M8 5.5v13l10.5-6.5z',
  trend: 'M2.5 17.5l6.5-6.5 4 4 8.5-8.5M15.5 6.5h6v6',
  spark: 'M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5zM19 15.5c.3 2 1.2 2.9 3 3-1.8.3-2.7 1.2-3 3-.3-1.8-1.2-2.7-3-3 1.8-.1 2.7-1 3-3z',
  site: 'M3.5 5h17v14h-17zM3.5 9h17M6.5 7h.01M9 7h.01',
} as const;

function Glyph({ name, className = 'size-4', fill = false }: { name: keyof typeof GLYPHS; className?: string; fill?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`shrink-0 ${className}`}>
      <path d={GLYPHS[name]} fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Shared SVG gradients (one Process is mounted at a time). */
function Gradients() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="proc-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--color-blue)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-green)' }} />
        </linearGradient>
        <linearGradient id="proc-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--color-blue-light)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-green-light)' }} />
        </linearGradient>
        <linearGradient id="proc-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--color-blue)', stopOpacity: 0.34 }} />
          <stop offset="1" style={{ stopColor: 'var(--color-green)', stopOpacity: 0 }} />
        </linearGradient>
        <linearGradient id="proc-radar" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--color-blue)', stopOpacity: 0.42 }} />
          <stop offset="1" style={{ stopColor: 'var(--color-green)', stopOpacity: 0.32 }} />
        </linearGradient>
        {/* radar sweep: bright on its leading edge (radar coordinates, see Audit) */}
        <linearGradient id="proc-sweep" gradientUnits="userSpaceOnUse" x1="160" y1="48" x2="257" y2="104">
          <stop offset="0" style={{ stopColor: 'var(--color-green-light)', stopOpacity: 0 }} />
          <stop offset="1" style={{ stopColor: 'var(--color-green-light)', stopOpacity: 0.32 }} />
        </linearGradient>
      </defs>
    </svg>
  );
}

const CARD = 'rounded-2xl bg-white/[0.04] ring-1 ring-inset ring-white/10';
type SceneProps = { active: boolean; fill: boolean };

/* ── 01 · Discovery & audit: a radar scan of the brand, today vs potential ──────────────── */
const RC = 160;
const RR = 112;
const D = Math.SQRT1_2;
/** Axes on the diagonals (start-top, end-top, end-bottom, start-bottom), so labels sit in the corners. */
const DIRS = [[-D, -D], [D, -D], [D, D], [-D, D]] as const;
const TODAY = [0.46, 0.34, 0.52, 0.3];
const POTENTIAL = [0.9, 0.8, 0.93, 0.84];
const rp = (v: number, k: number) => [RC + DIRS[k][0] * RR * v, RC + DIRS[k][1] * RR * v] as const;
const shape = (vals: readonly number[]) => `M${vals.map((v, k) => rp(v, k).map((n) => n.toFixed(1)).join(',')).join(' L')} Z`;

function Audit({ active, fill }: SceneProps) {
  const t = useContent();
  const a = t.ui.process.audit;
  const rtl = t.dir === 'rtl';
  const ref = useRef<HTMLDivElement>(null);
  useScene(ref, active, (tl, rtl) => {
    tl.from('[data-ring]', { scale: 0.3, autoAlpha: 0, transformOrigin: '50% 50%', stagger: 0.08, duration: 1.1 }, 0)
      .from('[data-axis]', { autoAlpha: 0, duration: 0.6, stagger: 0.06 }, 0.2)
      .from('[data-axis-label]', { autoAlpha: 0, y: 8, stagger: 0.07, duration: 0.7 }, 0.45)
      .fromTo('[data-today]', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, 0.5)
      .from('[data-today-fill]', { autoAlpha: 0, duration: 0.6 }, 1.3)
      .from('[data-pot]', { scale: 0.15, autoAlpha: 0, transformOrigin: '50% 50%', duration: 1.5, ease: 'elastic.out(1, 0.65)' }, 1.4)
      .from('[data-vertex]', { scale: 0, transformOrigin: '50% 50%', stagger: 0.09, duration: 0.6, ease: 'back.out(3)' }, 1.8)
      .from('[data-row]', { autoAlpha: 0, x: rtl ? -18 : 18, stagger: 0.1, duration: 0.8 }, 0.3)
      .from('[data-row-bar]', { scaleX: 0, transformOrigin: rtl ? 'right center' : 'left center', stagger: 0.28, duration: 1.1, ease: 'power3.inOut' }, 0.8)
      .from('[data-check]', { scale: 0, autoAlpha: 0, stagger: 0.28, duration: 0.55, ease: 'back.out(3)' }, 1.7)
      .from('[data-legend]', { autoAlpha: 0, duration: 0.6 }, 2.4)
      .from('[data-found]', { autoAlpha: 0, y: 14, scale: 0.9, duration: 0.9, ease: 'back.out(2)' }, 2.8);
  });

  return (
    <div ref={ref} className={`flex flex-col items-center gap-6 p-5 @lg:flex-row @lg:gap-8 @lg:p-8 ${fill ? 'h-full justify-center' : ''}`}>
      {/* radar */}
      <div className="relative aspect-square w-[min(100%,19rem)] shrink-0 @lg:w-[min(52%,24rem)]">
        <svg viewBox="0 0 320 320" className="absolute inset-0 size-full overflow-visible rtl:-scale-x-100">
          {[0.25, 0.5, 0.75, 1].map((r) => (
            <circle key={r} data-ring cx={RC} cy={RC} r={RR * r} fill="none" stroke="#fff" strokeOpacity={r === 1 ? 0.22 : 0.1} strokeDasharray={r === 1 ? undefined : '2 5'} />
          ))}
          {DIRS.map((_, k) => {
            const [x, y] = rp(1, k);
            return <line key={k} data-axis x1={RC} y1={RC} x2={x} y2={y} stroke="#fff" strokeOpacity="0.14" />;
          })}
          <g className="proc-sweep">
            <path d={`M${RC},${RC} L160,48 A${RR},${RR} 0 0 1 257,104 Z`} fill="url(#proc-sweep)" />
            <line x1={RC} y1={RC} x2="257" y2="104" stroke="var(--color-green-light)" strokeOpacity="0.55" strokeWidth="1.2" />
          </g>
          <path data-today-fill d={shape(TODAY)} fill="#fff" fillOpacity="0.06" />
          <path data-today d={shape(TODAY)} pathLength={1} strokeDasharray="1" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.6" strokeLinejoin="round" />
          <path data-pot d={shape(POTENTIAL)} fill="url(#proc-radar)" stroke="url(#proc-g)" strokeWidth="2.2" strokeLinejoin="round" />
          {POTENTIAL.map((v, k) => {
            const [x, y] = rp(v, k);
            return (
              <g key={k} data-vertex>
                <circle cx={x} cy={y} r="9" fill="var(--color-green-light)" className="proc-pulse" style={{ animationDelay: `${k * 0.45}s` }} />
                <circle cx={x} cy={y} r="4.5" fill="var(--color-green-light)" stroke="var(--color-navy)" strokeWidth="2" />
              </g>
            );
          })}
        </svg>
        {a.axes.map((label, k) => {
          const x = 50 + (DIRS[k][0] * RR * 100) / 320;
          const y = 50 + (DIRS[k][1] * RR * 100) / 320;
          return (
            <span key={label} className="absolute" style={{ left: `${side(x, rtl)}%`, top: `${y}%`, transform: `translate(-50%, ${k < 2 ? 'calc(-100% - 10px)' : '10px'})` }}>
              <span data-axis-label className="block whitespace-nowrap rounded-full bg-navy px-2.5 py-1 text-[0.7rem] leading-none text-white/80 ring-1 ring-inset ring-white/15">
                {label}
              </span>
            </span>
          );
        })}
      </div>

      {/* what the audit checks, and what it finds */}
      <div className="w-full min-w-0 max-w-[24rem] flex-1">
        <ul className="space-y-3.5">
          {a.axes.map((label, k) => (
            <li key={label} data-row className="flex items-center gap-3">
              <span className="relative grid size-6 shrink-0 place-items-center rounded-full ring-1 ring-inset ring-white/20">
                <span data-check className="absolute inset-0 grid place-items-center rounded-full bg-brand-gradient text-ink">
                  <Glyph name="check" className="size-3.5" />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.82rem] leading-tight text-white/85">{label}</span>
                <span className="relative mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10">
                  <span data-row-bar className="absolute inset-y-0 start-0 rounded-full bg-brand-gradient" style={{ width: `${POTENTIAL[k] * 100}%` }} />
                  <span className="absolute inset-y-0 start-0 rounded-full bg-white/55" style={{ width: `${TODAY[k] * 100}%` }} />
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p data-legend className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.72rem] text-white/60">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-4 rounded-full bg-white/55" />
            {a.today}
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-4 rounded-full bg-brand-gradient" />
            {a.potential}
          </span>
        </p>
        <p data-found className="bubble mt-5 inline-flex items-center gap-2 bg-brand-gradient px-3.5 py-2 text-[0.82rem] font-medium text-ink">
          <Glyph name="spark" fill className="size-4" />
          {a.found}
        </p>
      </div>
    </div>
  );
}

/* ── 02 · Strategy & infrastructure: roadmap + tracking connected ───────────────────────── */
const WEEKS = 8;
const GANTT = [
  { from: 0, span: 3, tone: 'bg-brand-gradient' },
  { from: 1, span: 4, tone: 'bg-blue' },
  { from: 2, span: 4, tone: 'bg-green' },
  { from: 4, span: 4, tone: 'bg-blue-light' },
] as const;
/** Tracking tags around the site hub (% of the network box, LTR). */
const NODES = [
  { x: 21, y: 20 },
  { x: 79, y: 20 },
  { x: 21, y: 80 },
  { x: 79, y: 80 },
] as const;

function Strategy({ active, fill }: SceneProps) {
  const t = useContent();
  const r = t.ui.process.roadmap;
  const rtl = t.dir === 'rtl';
  const ref = useRef<HTMLDivElement>(null);
  const net = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 600, h: 220 });

  // the network is drawn in pixels (no stretched strokes): follow the box size
  useEffect(() => {
    const el = net.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: Math.max(1, e.contentRect.width), h: Math.max(1, e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useScene(ref, active, (tl, rtl) => {
    tl.from('[data-gantt]', { autoAlpha: 0, y: 16, duration: 0.8 }, 0)
      .from('[data-week]', { autoAlpha: 0, y: -6, stagger: 0.04, duration: 0.5 }, 0.15)
      .from('[data-task]', { scaleX: 0, transformOrigin: rtl ? 'right center' : 'left center', stagger: 0.22, duration: 1.1, ease: 'power3.inOut' }, 0.35)
      .from('[data-net]', { autoAlpha: 0, y: 16, duration: 0.8 }, 0.5)
      .from('[data-hub]', { scale: 0.4, autoAlpha: 0, duration: 0.9, ease: 'back.out(2.4)' }, 0.8)
      .fromTo('[data-wire]', { strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: 0.15, duration: 0.9, ease: 'power2.inOut' }, 1.0)
      .from('[data-node]', { scale: 0.6, autoAlpha: 0, stagger: 0.15, duration: 0.7, ease: 'back.out(2.4)' }, 1.4)
      .from('[data-on]', { scale: 0, stagger: 0.3, duration: 0.4, ease: 'back.out(3)' }, 2.0)
      .from('[data-connected]', { autoAlpha: 0, y: -4, stagger: 0.3, duration: 0.5 }, 2.05)
      .from('[data-packets]', { autoAlpha: 0, duration: 0.8 }, 2.4);
  });

  const hub = { x: box.w / 2, y: box.h / 2 };
  const wires = NODES.map((n) => {
    const x = (side(n.x, rtl) / 100) * box.w;
    const y = (n.y / 100) * box.h;
    const mx = (hub.x + x) / 2;
    return `M${hub.x.toFixed(1)},${hub.y.toFixed(1)} C${mx.toFixed(1)},${hub.y.toFixed(1)} ${mx.toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <div ref={ref} className={`flex flex-col gap-4 p-5 @lg:p-7 ${fill ? 'h-full' : ''}`}>
      {/* roadmap */}
      <div data-gantt className={`${CARD} p-4 @lg:p-5`}>
        <div className="flex items-center justify-between gap-3">
          <span className="label text-white/60">{r.title}</span>
          <span className="text-[0.7rem] text-white/40">{r.weeks}</span>
        </div>
        <div className="mt-4 flex gap-3">
          <ul className="w-[34%] shrink-0 space-y-2.5 pt-6">
            {r.rows.map((row) => (
              <li key={row} className="h-6 truncate text-[0.75rem] leading-6 text-white/75">
                {row}
              </li>
            ))}
          </ul>
          <div className="relative min-w-0 flex-1">
            <div className="grid h-4 grid-cols-8">
              {Array.from({ length: WEEKS }, (_, w) => (
                <span key={w} data-week lang="en" className="text-center font-mono text-[0.62rem] text-white/40">
                  {pad(w + 1)}
                </span>
              ))}
            </div>
            <div className="relative mt-2 space-y-2.5">
              {/* week columns */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid grid-cols-8">
                {Array.from({ length: WEEKS }, (_, w) => (
                  <span key={w} className="border-s border-white/[0.06]" />
                ))}
              </div>
              {GANTT.map((g, i) => (
                <div key={i} className="relative h-6">
                  <span
                    data-task
                    className={`absolute inset-y-0 rounded-full ${g.tone}`}
                    style={{ insetInlineStart: `${(g.from / WEEKS) * 100}%`, width: `${(g.span / WEEKS) * 100}%`, opacity: 0.92 }}
                  />
                </div>
              ))}
              {/* "now" marker travelling along the plan */}
              <div aria-hidden="true" className="proc-now pointer-events-none absolute -inset-y-1.5 inset-x-0">
                <span className="absolute inset-y-0 start-0 w-px bg-white/45" />
                <span className="absolute -top-1 start-0 size-2 -translate-x-1/2 rounded-full bg-white rtl:translate-x-1/2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* tracking: the site wired to the ad platforms */}
      <div data-net className={`${CARD} relative flex flex-col p-4 @lg:p-5 ${fill ? 'min-h-0 flex-1' : ''}`}>
        <span className="label text-white/60">{r.tracking}</span>
        <div ref={net} className={`relative mt-2 ${fill ? 'min-h-[9rem] flex-1' : 'h-[11rem]'}`}>
          <svg aria-hidden="true" viewBox={`0 0 ${box.w} ${box.h}`} className="absolute inset-0 size-full overflow-visible">
            {wires.map((d, i) => (
              <path key={i} data-wire d={d} pathLength={1} strokeDasharray="1" fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="1.4" />
            ))}
            <g data-packets>
              {wires.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  pathLength={1}
                  strokeDasharray="0.07 0.93"
                  fill="none"
                  stroke="var(--color-green-light)"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  className="proc-flow"
                  style={{ animationDelay: `${i * -0.45}s` }}
                />
              ))}
            </g>
          </svg>
          <div data-hub className="absolute start-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 rtl:translate-x-1/2">
            <span className="relative grid size-12 place-items-center rounded-2xl bg-white text-ink shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
              <span className="proc-pulse absolute inset-0 rounded-2xl bg-white/30" />
              <Glyph name="site" className="relative size-6" />
            </span>
            <span className="whitespace-nowrap text-[0.7rem] text-white/70">{r.site}</span>
          </div>
          {trackingTags.map((tag, i) => (
            <div
              key={tag}
              className="absolute flex flex-col items-center gap-1"
              style={{ left: `${side(NODES[i].x, rtl)}%`, top: `${NODES[i].y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <span data-node className="flex items-center gap-2 whitespace-nowrap rounded-full bg-navy px-3 py-1.5 ring-1 ring-inset ring-white/15">
                <span className="relative size-2 shrink-0 rounded-full bg-white/25">
                  <span data-on className="absolute inset-0 rounded-full bg-green-light" />
                </span>
                <span lang="en" dir="ltr" className="font-mono text-[0.68rem] text-white/85">
                  {tag}
                </span>
              </span>
              <span data-connected className="absolute top-full mt-1 whitespace-nowrap text-[0.66rem] text-green-light">
                {r.connected}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── 03 · Production & launch: creatives made, channels switched on ─────────────────────── */
function Tile({ fill, badge, paper = false, children }: { fill: boolean; badge: string; paper?: boolean; children: ReactNode }) {
  return (
    <div data-tile className={`relative overflow-hidden rounded-xl ${paper ? 'bg-paper text-ink' : 'bg-ink'} ${fill ? 'h-full' : 'aspect-[4/5]'}`}>
      {children}
      <span className="absolute start-2 top-2 rounded-full bg-navy/85 px-2 py-0.5 text-[0.66rem] font-medium text-white">{badge}</span>
    </div>
  );
}

function Production({ active, fill }: SceneProps) {
  const t = useContent();
  const l = t.ui.process.launch;
  const ref = useRef<HTMLDivElement>(null);
  useScene(ref, active, (tl, rtl) => {
    tl.from('[data-tile]', { autoAlpha: 0, y: 40, rotation: (i: number) => (i - 1) * 5, stagger: 0.12, duration: 1 }, 0)
      .from('[data-tile] img', { scale: 1.25, duration: 1.6 }, 0)
      .from('[data-copy-line]', { scaleX: 0, transformOrigin: rtl ? 'right center' : 'left center', stagger: 0.18, duration: 0.7, ease: 'power2.out' }, 0.6)
      .from('[data-channels]', { autoAlpha: 0, y: 18, duration: 0.8 }, 0.7)
      .from('[data-toggle-on]', { autoAlpha: 0, stagger: 0.3, duration: 0.35 }, 1.3)
      .from('[data-knob]', { x: rtl ? 14 : -14, stagger: 0.3, duration: 0.45, ease: 'back.out(2)' }, 1.3)
      .from('[data-channel-state]', { autoAlpha: 0, stagger: 0.3, duration: 0.4 }, 1.4)
      .from('[data-live]', { autoAlpha: 0, scale: 0.7, duration: 0.7, ease: 'back.out(2.4)' }, 2.5);
  });

  return (
    <div ref={ref} className={`flex flex-col gap-4 p-5 @lg:p-7 ${fill ? 'h-full' : ''}`}>
      <div className={`grid grid-cols-3 gap-2.5 @lg:gap-3.5 ${fill ? 'min-h-0 flex-1' : ''}`}>
        <Tile fill={fill} badge={l.formats[0]}>
          <img src={feedPosts[0].image} alt="" loading="lazy" decoding="async" draggable={false} className="absolute inset-0 size-full object-cover" />
        </Tile>
        <Tile fill={fill} badge={l.formats[1]}>
          <img src={feedPosts[1].image} alt="" loading="lazy" decoding="async" draggable={false} className="absolute inset-0 size-full object-cover" />
          <span className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" />
          <span className="absolute start-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-lg rtl:translate-x-1/2">
            <Glyph name="play" fill className="size-5 translate-x-px" />
          </span>
          <span className="absolute inset-x-2.5 bottom-2.5">
            <span lang="en" dir="ltr" className="block truncate font-mono text-[0.62rem] text-white/80">
              {t.ui.buzz.handle}
            </span>
            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/25">
              <span className="proc-progress block h-full rounded-full bg-white" />
            </span>
          </span>
        </Tile>
        <Tile fill={fill} badge={l.formats[2]} paper>
          <span className="absolute inset-0 flex flex-col justify-between p-3 pt-9">
            <span aria-hidden="true" className="font-display text-[2.6rem] leading-none text-ink/15">
              “
            </span>
            <span className="block space-y-2">
              {[92, 76, 86, 58].map((w, i) => (
                <span key={i} data-copy-line className="flex h-1.5 items-center rounded-full bg-ink/15" style={{ width: `${w}%` }} />
              ))}
              <span className="proc-caret block h-3 w-0.5 bg-ink/70" />
            </span>
            <span className="bubble block h-5 w-16 bg-brand-gradient" />
          </span>
        </Tile>
      </div>

      <div data-channels className={`${CARD} p-4`}>
        <div className="flex items-center justify-between gap-3">
          <span className="label text-white/60">{l.channels}</span>
          <span data-live className="bubble flex items-center gap-1.5 bg-brand-gradient px-2.5 py-1 text-[0.7rem] font-medium text-ink">
            <span className="proc-blink size-1.5 rounded-full bg-ink" />
            {l.live}
          </span>
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-2 @lg:grid-cols-4">
          {platforms.slice(0, 4).map((p) => (
            <li key={p} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.05] px-3 py-2.5 ring-1 ring-inset ring-white/10">
              <span className="min-w-0">
                <span lang="en" dir="ltr" className="block truncate font-mono text-[0.72rem] text-white/90">
                  {p}
                </span>
                <span data-channel-state className="mt-0.5 flex items-center gap-1 text-[0.62rem] text-green-light">
                  <span className="size-1 rounded-full bg-green-light" />
                  {l.live}
                </span>
              </span>
              <span className="relative h-[18px] w-8 shrink-0 rounded-full bg-white/15">
                <span data-toggle-on className="absolute inset-0 rounded-full bg-brand-gradient" />
                <span data-knob className="absolute end-[3px] top-[3px] size-3 rounded-full bg-white shadow" />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── 04 · Optimization & scaling: conversions climbing, the winner scaled ───────────────── */
const CONV = [0.16, 0.27, 0.22, 0.41, 0.36, 0.57, 0.71, 0.9];
const CW = 400;
const CH = 150;
const PX = CONV.map((_, i) => (i / (CONV.length - 1)) * CW);
const PY = CONV.map((v) => CH - 6 - v * (CH - 18));
/** Weeks where the creatives were refined (the dips before each climb). */
const TUNED = [2, 4];

/** Catmull-Rom through the points, as cubic Béziers. */
function smooth(xs: number[], ys: number[]) {
  let d = `M${xs[0]},${ys[0].toFixed(1)}`;
  for (let i = 0; i < xs.length - 1; i++) {
    const x0 = xs[i - 1] ?? xs[i];
    const y0 = ys[i - 1] ?? ys[i];
    const x3 = xs[i + 2] ?? xs[i + 1];
    const y3 = ys[i + 2] ?? ys[i + 1];
    const c1x = xs[i] + (xs[i + 1] - x0) / 6;
    const c1y = ys[i] + (ys[i + 1] - y0) / 6;
    const c2x = xs[i + 1] - (x3 - xs[i]) / 6;
    const c2y = ys[i + 1] - (y3 - ys[i]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${xs[i + 1].toFixed(1)},${ys[i + 1].toFixed(1)}`;
  }
  return d;
}
const LINE = smooth(PX, PY);
const AREA = `${LINE} L${CW},${CH} L0,${CH} Z`;
const LAST = CONV.length - 1;

function Optimize({ active, fill }: SceneProps) {
  const t = useContent();
  const s = t.ui.process.scale;
  const rtl = t.dir === 'rtl';
  const ref = useRef<HTMLDivElement>(null);
  const rect = useRef<DOMRect | null>(null);
  const [h, setH] = useState(LAST);

  useScene(ref, active, (tl, rtl) => {
    tl.from('[data-chart-card]', { autoAlpha: 0, y: 18, duration: 0.8 }, 0)
      .from('[data-grid]', { autoAlpha: 0, duration: 0.6 }, 0.2)
      .fromTo('[data-line]', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut' }, 0.3)
      .from('[data-area]', { autoAlpha: 0, duration: 1 }, 1.1)
      .from('[data-tuned]', { scale: 0, autoAlpha: 0, stagger: 0.25, duration: 0.6, ease: 'back.out(3)' }, 1.0)
      .from('[data-cross]', { autoAlpha: 0, duration: 0.5 }, 2.0)
      .from('[data-tip]', { autoAlpha: 0, y: 6, duration: 0.6 }, 2.1)
      .from('[data-mini]', { autoAlpha: 0, y: 18, stagger: 0.12, duration: 0.8 }, 0.6)
      .from('[data-ab]', { scaleX: 0, transformOrigin: rtl ? 'right center' : 'left center', stagger: 0.35, duration: 1.1, ease: 'power3.inOut' }, 1.1)
      .from('[data-winner]', { autoAlpha: 0, scale: 0.7, duration: 0.7, ease: 'back.out(2.4)' }, 2.2)
      .from('[data-budget]', { scaleY: 0, transformOrigin: '50% 100%', stagger: 0.1, duration: 0.8, ease: 'back.out(1.6)' }, 1.4)
      .from('[data-scaling]', { autoAlpha: 0, duration: 0.6 }, 2.3);
  });

  const onEnter = (e: ReactPointerEvent<HTMLDivElement>) => {
    rect.current = e.currentTarget.getBoundingClientRect();
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = rect.current ?? (rect.current = e.currentTarget.getBoundingClientRect());
    const u = gsap.utils.clamp(0, 1, (e.clientX - r.left) / r.width);
    setH(Math.round((rtl ? 1 - u : u) * LAST));
  };
  const onLeave = () => {
    rect.current = null;
    setH(LAST);
  };

  const at = (i: number) => ({ left: `${side((PX[i] / CW) * 100, rtl)}%`, top: `${(PY[i] / CH) * 100}%` });

  return (
    <div ref={ref} className={`flex flex-col gap-4 p-5 @lg:p-7 ${fill ? 'h-full' : ''}`}>
      <div data-chart-card className={`${CARD} flex flex-col p-4 @lg:p-5 ${fill ? 'min-h-0 flex-1' : ''}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="label text-white/60">{s.chart}</span>
          <span className="bubble flex items-center bg-brand-gradient px-2 py-1 text-ink">
            <Glyph name="trend" className="size-4" />
          </span>
        </div>
        <div className={`mt-8 flex ${fill ? 'min-h-0 flex-1 items-center' : ''}`}>
          <div className="relative w-full" onPointerEnter={onEnter} onPointerMove={onMove} onPointerLeave={onLeave}>
            <svg viewBox={`0 0 ${CW} ${CH}`} className="block w-full overflow-visible rtl:-scale-x-100">
              <g data-grid>
                {[0.25, 0.5, 0.75].map((y) => (
                  <line key={y} x1="0" x2={CW} y1={CH * y} y2={CH * y} stroke="#fff" strokeOpacity="0.08" strokeDasharray="3 6" />
                ))}
                <line x1="0" x2={CW} y1={CH} y2={CH} stroke="#fff" strokeOpacity="0.16" />
              </g>
              <path data-area d={AREA} fill="url(#proc-area)" />
              {TUNED.map((i) => (
                <line key={i} x1={PX[i]} x2={PX[i]} y1={PY[i]} y2={CH} stroke="#fff" strokeOpacity="0.22" strokeDasharray="2 4" />
              ))}
              <path data-line d={LINE} pathLength={1} strokeDasharray="1" fill="none" stroke="url(#proc-line)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
              <g data-cross>
                <line x1={PX[h]} x2={PX[h]} y1="0" y2={CH} stroke="#fff" strokeOpacity="0.28" />
                <circle cx={PX[h]} cy={PY[h]} r="11" fill="var(--color-green-light)" opacity="0.18" />
                <circle cx={PX[h]} cy={PY[h]} r="5.5" fill="var(--color-green-light)" stroke="var(--color-navy)" strokeWidth="2.5" />
              </g>
            </svg>
            {TUNED.map((i) => (
              <span
                key={i}
                className={`pointer-events-none absolute transition-opacity duration-300 ${h === i ? 'opacity-0' : ''}`}
                style={{ ...at(i), transform: 'translate(-50%, calc(-100% - 10px))' }}
              >
                <span data-tuned className="grid size-6 place-items-center rounded-full bg-white text-ink shadow-md">
                  <Glyph name="spark" fill className="size-3.5" />
                </span>
              </span>
            ))}
            <span className="pointer-events-none absolute" style={{ ...at(h), transform: 'translate(-50%, calc(-100% - 16px))' }}>
              <span data-tip className="block whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[0.7rem] font-medium text-ink shadow-md">
                {s.week}{' '}
                <span lang="en" className="font-mono">
                  {pad(h + 1)}
                </span>
              </span>
            </span>
            {/* week ticks */}
            <div aria-hidden="true" className="relative mt-2 h-4">
              {PX.map((x, i) => (
                <span
                  key={i}
                  lang="en"
                  className={`absolute top-0 -translate-x-1/2 font-mono text-[0.62rem] transition-colors duration-300 ${i === h ? 'text-white' : 'text-white/35'}`}
                  style={{ left: `${side((x / CW) * 100, rtl)}%` }}
                >
                  {pad(i + 1)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 @lg:gap-4">
        {/* creative test: the winner is the one that gets scaled */}
        <div data-mini className={`${CARD} p-4`}>
          <span className="label text-white/60">{s.test}</span>
          <ul className="mt-3 space-y-2.5">
            {[
              { img: feedPosts[2].image, k: 'A', w: 46, win: false },
              { img: feedPosts[3].image, k: 'B', w: 88, win: true },
            ].map((c) => (
              <li key={c.k} className="flex items-center gap-2.5">
                <span className="relative size-8 shrink-0 overflow-hidden rounded-md bg-ink">
                  <img src={c.img} alt="" loading="lazy" decoding="async" draggable={false} className="size-full object-cover" />
                </span>
                <span lang="en" className="font-mono text-[0.7rem] text-white/60">
                  {c.k}
                </span>
                <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <span data-ab className={`absolute inset-y-0 start-0 rounded-full ${c.win ? 'bg-brand-gradient' : 'bg-white/40'}`} style={{ width: `${c.w}%` }} />
                </span>
              </li>
            ))}
          </ul>
          <span data-winner className="bubble mt-3.5 inline-flex items-center gap-1.5 bg-brand-gradient px-2.5 py-1 text-[0.72rem] font-medium text-ink">
            <Glyph name="spark" fill className="size-3.5" />
            {s.winner} · <span lang="en">B</span>
          </span>
        </div>

        {/* budget moving to what works */}
        <div data-mini className={`${CARD} flex flex-col p-4`}>
          <span className="label text-white/60">{s.budget}</span>
          <div className="mt-3 flex h-16 flex-1 items-end gap-1.5">
            {[24, 33, 46, 64, 90].map((v, i) => (
              <span key={i} data-budget className="flex-1 rounded-t-[5px] bg-brand-gradient" style={{ height: `${v}%`, opacity: 0.35 + i * 0.16 }} />
            ))}
          </div>
          <span data-scaling className="mt-3 inline-flex items-center gap-1.5 text-[0.75rem] text-white/85">
            <Glyph name="trend" className="size-4 text-green-light" />
            {s.scaling}
          </span>
        </div>
      </div>
    </div>
  );
}

const SCENES: ComponentType<SceneProps>[] = [Audit, Strategy, Production, Optimize];

/* ── The dashboard panel ────────────────────────────────────────────────────────────────── */
/** Two soft brand glows drift to a new place on every step. */
const GLOWS = [
  { a: 'translate(-30%, -35%)', b: 'translate(70%, 60%)' },
  { a: 'translate(60%, -40%)', b: 'translate(-25%, 55%)' },
  { a: 'translate(-25%, 40%)', b: 'translate(65%, -30%)' },
  { a: 'translate(45%, 35%)', b: 'translate(-30%, -30%)' },
];

function Panel({ n, total, title, className = '', children }: { n: number; total: number; title: string; className?: string; children: ReactNode }) {
  const t = useContent();
  const reduced = useApp((s) => s.reducedMotion);
  const panel = useRef<HTMLDivElement>(null);
  const spot = useRef<HTMLSpanElement>(null);

  // the panel leans toward the pointer, a soft light follows it (fine pointers only)
  useEffect(() => {
    const el = panel.current;
    const light = spot.current;
    if (!el || !light || reduced || !window.matchMedia(FINE).matches) return;
    gsap.set(el, { transformPerspective: 1800 });
    gsap.set(light, { xPercent: -50, yPercent: -50 });
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.9, ease: 'power3.out' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.9, ease: 'power3.out' });
    const lx = gsap.quickTo(light, 'x', { duration: 0.5, ease: 'power3.out' });
    const ly = gsap.quickTo(light, 'y', { duration: 0.5, ease: 'power3.out' });
    let r: DOMRect | null = null;
    const stale = () => (r = null);
    const enter = () => {
      r = el.getBoundingClientRect();
      gsap.to(light, { autoAlpha: 1, duration: 0.5 });
    };
    const move = (e: PointerEvent) => {
      if (!r) r = el.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;
      ry((nx - 0.5) * 4);
      rx(-(ny - 0.5) * 3);
      lx(e.clientX - r.left);
      ly(e.clientY - r.top);
    };
    const leave = () => {
      r = null;
      rx(0);
      ry(0);
      gsap.to(light, { autoAlpha: 0, duration: 0.7 });
    };
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    window.addEventListener('scroll', stale, { passive: true });
    return () => {
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      window.removeEventListener('scroll', stale);
      gsap.set(el, { clearProps: 'transform' });
    };
  }, [reduced]);

  const glow = GLOWS[n % GLOWS.length];
  return (
    <div
      ref={panel}
      className={`relative isolate flex flex-col overflow-hidden rounded-[26px] bg-navy text-white shadow-[0_60px_120px_-60px_rgba(20,20,46,0.9)] ring-1 ring-ink/10 ${className}`}
    >
      {/* backdrop: dot grid + drifting brand glows + pointer light */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <span
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.085) 1px, transparent 1.3px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(ellipse at center, #000 35%, transparent 85%)',
          }}
        />
        <span
          className="absolute start-0 top-0 size-[80%] rounded-full transition-transform duration-[1800ms] ease-[var(--ease-out-expo)]"
          style={{ transform: glow.a, background: 'radial-gradient(closest-side, color-mix(in oklab, var(--color-blue) 30%, transparent), transparent)' }}
        />
        <span
          className="absolute start-0 top-0 size-[80%] rounded-full transition-transform duration-[1800ms] ease-[var(--ease-out-expo)]"
          style={{ transform: glow.b, background: 'radial-gradient(closest-side, color-mix(in oklab, var(--color-green) 22%, transparent), transparent)' }}
        />
        <span
          ref={spot}
          className="invisible absolute left-0 top-0 size-[30rem] rounded-full opacity-0"
          style={{ background: 'radial-gradient(closest-side, rgba(108,196,238,0.16), transparent)' }}
        />
      </div>

      {/* window bar */}
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3">
        <BubbleMark size={18} />
        <span lang="en" dir="ltr" className="font-mono text-[0.72rem] text-white/50">
          {t.ui.buzz.handle}
        </span>
        <span aria-hidden="true" className="text-white/25">
          /
        </span>
        <span key={n} className="proc-swap min-w-0 truncate text-[0.82rem] font-medium text-white/90">
          {title}
        </span>
        <span className="ms-auto flex shrink-0 items-center gap-2">
          <span className="proc-blink size-1.5 rounded-full bg-green-light" />
          <span lang="en" dir="ltr" className="font-mono text-[0.72rem] text-white/50">
            {pad(n + 1)} / {pad(total)}
          </span>
        </span>
      </div>
      {children}
    </div>
  );
}

/* ── Desktop: pinned, scroll walks the steps ────────────────────────────────────────────── */
function Pinned() {
  const t = useContent();
  const steps = t.process.steps;
  const N = steps.length;
  const wrap = useRef<HTMLDivElement>(null);
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  const trigger = useRef<ScrollTrigger | null>(null);
  const [idx, setIdx] = useState(0);
  const inView = useInView(wrap, '0px 0px -35% 0px');

  useGSAP(
    () => {
      const apply = (p: number) => {
        const x = p * N;
        fills.current.forEach((f, i) => {
          if (f) f.style.transform = `scaleY(${gsap.utils.clamp(0, 1, x - i)})`;
        });
        setIdx(Math.min(N - 1, Math.floor(x)));
      };
      const st = ScrollTrigger.create({
        trigger: wrap.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => apply(self.progress),
        onRefresh: (self) => apply(self.progress),
      });
      trigger.current = st;
      apply(st.progress);
      return () => {
        trigger.current = null;
      };
    },
    { scope: wrap, dependencies: [N] },
  );

  const goTo = (i: number) => {
    const st = trigger.current;
    if (!st) return;
    const y = st.start + ((i + 0.03) / N) * (st.end - st.start);
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(y, { duration: 1.2 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  };

  return (
    <div ref={wrap} style={{ height: `calc(100svh + ${(N - 1) * STEP_SVH}svh)` }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="shell grid-12 h-full items-center pt-[clamp(5.5rem,12vh,7.5rem)] pb-[clamp(1.5rem,4.5vh,3rem)]">
          <div className="col-span-5 flex flex-col pe-[clamp(0rem,2vw,2.5rem)]">
            <SectionMark n={7} label={t.process.label} variant="brand" className="muted" />
            <h2 id="process-title" data-reveal="lines" className="display mt-5 text-[clamp(2.4rem,min(4.4vw,8.5vh),5rem)]">
              {t.process.title}
            </h2>
            <ol className="mt-[clamp(1.5rem,5vh,3.25rem)]">
              {steps.map((s, i) => {
                const on = i === idx;
                return (
                  <li key={s.num} className="relative ps-6">
                    <span aria-hidden="true" className="absolute inset-y-0 start-0 w-0.5 overflow-hidden bg-ink/10">
                      <span
                        ref={(el) => void (fills.current[i] = el)}
                        className="block size-full origin-top"
                        style={{ background: 'linear-gradient(180deg, var(--color-blue), var(--color-green))', transform: 'scaleY(0)' }}
                      />
                    </span>
                    <h3>
                      <button
                        type="button"
                        onClick={() => goTo(i)}
                        aria-current={on ? 'step' : undefined}
                        className="group flex w-full items-baseline gap-4 py-[clamp(0.55rem,1.4vh,0.95rem)] text-start"
                      >
                        <span lang="en" className={`w-7 shrink-0 font-mono text-[0.8rem] transition-colors duration-500 ${on ? 'text-link' : 'text-ink/40'}`}>
                          {s.num}
                        </span>
                        <span className={`font-display text-[clamp(1.15rem,1.5vw,1.55rem)] font-medium leading-snug transition-colors duration-500 ${on ? 'text-ink' : 'text-ink/45 group-hover:text-ink/75'}`}>
                          {s.title}
                        </span>
                      </button>
                    </h3>
                    <div className="expander" data-open={on || undefined}>
                      <div>
                        <p className="max-w-[32rem] ps-11 pb-[clamp(0.75rem,2vh,1.25rem)] text-[clamp(0.95rem,1.05vw,1.05rem)] leading-relaxed muted">{s.body}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="col-span-7 h-full max-h-[48rem]">
            <Panel n={idx} total={N} title={t.ui.process.scenes[idx]} className="h-full">
              <div aria-hidden="true" className="relative min-h-0 flex-1 @container">
                {SCENES.map((Scene, i) => (
                  <div
                    key={i}
                    className={`absolute inset-0 transition-[opacity,translate,scale] duration-700 ease-[var(--ease-out-expo)] ${i === idx ? '' : 'pointer-events-none translate-y-5 scale-[0.98] opacity-0'}`}
                  >
                    <Scene active={inView && i === idx} fill />
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Touch / tablet / reduced motion: the steps stack, each with its own panel ─────────── */
function StackedStep({ i }: { i: number }) {
  const t = useContent();
  const s = t.process.steps[i];
  const box = useRef<HTMLDivElement>(null);
  const active = useInView(box, '0px 0px -20% 0px');
  const Scene = SCENES[i % SCENES.length];
  return (
    <li className="grid-12 items-center gap-y-7">
      <div data-reveal="up" className="col-span-12 md:col-span-5">
        <p className="flex items-center gap-3">
          <span lang="en" dir="ltr" className="bubble bg-brand-gradient px-2.5 py-1 font-mono text-xs text-ink">
            {s.num}
          </span>
          <span className="label muted">{t.process.stepLabel}</span>
          <span className="h-px flex-1 bg-[var(--line)]" />
        </p>
        <h3 className="display mt-5 text-[clamp(1.8rem,5.5vw,2.75rem)]">{s.title}</h3>
        <p className="mt-4 max-w-[34rem] leading-relaxed muted">{s.body}</p>
      </div>
      <div ref={box} className="col-span-12 md:col-span-7">
        <Panel n={i} total={t.process.steps.length} title={t.ui.process.scenes[i]}>
          <div aria-hidden="true" className="relative @container">
            <Scene active={active} fill={false} />
          </div>
        </Panel>
      </div>
    </li>
  );
}

function Stacked() {
  const t = useContent();
  return (
    <div className="shell section-y">
      <div className="grid-12">
        <div className="col-span-12 lg:col-span-8">
          <SectionMark n={7} label={t.process.label} variant="brand" className="muted" />
          <h2 id="process-title" data-reveal="lines" className="display h-section mt-6">
            {t.process.title}
          </h2>
        </div>
      </div>
      <ol className="mt-[clamp(3rem,8vw,5.5rem)] space-y-[clamp(4.5rem,12vw,7rem)]">
        {t.process.steps.map((s, i) => (
          <StackedStep key={s.num} i={i} />
        ))}
      </ol>
    </div>
  );
}

export function Process() {
  const root = useRef<HTMLElement>(null);
  const pinned = useMediaQuery(PIN_MEDIA);
  useReveal(root, [pinned]);

  // idle loops (radar sweep, data packets, progress bars) only run while the section is on screen
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => el.classList.toggle('proc-paused', !e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={root} id="process" data-tone="light" aria-labelledby="process-title" className="proc-paused relative bg-paper">
      <Gradients />
      {pinned ? <Pinned /> : <Stacked />}
    </section>
  );
}
