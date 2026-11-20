import { useRef } from 'react';
import { useContent } from '@/i18n/LangContext';
import { site } from '@/config/site';
import { useReveal } from '@/interaction/useReveal';

/**
 * The payoff as the clouds clear. Its top is transparent and fades to paper, so it slides up
 * over the white-out without an edge — the clouds simply become the page.
 */
export function Arrival() {
  const t = useContent();
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  return (
    <section ref={root} data-tone="light" aria-label={`${site.hail.coords} — ${t.ui.arrival.place}`} className="relative">
      <div aria-hidden="true" className="h-[75vh] bg-[linear-gradient(to_bottom,transparent,var(--color-paper)_85%)]" />
      <div className="bg-paper">
        <div className="shell grid min-h-[90svh] place-items-center pb-[12vh] text-center">
          <div>
            <span aria-hidden="true" className="relative mx-auto mb-10 block size-3">
              <span className="absolute inset-0 animate-ping rounded-full bg-ember/60 motion-reduce:animate-none" />
              <span className="absolute inset-0 rounded-full bg-ember" />
            </span>
            <p data-reveal="up" lang="en" dir="ltr" className="font-mono text-[clamp(1.05rem,2.4vw,2rem)] tracking-tight text-ink/70">
              {site.hail.coords}
            </p>
            <p data-reveal="lines" className="display mt-4 text-[clamp(3rem,10vw,9.5rem)] text-ink">
              {t.ui.arrival.place}
            </p>
            <span aria-hidden="true" className="mx-auto mt-14 block h-20 w-px bg-ink/20" />
          </div>
        </div>
      </div>
    </section>
  );
}
