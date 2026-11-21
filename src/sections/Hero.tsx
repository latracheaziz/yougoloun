import { useRef, type CSSProperties } from 'react';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { useContent } from '@/i18n/LangContext';
import { useApp } from '@/store/app';
import { scrollToSection } from '@/scroll/SmoothScroll';
import { whatsappLink } from '@/config/site';

gsap.registerPlugin(SplitText, useGSAP);

/** PDF §2 — hero over the 3D logo and its social icons. */
export function Hero() {
  const t = useContent();
  const reducedMotion = useApp((s) => s.reducedMotion);
  const root = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      if (reducedMotion) {
        gsap.from('[data-hero-in]', { opacity: 0, duration: 1.2, stagger: 0.08 });
        return;
      }
      let split: SplitText | undefined;
      let cancelled = false;
      // Split only once fonts are in, otherwise line breaks are measured with the fallback font.
      document.fonts.ready.then(() => {
        if (cancelled || !title.current) return;
        const arabic = t.lang === 'ar';
        split = SplitText.create(title.current, {
          // never split Arabic into characters — it breaks letter joining
          type: arabic ? 'lines,words' : 'lines,words,chars',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(arabic ? self.words : self.chars, {
              yPercent: 118,
              duration: 1.5,
              ease: 'expo.out',
              stagger: arabic ? 0.07 : 0.022,
              delay: 0.15,
            }),
        });
      });
      gsap.from('[data-hero-in]', { opacity: 0, y: 26, duration: 1.4, ease: 'expo.out', stagger: 0.09, delay: 0.55 });
      return () => {
        cancelled = true;
        split?.revert();
      };
    },
    { scope: root, dependencies: [t.lang, reducedMotion], revertOnUpdate: true },
  );

  return (
    <section
      ref={root}
      id="home"
      data-stage="home"
      data-tone="dark"
      aria-labelledby="hero-title"
      className="stage flex flex-col"
      style={{ '--in': 1 } as CSSProperties}
    >
      <div className="flex flex-1 flex-col justify-start px-[var(--gutter)] pt-[clamp(6.5rem,16vh,10rem)] landscape:justify-center landscape:pt-[5rem]">
        <div className="max-w-[min(48rem,54vw)] portrait:max-w-none">
          <p data-hero-in className="label flex items-center gap-3 text-mist/65">
            {t.hero.tagline}
          </p>
          <h1 id="hero-title" ref={title} className="display hero-title mt-6 text-balance">
            {t.hero.headline}
          </h1>
          <p data-hero-in className="mt-7 max-w-[33rem] text-[clamp(0.95rem,1.05vw,1.0625rem)] leading-relaxed text-mist/72">
            {t.hero.subheadline}
          </p>
          <div data-hero-in className="mt-9 flex flex-wrap gap-3">
            <a href={whatsappLink(t.ui.whatsappMessage)} target="_blank" rel="noopener noreferrer" className="btn btn-navy ring-1 ring-white/20">
              {t.hero.actions.primary}
              <span aria-hidden="true">↗</span>
            </a>
            <a
              href="#portfolio"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('portfolio');
              }}
              className="btn btn-ghost"
            >
              {t.hero.actions.secondary}
            </a>
          </div>
        </div>
      </div>

      <ScrollHint label={t.ui.scrollHint} />
      <PillarsBar pillars={t.hero.pillars} />
    </section>
  );
}

function ScrollHint({ label }: { label: string }) {
  return (
    <div data-hero-in aria-hidden="true" className="pointer-events-none absolute end-[var(--gutter)] bottom-24 flex items-center gap-3 max-md:hidden">
      <span className="label text-mist/60">{label}</span>
      <span className="relative block h-10 w-px overflow-hidden bg-mist/15">
        <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollcue_2.2s_var(--ease-in-out-quart)_infinite] bg-mist motion-reduce:animate-none" />
      </span>
      <span className="label text-mist/60">↓</span>
    </div>
  );
}

/** Core Pillars Bar — infinite marquee, ✦ separators. A real list stays available to assistive tech. */
function PillarsBar({ pillars }: { pillars: string[] }) {
  const run = [...pillars, ...pillars];
  return (
    <div data-hero-in className="relative border-t border-mist/10 bg-night/30 backdrop-blur-[2px]">
      <ul className="sr-only">
        {pillars.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <div aria-hidden="true" className="overflow-hidden py-4 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="marquee">
          {[0, 1].map((half) => (
            <div key={half} className="flex shrink-0 items-center">
              {run.map((p, i) => (
                <span key={`${half}-${i}`} className="flex items-center">
                  <span className="font-display px-7 text-[clamp(1rem,1.4vw,1.25rem)] font-medium whitespace-nowrap text-mist/85">{p}</span>
                  <span className="text-[0.7rem] text-green-light">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
