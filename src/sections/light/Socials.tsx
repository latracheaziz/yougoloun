import { lazy, Suspense, useCallback, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useContent } from '@/i18n/LangContext';
import { useNear } from '@/hooks/useNear';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Magnetic } from '@/interaction/Magnetic';
import { getLenis } from '@/scroll/SmoothScroll';
import { socials } from '@/config/social';
import { platformColors } from '@/config/palette';
import type { FlipRig } from '@/gl/stage/SocialFlip';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// the turning 3D icon (own lazy chunk, mounted near view)
const SocialFlip = lazy(() => import('@/gl/stage/SocialFlip'));

/**
 * "Follow us" — after Contact. The section pins (CSS sticky) and scrolling walks through the agency's
 * platforms: the whole screen takes each platform's colour, the giant names travel sideways with the
 * scroll, the 3D icon turns over to the next logo, and the name / line / button swap as it does.
 * The rail jumps to a platform; the icon and the button open the account. Reduced motion: a grid.
 */

const N = socials.length;
const PIN_MEDIA = '(prefers-reduced-motion: no-preference)';
/** Scroll length of one platform (svh), and steps held at both ends. */
const STEP_SVH = 62;
const DWELL = 0.3;

const pad = (n: number) => String(n).padStart(2, '0');
const BG = socials.map((p) => `linear-gradient(140deg, ${platformColors[p.id].bg[0]}, ${platformColors[p.id].bg[1]})`);
/** Holds on each platform, turns over in the middle 40% of the scroll between two. */
const ease = (x: number) => {
  const i = Math.min(Math.floor(x), N - 2);
  const u = Math.min(1, Math.max(0, (x - i - 0.3) / 0.4));
  return i + u * u * (3 - 2 * u);
};

/** White tile with the logo in the platform's colour (before the 3D is ready, and in the grid). */
function FlatIcon({ i, className = '' }: { i: number; className?: string }) {
  const p = socials[i];
  return (
    <span aria-hidden="true" className={`grid aspect-square place-items-center rounded-[27%] bg-white shadow-[0_30px_60px_-25px_rgba(0,0,0,0.5)] ${className}`}>
      <svg viewBox="0 0 24 24" className="size-[56%]">
        <path d={p.path} fill={platformColors[p.id].logo} />
      </svg>
    </span>
  );
}

function Pinned() {
  const t = useContent();
  const s = t.ui.social;
  const rtl = t.dir === 'rtl';
  const root = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const next = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const drag = useRef({ on: false, x: 0, moved: 0 });
  const [idx, setIdx] = useState(0);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const rig = useMemo<FlipRig>(() => ({ turn: 0, dir: 1, px: 0, py: 0, hover: false, press: false, dragging: false, spin: 0 }), []);
  rig.dir = rtl ? -1 : 1;
  const { mounted, active } = useNear(stage, '60% 0px');

  useGSAP(
    () => {
      // the next platform's colour grows as a circle out of the icon (centre measured on refresh only)
      const centre = { x: 0, y: 0 };
      const measure = () => {
        const f = frame.current?.getBoundingClientRect();
        const s = stage.current?.getBoundingClientRect();
        if (f && s) Object.assign(centre, { x: s.left - f.left + s.width / 2, y: s.top - f.top + s.height / 2 });
      };
      let shown = -1;
      const apply = (p: number) => {
        const x = Math.min(N - 1, Math.max(0, p * (N - 1 + 2 * DWELL) - DWELL));
        const e = ease(x);
        const i = Math.min(Math.floor(e), N - 2);
        const k = e - i;
        rig.turn = e;
        if (base.current && next.current) {
          if (shown !== i) {
            base.current.style.background = BG[i];
            next.current.style.background = BG[i + 1];
            shown = i;
          }
          next.current.style.clipPath = `circle(${(Math.min(1, k * 1.6) * 150).toFixed(2)}% at ${centre.x}px ${centre.y}px)`;
        }
        if (strip.current) strip.current.style.transform = `translate3d(${(rtl ? 1 : -1) * x * 100}vw,0,0)`;
        if (bar.current) bar.current.style.transform = `scaleX(${x / (N - 1)})`;
        setIdx(Math.round(e));
      };
      const st = ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => apply(self.progress),
        onRefresh: (self) => {
          measure();
          apply(self.progress);
        },
      });
      measure();
      trigger.current = st;
      apply(st.progress);
      return () => {
        trigger.current = null;
      };
    },
    { dependencies: [rtl] },
  );

  const goTo = (i: number) => {
    const st = trigger.current;
    if (!st) return;
    const y = st.start + ((i + DWELL) / (N - 1 + 2 * DWELL)) * (st.end - st.start);
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  };

  // pointer → the icon leans toward it (viewport-normalised: no layout reads)
  const onMove = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    rig.px = (e.clientX / window.innerWidth) * 2 - 1;
    rig.py = (e.clientY / window.innerHeight) * 2 - 1;
    const d = drag.current;
    if (d.on) {
      const dx = e.clientX - d.x;
      d.x = e.clientX;
      d.moved += Math.abs(dx);
      rig.spin += dx * 0.012;
    }
  };
  const endDrag = () => {
    drag.current.on = false;
    rig.dragging = false;
    rig.press = false;
  };

  const cur = socials[idx];
  const ink = platformColors[cur.id].ink;

  return (
    <section
      ref={root}
      id="social"
      data-tone={ink ? 'light' : 'dark'}
      aria-labelledby="social-title"
      className="relative"
      style={{ height: `calc(100svh + ${(N - 1 + 2 * DWELL) * STEP_SVH}svh)` }}
    >
      <div
        ref={frame}
        className={`sticky top-0 isolate h-[100svh] overflow-hidden transition-colors duration-500 ${ink ? 'text-ink' : 'text-white'}`}
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerLeave={() => {
          endDrag();
          rig.px = rig.py = 0;
        }}
      >
        {/* platform colours: the current one, and the next one revealed from the icon */}
        <div ref={base} aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: BG[0] }} />
        <div ref={next} aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: BG[1], clipPath: 'circle(0% at 50% 50%)' }} />

        {/* giant names travelling sideways with the scroll */}
        <div ref={strip} aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-0 flex items-center will-change-transform">
          {socials.map((p) => (
            <span key={p.id} lang="en" className="w-[100vw] shrink-0 whitespace-nowrap text-center font-display text-[clamp(5rem,17vw,21rem)] font-semibold leading-none tracking-[-0.04em] opacity-[0.07]">
              {p.name}
            </span>
          ))}
        </div>

        <div className="shell relative grid h-full grid-rows-[auto_minmax(0,1fr)_auto] pt-[clamp(5.5rem,12vh,7.5rem)] pb-[clamp(1rem,3vh,2rem)]">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 id="social-title" className="display text-[clamp(1.75rem,2.8vw,2.75rem)]">
                {s.title}
              </h2>
              <p className="label mt-2 opacity-60">{s.hint}</p>
            </div>
            <p lang="en" dir="ltr" className="font-mono text-sm opacity-70">
              {pad(idx + 1)} / {pad(N)}
            </p>
          </div>

          <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] items-center gap-y-2 lg:grid-cols-12 lg:grid-rows-1 lg:gap-x-8">
            {/* the 3D icon: drag to spin it, click to open the account */}
            <div ref={stage} className="relative h-full min-h-[11rem] lg:order-2 lg:col-span-7 lg:h-[min(64svh,40rem)]">
              <span aria-hidden="true" className="absolute inset-[8%] rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.3), transparent)' }} />
              <span aria-hidden="true" className="absolute bottom-[5%] left-1/2 h-[6%] w-[32%] -translate-x-1/2 rounded-[50%] bg-black/30 blur-xl" />
              <a
                href={cur.url}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={-1}
                aria-hidden="true"
                data-cursor="view"
                draggable={false}
                className="absolute inset-0 grid place-items-center"
                onPointerEnter={(e) => e.pointerType === 'mouse' && (rig.hover = true)}
                onPointerLeave={() => (rig.hover = false)}
                onPointerDown={(e) => {
                  if (e.pointerType !== 'mouse' || e.button !== 0) return;
                  drag.current = { on: true, x: e.clientX, moved: 0 };
                  rig.dragging = true;
                  rig.press = true;
                }}
                onClick={(e) => drag.current.moved > 6 && e.preventDefault()}
              >
                {!ready && <FlatIcon i={idx} className="h-[52%] transition-opacity" />}
                {mounted && (
                  <Suspense fallback={null}>
                    <SocialFlip rig={rig} active={active} onReady={onReady} className="!absolute inset-0" />
                  </Suspense>
                )}
              </a>
            </div>

            {/* name, handle, line, button — swapped as the icon turns over */}
            <div className="lg:order-1 lg:col-span-5">
              <div aria-hidden="true" className="grid overflow-hidden">
                {socials.map((p, i) => (
                  <span
                    key={p.id}
                    lang="en"
                    className="block font-display text-[clamp(3rem,7vw,7.25rem)] font-semibold leading-[1.05] tracking-[-0.035em] transition-transform duration-700 ease-[var(--ease-out-expo)] [grid-area:1/1]"
                    style={{ transform: `translateY(${(i - idx) * 108}%)` }}
                  >
                    {p.name}
                  </span>
                ))}
              </div>
              <div className="mt-2 grid">
                {socials.map((p, i) => (
                  <div
                    key={p.id}
                    aria-hidden={i !== idx}
                    className={`transition-[opacity,translate] duration-500 ease-[var(--ease-out-expo)] [grid-area:1/1] ${i === idx ? '' : 'pointer-events-none translate-y-3 opacity-0'}`}
                  >
                    <p className="font-mono text-sm opacity-70">
                      <span dir="ltr">{p.handle}</span>
                    </p>
                    <p className="mt-3 max-w-[27rem] text-[clamp(1rem,1.3vw,1.25rem)] leading-relaxed opacity-90 max-lg:line-clamp-2">{s.about[p.id]}</p>
                  </div>
                ))}
              </div>
              <Magnetic>
                <a
                  href={cur.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`btn mt-6 min-h-13 px-6 transition-colors duration-500 lg:mt-9 lg:min-h-14 lg:px-7 ${ink ? 'bg-ink text-white hover:bg-navy' : 'bg-white text-ink hover:bg-paper'}`}
                >
                  {s.follow} <span lang="en">{cur.name}</span>
                  <span aria-hidden="true">↗</span>
                  <span className="sr-only">{s.newTab}</span>
                </a>
              </Magnetic>
            </div>
          </div>

          {/* rail: every platform, the scroll progress under it */}
          <nav aria-label={s.title} className="mx-auto mt-4 w-full max-w-[68rem]">
            <ol className="flex items-center justify-between gap-1">
              {socials.map((p, i) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={p.name}
                    aria-current={i === idx ? 'true' : undefined}
                    className={`flex items-center gap-2 rounded-full px-2.5 py-2 transition-[background-color,opacity] duration-500 lg:px-4 ${i === idx ? 'bg-current/15 opacity-100' : 'opacity-55 hover:opacity-100'}`}
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
                      <path d={p.path} fill="currentColor" />
                    </svg>
                    <span lang="en" className="hidden text-sm font-medium lg:inline">
                      {p.name}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <span className="mt-2 block h-px bg-current/20">
              <span ref={bar} className="block h-full origin-left bg-current rtl:origin-right" style={{ transform: 'scaleX(0)' }} />
            </span>
          </nav>
        </div>

        {/* every account, for screen readers (the visual swaps above are aria-hidden) */}
        <ul className="sr-only">
          {socials.map((p) => (
            <li key={p.id}>
              <a href={p.url} target="_blank" rel="noopener noreferrer">
                {`${p.name} — ${p.handle} ${s.newTab}`}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Reduced motion: no pinning, every platform as a card in its own colour. */
function Grid() {
  const t = useContent();
  const s = t.ui.social;
  return (
    <section id="social" data-tone="dark" aria-labelledby="social-title" className="band">
      <div className="shell section-y">
        <h2 id="social-title" className="display h-section">
          {s.title}
        </h2>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {socials.map((p, i) => {
            const c = platformColors[p.id];
            return (
              <li key={p.id}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex h-full items-center gap-5 rounded-[22px] p-6 ${c.ink ? 'text-ink' : 'text-white'}`}
                  style={{ background: `linear-gradient(140deg, ${c.bg[0]}, ${c.bg[1]})` }}
                >
                  <FlatIcon i={i} className="w-16 shrink-0" />
                  <span className="min-w-0">
                    <span lang="en" className="block font-display text-2xl font-semibold">
                      {p.name}
                    </span>
                    <span dir="ltr" className="block font-mono text-sm opacity-75">
                      {p.handle}
                    </span>
                    <span className="mt-2 block text-sm opacity-90">{s.about[p.id]}</span>
                    <span className="sr-only">{s.newTab}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function Socials() {
  const pinned = useMediaQuery(PIN_MEDIA);
  return pinned ? <Pinned /> : <Grid />;
}
