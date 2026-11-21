import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useContent } from '@/i18n/LangContext';
import { useApp } from '@/store/app';
import { brandImages } from '@/config/light';
import { BubbleMark } from '@/components/Wordmark';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ── Icons (24×24, stroke = currentColor unless filled) ─────────────────────────────────── */
const ICONS = {
  heart: 'M12 20.5s-7.6-4.6-9.6-9.4C.9 7.6 3.1 4 6.7 4c2.1 0 3.6 1.2 4.4 2.7C11.9 5.2 13.4 4 15.5 4c3.6 0 5.7 3.6 4.2 7.1-2.1 4.8-7.7 9.4-7.7 9.4z',
  comment: 'M5 4.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8.5L6 21v-3.5H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z',
  share: 'M21.5 2.5 10.6 13.4M21.5 2.5l-6.9 19-4-8.1-8.1-4z',
  bookmark: 'M6.5 3.5h11v17l-5.5-4-5.5 4z',
  follower: 'M15 19v-1.5a4 4 0 0 0-4-4H6.5a4 4 0 0 0-4 4V19M8.8 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 8v6M16 11h6',
  cart: 'M2.5 3.5h2.3l2.3 11.2h10.8l2.1-8H6.1M9 20.3a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6zM17.5 20.3a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6z',
  at: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0zm0 0v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1',
  megaphone: 'M3.5 9.5v5h3l7.5 5v-15l-7.5 5zM6.5 14.5l1.5 5h2.5',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 12.8a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6z',
  play: 'M8 5.5v13l10.5-6.5z',
  trend: 'M2.5 17.5l6.5-6.5 4 4 8.5-8.5M15.5 6.5h6v6',
  star: 'M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z',
} as const;
export type IconName = keyof typeof ICONS;

export function Icon({ name, className = 'size-5', filled = false }: { name: IconName; className?: string; filled?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`shrink-0 ${className}`}>
      <path
        d={ICONS[name]}
        fill={filled ? 'url(#buzz-g)' : 'none'}
        stroke={filled ? 'none' : 'currentColor'}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const CARD = 'rounded-[22px] bg-white ring-1 ring-ink/[0.06] shadow-[0_34px_70px_-38px_rgba(20,20,46,0.5)]';
const NOTIFY_ICONS: IconName[] = ['follower', 'cart', 'comment', 'at'];
const BURST: IconName[] = ['heart', 'heart', 'star', 'heart', 'comment', 'heart', 'star', 'heart'];

/* ── Pieces ─────────────────────────────────────────────────────────────────────────────── */

/** Growth chart: a line that draws itself, a gradient area, weekly bars. */
function ChartCard({ label }: { label: string }) {
  const line = 'M0,118 L40,108 L80,112 L120,86 L160,92 L200,58 L240,44 L296,14';
  return (
    <div className={`${CARD} w-full max-w-[320px] p-5`}>
      <div className="flex items-center justify-between">
        <span className="label muted">{label}</span>
        <span className="bubble bg-brand-gradient px-2 py-1 text-ink">
          <Icon name="trend" className="size-4" />
        </span>
      </div>
      <svg aria-hidden="true" viewBox="0 0 300 130" className="mt-4 w-full overflow-visible">
        {[30, 65, 100].map((y) => (
          <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="var(--color-ink)" strokeOpacity="0.07" strokeDasharray="3 5" />
        ))}
        <path data-area d={`${line} L296,130 L0,130 Z`} fill="url(#buzz-area)" />
        <path data-line d={line} pathLength={1} strokeDasharray="1" fill="none" stroke="url(#buzz-g)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <g data-tip>
          <circle cx="296" cy="14" r="14" fill="var(--color-green)" opacity="0.18" className="buzz-pulse" style={{ transformOrigin: '296px 14px' }} />
          <circle cx="296" cy="14" r="5.5" fill="var(--color-green)" stroke="#fff" strokeWidth="2.5" />
        </g>
      </svg>
      <div aria-hidden="true" className="mt-4 flex h-10 items-end gap-1.5" dir="ltr">
        {[38, 52, 45, 64, 58, 80, 100].map((h, i) => (
          <span key={i} data-bar className="flex-1 origin-bottom rounded-t-[4px] bg-[image:var(--p-gradient-brand)]" style={{ height: `${h}%`, opacity: 0.35 + i * 0.09 }} />
        ))}
      </div>
    </div>
  );
}

/** Marketing funnel: reach → engagement → conversion → loyalty. */
function FunnelCard({ title, steps }: { title: string; steps: readonly string[] }) {
  return (
    <div className={`${CARD} w-full max-w-[320px] p-5`}>
      <span className="label muted">{title}</span>
      <ol className="mt-4 space-y-2.5">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-3">
            <span className="h-7 flex-1">
              <span
                data-funnel
                className="bubble flex h-full items-center bg-[image:var(--p-gradient-brand)] px-3 text-[0.8rem] font-medium text-ink"
                style={{ width: `${100 - i * 19}%`, opacity: 1 - i * 0.12 }}
              >
                {s}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Live notifications: a new one slides in every couple of seconds while the section is on screen. */
function Toasts({ items, handle, running }: { items: readonly string[]; handle: string; running: boolean }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 2300);
    return () => window.clearInterval(id);
  }, [running]);
  const shown = [0, 1, 2].map((k) => tick + 2 - k);
  return (
    <ul aria-hidden="true" className="mx-auto flex w-full max-w-[22rem] flex-col gap-2.5">
      {shown.map((n, k) => {
        const i = n % items.length;
        return (
          <li
            key={n}
            className={`${CARD} buzz-toast flex items-center gap-3 rounded-2xl px-3.5 py-3 text-start transition-opacity duration-700`}
            style={{ opacity: 1 - k * 0.28 }}
          >
            <span className="bubble grid size-9 shrink-0 place-items-center bg-brand-gradient text-ink">
              <Icon name={NOTIFY_ICONS[i % NOTIFY_ICONS.length]} className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.92rem] font-medium leading-tight text-ink">{items[i]}</span>
              <span lang="en" dir="ltr" className="block font-mono text-[0.7rem] text-ink/50">
                {handle}
              </span>
            </span>
            <span className="size-2 shrink-0 rounded-full bg-green" />
          </li>
        );
      })}
    </ul>
  );
}

/** A phone showing a post: double-tap heart, reactions floating up like a live stream. */
function Phone({ handle, live }: { handle: string; live: string }) {
  return (
    <div className="relative mx-auto w-[min(260px,58vw)]">
      <div className="rounded-[40px] bg-ink p-2.5 shadow-[0_50px_90px_-40px_rgba(20,20,46,0.75)]">
        <div className="relative overflow-hidden rounded-[31px] bg-white">
          <div className="absolute inset-x-0 top-2 z-10 mx-auto h-5 w-20 rounded-full bg-ink" />
          <div className="flex items-center gap-2 px-3.5 pb-2.5 pt-10">
            <BubbleMark size={26} />
            <span lang="en" dir="ltr" className="font-mono text-[0.72rem] text-ink">
              {handle}
            </span>
            <span className="bubble ms-auto flex items-center gap-1 bg-brand-gradient px-2 py-0.5 text-[0.65rem] font-medium text-ink">
              <span className="buzz-blink size-1.5 rounded-full bg-ink" />
              {live}
            </span>
          </div>
          <div className="relative aspect-[4/5] bg-cover" style={{ backgroundImage: `url(${brandImages.social})`, backgroundPosition: '52% 45%' }}>
            <span className="buzz-like absolute inset-0 grid place-items-center">
              <Icon name="heart" filled className="size-20 drop-shadow-[0_6px_18px_rgba(20,20,46,0.35)]" />
            </span>
          </div>
          <div className="flex items-center gap-3.5 px-3.5 pt-3 text-ink">
            <span className="buzz-heart">
              <Icon name="heart" filled className="size-6" />
            </span>
            <Icon name="comment" className="size-6" />
            <Icon name="share" className="size-6" />
            <Icon name="bookmark" className="ms-auto size-6" />
          </div>
          <div className="space-y-1.5 px-3.5 pb-5 pt-3">
            <div className="flex items-center gap-2">
              <span className="flex -space-x-1.5 rtl:space-x-reverse">
                {['bg-blue', 'bg-green', 'bg-navy'].map((c) => (
                  <span key={c} className={`size-4 rounded-full ring-2 ring-white ${c}`} />
                ))}
              </span>
              <span className="h-2 w-24 rounded-full bg-ink/15" />
            </div>
            <span className="block h-2 w-[85%] rounded-full bg-ink/10" />
            <span className="block h-2 w-[60%] rounded-full bg-ink/10" />
          </div>
        </div>
      </div>
      {/* live reactions */}
      <div aria-hidden="true" className="pointer-events-none absolute -end-4 bottom-24 h-64 w-14">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="buzz-float absolute bottom-0 start-1/2"
            style={{ animationDelay: `${i * 0.55}s`, ['--drift' as string]: `${(i % 2 ? 1 : -1) * (8 + i * 3)}px` }}
          >
            <Icon name={i % 3 === 2 ? 'star' : 'heart'} filled className={i % 2 ? 'size-6' : 'size-8'} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Small floating chips around the section (decorative, desktop). */
function Chip({ children, className = 'bg-white', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span data-chip className="absolute" style={style}>
      <span className={`buzz-bob bubble relative grid size-14 place-items-center text-ink ring-1 ring-ink/[0.06] shadow-[0_24px_50px_-28px_rgba(20,20,46,0.55)] ${className}`}>
        {children}
      </span>
    </span>
  );
}

/* ── Section ─────────────────────────────────────────────────────────────────────────────── */

/**
 * "Word of mouth" — يقولون means "they say". A visual interlude that says *marketing agency*:
 * a live post with reactions, a growth chart drawing itself, a funnel, notifications arriving,
 * the name typing like a message. Click / tap anywhere for a burst of reactions.
 * Decorative only (aria-hidden pieces); the heading carries the meaning.
 */
export function Buzz() {
  const t = useContent();
  const b = t.ui.buzz;
  const reduced = useApp((s) => s.reducedMotion);
  const root = useRef<HTMLElement>(null);
  const fx = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '0px 0px -10% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      if (reduced) {
        gsap.set('[data-line]', { strokeDashoffset: 0 });
        return;
      }
      // once on enter: the chart draws, the bars and the funnel grow, the heading rises
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 62%', once: true } });
      tl.from('[data-rise]', { y: 50, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: 0.1 }, 0)
        .fromTo('[data-line]', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut' }, 0.2)
        .from('[data-area]', { autoAlpha: 0, duration: 1 }, 0.9)
        .from('[data-tip]', { scale: 0, transformOrigin: '296px 14px', duration: 0.6, ease: 'back.out(3)' }, 1.7)
        .from('[data-bar]', { scaleY: 0, duration: 0.7, ease: 'back.out(1.6)', stagger: 0.06 }, 0.5)
        .from('[data-funnel]', { scaleX: 0, transformOrigin: t.dir === 'rtl' ? 'right center' : 'left center', duration: 0.9, ease: 'expo.out', stagger: 0.12 }, 0.6)
        .from('[data-chip]', { scale: 0, autoAlpha: 0, duration: 0.8, ease: 'back.out(2.2)', stagger: 0.07 }, 0.4);

      // scroll parallax: columns and chips drift at different speeds (desktop)
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1024px)', () => {
        gsap.utils.toArray<HTMLElement>('[data-speed]', el).forEach((n) => {
          const s = Number(n.dataset.speed);
          gsap.fromTo(n, { y: s * 70 }, { y: -s * 70, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [reduced, t.lang] },
  );

  // pointer: layers follow in depth, cards tilt toward the pointer
  useEffect(() => {
    const el = root.current;
    if (!el || reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const layers = gsap.utils.toArray<HTMLElement>('[data-depth]', el).map((n) => ({
      x: gsap.quickTo(n, 'x', { duration: 1.1, ease: 'power3.out' }),
      y: gsap.quickTo(n, 'y', { duration: 1.1, ease: 'power3.out' }),
      rx: gsap.quickTo(n, 'rotationX', { duration: 1.1, ease: 'power3.out' }),
      ry: gsap.quickTo(n, 'rotationY', { duration: 1.1, ease: 'power3.out' }),
      depth: Number(n.dataset.depth),
    }));
    gsap.set('[data-depth]', { transformPerspective: 900 });
    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      layers.forEach((l) => {
        l.x(-nx * l.depth);
        l.y(-ny * l.depth);
        l.ry(nx * l.depth * 0.25);
        l.rx(-ny * l.depth * 0.25);
      });
    };
    el.addEventListener('pointermove', onMove);
    return () => el.removeEventListener('pointermove', onMove);
  }, [reduced]);

  // click / tap: a burst of reactions from the pointer
  const burst = (e: ReactPointerEvent<HTMLElement>) => {
    const layer = fx.current;
    if (!layer || reduced || (e.target as HTMLElement).closest('a, button')) return;
    const box = layer.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    BURST.forEach((name, i) => {
      const n = document.createElement('span');
      n.className = 'absolute';
      n.style.left = `${x}px`;
      n.style.top = `${y}px`;
      const size = gsap.utils.random(18, 34, 1);
      n.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="display:block;margin:-${size / 2}px 0 0 -${size / 2}px"><path d="${ICONS[name]}" fill="url(#buzz-g)"/></svg>`;
      layer.appendChild(n);
      const angle = (-Math.PI / 2) + (i / (BURST.length - 1) - 0.5) * 2.2 + gsap.utils.random(-0.2, 0.2);
      const dist = gsap.utils.random(70, 150);
      gsap
        .timeline({ onComplete: () => n.remove() })
        .fromTo(n, { scale: 0, rotation: gsap.utils.random(-30, 30) }, { scale: 1, duration: 0.35, ease: 'back.out(3)' })
        .to(n, { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 40, rotation: gsap.utils.random(-60, 60), duration: 1.1, ease: 'power2.out' }, 0)
        .to(n, { autoAlpha: 0, scale: 0.6, duration: 0.45 }, 0.75);
    });
  };

  return (
    <section
      ref={root}
      id="buzz"
      data-tone="light"
      data-cursor="react"
      aria-labelledby="buzz-title"
      onPointerDown={burst}
      className="relative isolate overflow-hidden bg-paper pb-[clamp(3rem,6vw,5rem)] pt-[clamp(5rem,11vw,10rem)]"
    >
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="buzz-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--color-blue)' }} />
            <stop offset="1" style={{ stopColor: 'var(--color-green)' }} />
          </linearGradient>
          <linearGradient id="buzz-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--color-blue)', stopOpacity: 0.28 }} />
            <stop offset="1" style={{ stopColor: 'var(--color-green)', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
      </svg>

      {/* soft brand glows */}
      <div aria-hidden="true" className="pointer-events-none absolute top-0 start-[-8%] -z-10 size-[min(40rem,90vw)] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-blue)_16%,transparent),transparent)]" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 end-[-8%] -z-10 size-[min(40rem,90vw)] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-green)_16%,transparent),transparent)]" />

      {/* floating chips (desktop) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
        <div data-speed="1.6" className="absolute inset-0">
          <div data-depth="40" className="absolute inset-0">
            <Chip style={{ insetInlineStart: '31%', top: '9%' }}>
              <Icon name="megaphone" />
              <span className="buzz-waves absolute -end-2 top-1/2 h-6 w-3 -translate-y-1/2 rounded-e-full border-e-2 border-green" />
            </Chip>
            <Chip className="bg-white [animation-delay:-1.2s]" style={{ insetInlineEnd: '30%', top: '6%' }}>
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="buzz-dot size-1.5 rounded-full bg-ink" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </Chip>
            <Chip className="bg-white [animation-delay:-2.4s]" style={{ insetInlineStart: '27%', bottom: '10%' }}>
              <Icon name="target" />
            </Chip>
            <Chip className="bg-brand-gradient [animation-delay:-0.6s]" style={{ insetInlineEnd: '27%', bottom: '14%' }}>
              <Icon name="play" />
            </Chip>
          </div>
        </div>
      </div>

      <div className="shell relative grid-12 items-center gap-y-14">
        {/* start column: chart + funnel */}
        <div className="order-3 col-span-12 lg:order-1 lg:col-span-3">
          <div data-speed="0.5" className="flex flex-col items-center gap-6 md:flex-row md:items-start md:justify-center lg:flex-col lg:items-stretch">
            <div data-rise className="w-full max-w-[320px]">
              <div data-depth="14">
                <ChartCard label={b.growth} />
              </div>
            </div>
            <div data-rise className="hidden w-full max-w-[320px] md:block lg:ms-8">
              <div data-depth="22">
                <FunnelCard title={b.funnelTitle} steps={b.funnel} />
              </div>
            </div>
          </div>
        </div>

        {/* center: the name, typing */}
        <div className="relative z-10 order-1 col-span-12 text-center lg:order-2 lg:col-span-6">
          <p data-rise className="label muted flex items-center justify-center gap-2">
            <BubbleMark size={22} />
            <span lang={t.lang === 'ar' ? 'ar' : 'en'}>{b.hashtag}</span>
          </p>
          <h2 id="buzz-title" data-rise className="display mt-6 text-[clamp(3.6rem,11vw,10rem)] leading-[0.95] text-ink">
            {b.word}
            <span aria-hidden="true" className="bubble ms-[0.12em] inline-flex h-[0.42em] items-center gap-[0.07em] bg-brand-gradient px-[0.14em] align-[0.08em]">
              {[0, 1, 2].map((i) => (
                <span key={i} className="buzz-dot size-[0.075em] rounded-full bg-ink" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
          </h2>
          <p data-rise className="mx-auto mt-6 max-w-[30rem] text-[clamp(1.05rem,1.4vw,1.3rem)] font-medium text-ink/80">
            {t.cornerstones.statement.emphasis}
          </p>
          <div data-rise className="mt-10">
            <Toasts items={b.notifications} handle={b.handle} running={inView && !reduced} />
          </div>
          <p aria-hidden="true" data-rise className="label mt-8 inline-flex items-center gap-2 text-ink/50">
            <Icon name="heart" filled className="size-4" />
            {b.hint}
          </p>
        </div>

        {/* end column: the phone */}
        <div className="order-2 col-span-12 lg:order-3 lg:col-span-3">
          <div data-speed="1">
            <div data-rise aria-hidden="true">
              <div data-depth="28">
                <Phone handle={b.handle} live={b.live} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref={fx} aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 overflow-hidden" />
    </section>
  );
}
