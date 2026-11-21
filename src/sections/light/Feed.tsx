import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { useContent } from '@/i18n/LangContext';
import { useApp } from '@/store/app';
import { feedPosts } from '@/config/light';
import { BubbleMark } from '@/components/Wordmark';
import { Icon, type IconName } from './Buzz';

const N = feedPosts.length;
const STORY_MS = 4800;

/** Resting place of the card at depth k (0 = top) — a loose hand of cards, fanned more on hover. */
function stackStyle(k: number, side: 1 | -1, spread: number) {
  const pose = [
    { x: 0, y: 0, r: 0, s: 1 },
    { x: 7, y: 1, r: 5, s: 0.95 },
    { x: -6, y: 2, r: -6, s: 0.9 },
    { x: 1, y: 5, r: 2, s: 0.86 },
  ][Math.min(k, 3)];
  return {
    transform: `translate(${pose.x * side * spread}%, ${pose.y * spread}%) rotate(${pose.r * side * spread}deg) scale(${pose.s})`,
    zIndex: N - k,
  };
}

/** One post, framed like a social feed item. */
function Post({ i, handle, alt }: { i: number; handle: string; alt: string }) {
  const p = feedPosts[i];
  return (
    <div className="overflow-hidden rounded-[26px] bg-white text-ink shadow-[0_50px_90px_-40px_rgba(0,0,0,0.75)]">
      <div className="flex items-center gap-2 px-4 py-3">
        <BubbleMark size={26} />
        <span lang="en" dir="ltr" className="font-mono text-[0.75rem]">
          {handle}
        </span>
        <span aria-hidden="true" className="ms-auto flex gap-0.5">
          {[0, 1, 2].map((d) => (
            <span key={d} className="size-1 rounded-full bg-ink/60" />
          ))}
        </span>
      </div>
      <div className="relative aspect-square overflow-hidden bg-ink">
        <img src={p.blur} alt="" aria-hidden="true" className="absolute inset-0 size-full scale-125 object-cover blur-xl" draggable={false} />
        <img src={p.image} alt={alt} loading="lazy" decoding="async" className="relative size-full object-contain" draggable={false} />
      </div>
      <div aria-hidden="true" className="flex items-center gap-3.5 px-4 py-3">
        <Icon name="heart" filled className="size-6" />
        <Icon name="comment" className="size-6" />
        <Icon name="share" className="size-6" />
        <Icon name="bookmark" className="ms-auto size-6" />
      </div>
    </div>
  );
}

/** Glass KPI chip floating around the deck (marketing vocabulary, Latin). */
function Kpi({ label, icon, className, depth }: { label?: string; icon: IconName; className: string; depth: number }) {
  return (
    <div aria-hidden="true" data-depth={depth} className={`pointer-events-none absolute z-20 hidden md:block ${className}`}>
      <span className="buzz-bob flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-paper shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md">
        {label && (
          <span lang="en" className="font-display text-[1.05rem] font-semibold tracking-tight">
            {label}
          </span>
        )}
        <span className="text-blue-light">
          <Icon name={icon} className="size-6" />
        </span>
      </span>
    </div>
  );
}

/**
 * "From our studio" — the agency's own campaign creatives as a deck of social posts on a navy band.
 * Drag / swipe the top card away (it goes to the back), or use the arrows; story bars auto-advance
 * while the section is on screen (paused on hover, off for reduced motion). Click a card to view it.
 */
export function Feed() {
  const t = useContent();
  const f = t.ui.feed;
  const reduced = useApp((s) => s.reducedMotion);
  const production = t.cornerstones.items.find((c) => c.key === 'production') ?? t.cornerstones.items[0];
  const side: 1 | -1 = t.dir === 'rtl' ? -1 : 1;

  const root = useRef<HTMLElement>(null);
  const inner = useRef<(HTMLDivElement | null)[]>([]);
  const busy = useRef(false);
  const entering = useRef<number | null>(null);
  const drag = useRef({ id: -1, x0: 0, dx: 0 });

  const [order, setOrder] = useState<number[]>(() => feedPosts.map((_, i) => i));
  const [inView, setInView] = useState(false);
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const top = order[0];

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /** Throw the top card out (dir = ±1 on screen), then send it to the back. */
  const next = (dir: number = side) => {
    if (busy.current) return;
    const card = inner.current[order[0]];
    const done = () => {
      busy.current = false;
      setOrder((o) => [...o.slice(1), o[0]]);
      if (card) gsap.set(card, { x: 0, y: 0, rotation: 0, autoAlpha: 1 });
    };
    if (!card || reduced) return done();
    busy.current = true;
    gsap.to(card, { x: dir * card.offsetWidth * 1.25, y: -40, rotation: dir * 18, autoAlpha: 0, duration: 0.45, ease: 'power2.in', onComplete: done });
  };
  /** Bring the last card back on top, flying in. */
  const prev = () => {
    if (busy.current) return;
    const last = order[N - 1];
    entering.current = reduced ? null : last;
    setOrder((o) => [o[N - 1], ...o.slice(0, N - 1)]);
  };
  useLayoutEffect(() => {
    const i = entering.current;
    if (i === null) return;
    entering.current = null;
    const card = inner.current[i];
    if (!card) return;
    busy.current = true;
    gsap.fromTo(
      card,
      { x: -side * card.offsetWidth * 1.25, y: -40, rotation: -side * 18, autoAlpha: 0 },
      { x: 0, y: 0, rotation: 0, autoAlpha: 1, duration: 0.55, ease: 'power3.out', onComplete: () => void (busy.current = false) },
    );
  }, [order, side]);

  // keyboard on the deck
  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowRight') (t.dir === 'rtl' ? prev : () => next())();
    else if (e.key === 'ArrowLeft') (t.dir === 'rtl' ? () => next() : prev)();
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(top);
    }
  };

  // drag / swipe the top card
  const onDown = (e: ReactPointerEvent<HTMLDivElement>, i: number) => {
    if (i !== top || busy.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x0: e.clientX, dx: 0 };
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>, i: number) => {
    const d = drag.current;
    if (d.id !== e.pointerId || i !== top) return;
    d.dx = e.clientX - d.x0;
    gsap.set(e.currentTarget, { x: d.dx, rotation: d.dx * 0.05 });
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>, i: number) => {
    const d = drag.current;
    if (d.id !== e.pointerId || i !== top) return;
    d.id = -1;
    if (Math.abs(d.dx) > 110) next(Math.sign(d.dx));
    else if (Math.abs(d.dx) < 6) {
      gsap.set(e.currentTarget, { x: 0, rotation: 0 });
      setOpen(i);
    } else gsap.to(e.currentTarget, { x: 0, rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.55)' });
  };

  // pointer depth on the floating chips
  useEffect(() => {
    const el = root.current;
    if (!el || reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const layers = gsap.utils.toArray<HTMLElement>('[data-depth]', el).map((n) => ({
      x: gsap.quickTo(n, 'x', { duration: 1, ease: 'power3.out' }),
      y: gsap.quickTo(n, 'y', { duration: 1, ease: 'power3.out' }),
      d: Number(n.dataset.depth),
    }));
    const move = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      layers.forEach((l) => (l.x(-nx * l.d), l.y(-ny * l.d)));
    };
    el.addEventListener('pointermove', move);
    return () => el.removeEventListener('pointermove', move);
  }, [reduced]);

  // lightbox: Escape closes
  useEffect(() => {
    if (open === null) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open]);

  const playing = inView && !hover && open === null && !reduced;
  const counter = useMemo(() => `${String(top + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`, [top]);

  return (
    <section ref={root} id="studio" data-tone="dark" aria-labelledby="studio-title" className="tone-dark band relative isolate overflow-hidden py-[clamp(5rem,10vw,9rem)]">
      {/* constellation backdrop */}
      <svg aria-hidden="true" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 -z-10 size-full opacity-60">
        <defs>
          <radialGradient id="studio-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" style={{ stopColor: 'var(--color-blue)', stopOpacity: 0.35 }} />
            <stop offset="1" style={{ stopColor: 'var(--color-blue)', stopOpacity: 0 }} />
          </radialGradient>
        </defs>
        <circle cx={t.dir === 'rtl' ? 330 : 870} cy="360" r="420" fill="url(#studio-glow)" />
        <g stroke="var(--color-blue-light)" strokeOpacity="0.18" fill="none">
          <path d="M40 120 160 60 260 150 210 280 80 250Z M260 150 400 90 M940 80 1060 140 1160 60 M1060 140 1020 270 1150 330 M60 560 190 620 300 540 M1000 600 1120 520 1180 640" />
        </g>
        <g fill="var(--color-blue-light)" fillOpacity="0.5">
          {[
            [40, 120], [160, 60], [260, 150], [210, 280], [80, 250], [400, 90], [940, 80], [1060, 140], [1160, 60], [1020, 270], [1150, 330], [60, 560], [190, 620], [300, 540], [1000, 600], [1120, 520], [1180, 640],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="3" />
          ))}
        </g>
      </svg>

      <div className="shell grid-12 items-center gap-y-16">
        {/* text + controls */}
        <div className="col-span-12 lg:col-span-5">
          <p className="label flex items-center gap-3">
            <span className="bubble bg-brand-gradient px-2.5 py-1 text-ink">{production.title}</span>
            <span lang={t.lang} className="opacity-70">
              {t.ui.buzz.hashtag}
            </span>
          </p>
          <h2 id="studio-title" className="display h-section mt-6">
            {f.title}
          </h2>
          <p className="mt-6 max-w-[28rem] text-[clamp(1rem,1.25vw,1.2rem)] leading-relaxed text-paper/75">{production.body}</p>

          {/* story bars */}
          <div aria-hidden="true" className="mt-10 flex max-w-[22rem] gap-1.5" dir="ltr">
            {feedPosts.map((_, i) => (
              <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                {i < top && <span className="block h-full w-full bg-[image:var(--p-gradient-brand)]" />}
                {i === top && reduced && <span className="block h-full w-1/2 bg-[image:var(--p-gradient-brand)]" />}
                {i === top && !reduced && (
                  <span
                    key={`${top}-${order.join('')}`}
                    className="feed-progress block h-full w-full origin-left bg-[image:var(--p-gradient-brand)]"
                    style={{ animationDuration: `${STORY_MS}ms`, animationPlayState: playing ? 'running' : 'paused' }}
                    onAnimationEnd={() => next()}
                  />
                )}
              </span>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button type="button" onClick={prev} aria-label={f.previous} className="grid size-12 place-items-center rounded-full border border-white/25 transition-colors hover:border-blue-light hover:text-blue-light">
              <span aria-hidden="true" className="rtl:-scale-x-100">
                ←
              </span>
            </button>
            <button type="button" onClick={() => next()} aria-label={f.next} className="grid size-12 place-items-center rounded-full border border-white/25 transition-colors hover:border-blue-light hover:text-blue-light">
              <span aria-hidden="true" className="rtl:-scale-x-100">
                →
              </span>
            </button>
            <span lang="en" dir="ltr" aria-live="polite" className="ms-2 font-mono text-sm text-paper/70">
              {counter}
            </span>
          </div>
          <p className="label mt-8 flex items-center gap-2 text-paper/55">
            <span aria-hidden="true" className="flex gap-1">
              <span className="size-1.5 rounded-full bg-blue-light" />
              <span className="size-1.5 rounded-full bg-green-light" />
            </span>
            {f.hint}
          </p>
        </div>

        {/* the deck */}
        <div className="relative col-span-12 flex justify-center lg:col-span-7">
          <Kpi label="ROI" icon="target" depth={30} className="-top-6 start-[2%] sm:start-[8%]" />
          <Kpi label="ROAS" icon="trend" depth={44} className="bottom-[18%] end-0 sm:end-[4%] [&>span]:[animation-delay:-1.6s]" />
          <Kpi icon="megaphone" depth={22} className="bottom-[6%] start-0 sm:start-[6%] [&>span]:[animation-delay:-3s]" />

          <div
            role="group"
            aria-roledescription="carousel"
            aria-label={f.title}
            tabIndex={0}
            onKeyDown={onKey}
            onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
            onPointerLeave={() => setHover(false)}
            data-cursor="drag"
            className="relative w-[min(420px,78vw)] rounded-[26px] outline-none focus-visible:ring-2 focus-visible:ring-blue-light"
          >
            {/* sizer */}
            <div aria-hidden="true" className="invisible">
              <Post i={0} handle={t.ui.buzz.handle} alt="" />
            </div>
            {feedPosts.map((_, i) => {
              const k = order.indexOf(i);
              return (
                <div
                  key={i}
                  className="absolute inset-0 transition-transform duration-700 ease-[var(--ease-out-expo)]"
                  style={stackStyle(k, side, hover ? 1.5 : 1)}
                  aria-hidden={k !== 0}
                >
                  <div
                    ref={(el) => void (inner.current[i] = el)}
                    onPointerDown={(e) => onDown(e, i)}
                    onPointerMove={(e) => onMove(e, i)}
                    onPointerUp={(e) => onUp(e, i)}
                    onPointerCancel={(e) => onUp(e, i)}
                    className={`touch-pan-y select-none ${k === 0 ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
                    style={{ filter: k === 0 ? undefined : `brightness(${1 - k * 0.12})` }}
                  >
                    <Post i={i} handle={t.ui.buzz.handle} alt={f.posts[i]} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {open !== null &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={f.posts[open]}
            onClick={() => setOpen(null)}
            className="feed-lightbox fixed inset-0 z-[70] grid place-items-center bg-[color-mix(in_oklab,var(--color-band)_88%,transparent)] p-4 backdrop-blur-md"
          >
            <img src={feedPosts[open].image} alt={f.posts[open]} className="max-h-[88svh] max-w-[min(92vw,1000px)] rounded-2xl object-contain shadow-2xl" />
            <button
              type="button"
              autoFocus
              onClick={() => setOpen(null)}
              className="label absolute end-5 top-5 rounded-full border border-white/30 px-4 py-2.5 text-paper transition-colors hover:border-blue-light hover:text-blue-light"
            >
              {t.ui.close}
            </button>
          </div>,
          document.body,
        )}
    </section>
  );
}
