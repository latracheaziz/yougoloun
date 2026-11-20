import { useEffect, useRef } from 'react';
import { useContent } from '@/i18n/LangContext';
import { journey, onJourney, sectionIndex } from '@/scroll/journey';
import { altitudeKm, formatAltitude } from '@/scroll/altitude';

const LOG_MAX = Math.log(35786 + 1);

/**
 * HUD during the dive: altitude counting down from geostationary orbit to the ground at Hail.
 * Decorative for screen readers (the copy that matters lives in the sections).
 */
export function AltitudeMeter() {
  const t = useContent();
  const root = useRef<HTMLDivElement>(null);
  const value = useRef<HTMLSpanElement>(null);
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let last = '';
    return onJourney(() => {
      const pDive = journey.p[sectionIndex.positioning];
      const pLand = journey.p[sectionIndex.landing];
      const visible = journey.index === sectionIndex.positioning ? Math.min(1, pDive / 0.05) : journey.index === sectionIndex.landing ? 1 - Math.min(1, Math.max(0, (pLand - 0.55) / 0.15)) : 0;
      const km = altitudeKm(pDive, pLand);
      const text = formatAltitude(km);
      if (root.current) {
        root.current.style.opacity = String(visible);
        root.current.style.visibility = visible > 0 ? 'visible' : 'hidden';
      }
      if (value.current && text !== last) value.current.textContent = last = text;
      if (marker.current) marker.current.style.transform = `translateY(${(1 - Math.log(km + 1) / LOG_MAX) * 100}%)`;
    });
  }, []);

  return (
    <div
      ref={root}
      aria-hidden="true"
      className="pointer-events-none fixed end-[var(--gutter)] top-1/2 z-20 flex -translate-y-1/2 items-stretch gap-4 rounded-2xl border border-sand/10 bg-night/45 px-4 py-3 opacity-0 backdrop-blur-md max-md:end-4 max-md:top-auto max-md:bottom-24 max-md:translate-y-0"
      style={{ visibility: 'hidden' }}
    >
      <div className="flex flex-col items-end justify-between text-end">
        <span className="label text-sand/70">{t.ui.altitude}</span>
        <span ref={value} lang="en" dir="ltr" className="font-mono text-[clamp(1.1rem,1.6vw,1.5rem)] tabular-nums text-sand max-md:text-base">
          35,786 km
        </span>
      </div>
      <div className="relative h-40 w-3 max-md:h-24">
        <span className="absolute inset-y-0 start-1/2 w-px bg-sand/20" />
        <span className="absolute inset-0 [background:repeating-linear-gradient(to_bottom,color-mix(in_oklab,var(--color-sand)_35%,transparent)_0_1px,transparent_1px_10px)] [mask-image:linear-gradient(90deg,transparent_30%,#000_30%,#000_70%,transparent_70%)]" />
        <span ref={marker} className="absolute inset-x-0 top-0 block h-full">
          <span className="absolute -start-1 top-0 block h-[2px] w-5 -translate-y-1/2 bg-ember" />
        </span>
      </div>
    </div>
  );
}
