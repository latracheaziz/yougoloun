import { useEffect, useRef } from 'react';
import { useContent } from '@/i18n/LangContext';
import { SectionMark } from '@/components/SectionMark';
import { journey, onJourney, sectionIndex } from '@/scroll/journey';
import { rangeProgress, sectionConfig } from '@/config/timeline';

const KEYS = sectionConfig('positioning').keys;

/**
 * PDF §5 title over the dive. As the clouds brighten the text turns from mist to ink and its
 * scrim from a dark veil to a pale one, so it stays readable on every frame of the fall.
 * The three positioning statements follow in the light document.
 */
export function DiveTitle() {
  const t = useContent();
  const root = useRef<HTMLElement>(null);

  useEffect(
    () =>
      onJourney(() => {
        const el = root.current;
        if (!el) return;
        const p = journey.p[sectionIndex.positioning];
        const ink = rangeProgress(p, KEYS.textToDark);
        el.style.setProperty('--ink', ink.toFixed(3));
      }),
    [],
  );

  return (
    <section
      ref={root}
      id="positioning"
      data-stage="positioning" data-cursor="hold"
      data-tone="light"
      aria-labelledby="positioning-title"
      className="dive-title stage flex items-end px-[var(--gutter)] pb-[clamp(5rem,13vh,9rem)]"
    >
      <div className="relative max-w-[52rem]">
        <span aria-hidden="true" className="dive-scrim" />
        <div className="relative">
          <SectionMark n={4} label={t.positioning.label} />
          <h2 id="positioning-title" className="display mt-5 text-[clamp(2.4rem,5.8vw,5.5rem)] text-balance">
            {t.positioning.title}
          </h2>
        </div>
      </div>
    </section>
  );
}
