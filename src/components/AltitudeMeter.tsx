import { useEffect, useRef } from 'react';
import { useContent } from '@/i18n/LangContext';
import { journey, onJourney, sectionIndex } from '@/scroll/journey';
import { rangeProgress, sectionConfig } from '@/config/timeline';

const KEYS = sectionConfig('positioning').keys;
const [START_KM] = KEYS.altitudeKm;
const LOG_MAX = Math.log(START_KM + 1);

/** Log-scale countdown from geostationary orbit to the ground, reaching 0 m as the clouds close. */
function altitudeKm(p: number) {
  const t = Math.min(1, p / KEYS.cover);
  if (t >= 1) return 0;
  const e = t * t * (3 - 2 * t);
  return Math.max(0, Math.exp(Math.log(START_KM) + (Math.log(0.002) - Math.log(START_KM)) * e) - 0.002);
}

function format(km: number) {
  if (km >= 100) return `${Math.round(km).toLocaleString('en-US')} km`;
  if (km >= 1) return `${km.toFixed(1)} km`;
  return `${Math.round(km * 1000)} m`;
}

/** HUD during the dive. Decorative for screen readers. Turns dark-on-light with the clouds. */
export function AltitudeMeter() {
  const t = useContent();
  const root = useRef<HTMLDivElement>(null);
  const value = useRef<HTMLSpanElement>(null);
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let last = '';
    return onJourney(() => {
      const el = root.current;
      if (!el) return;
      const p = journey.p[sectionIndex.positioning];
      const inDive = journey.index === sectionIndex.positioning;
      const visible = inDive ? Math.min(1, p / 0.05) * (1 - rangeProgress(p, [KEYS.cover, KEYS.cover + 0.08])) : 0;
      el.style.opacity = String(visible);
      el.style.visibility = visible > 0 ? 'visible' : 'hidden';
      el.dataset.tone = rangeProgress(p, KEYS.textToDark) > 0.5 ? 'light' : 'dark';
      const km = altitudeKm(p);
      const text = format(km);
      if (value.current && text !== last) value.current.textContent = last = text;
      if (marker.current) marker.current.style.transform = `translateY(${(1 - Math.log(km + 1) / LOG_MAX) * 100}%)`;
    });
  }, []);

  return (
    <div
      ref={root}
      aria-hidden="true"
      data-tone="dark"
      className="altimeter pointer-events-none fixed end-[var(--gutter)] top-1/2 z-20 flex -translate-y-1/2 items-stretch gap-4 rounded-2xl border px-4 py-3 opacity-0 backdrop-blur-md max-md:end-4 max-md:top-24 max-md:translate-y-0"
      style={{ visibility: 'hidden' }}
    >
      <div className="flex flex-col items-end justify-between text-end">
        <span className="label opacity-70">{t.ui.altitude}</span>
        <span ref={value} lang="en" dir="ltr" className="font-mono text-[clamp(1.1rem,1.6vw,1.5rem)] tabular-nums max-md:text-base">
          {format(START_KM)}
        </span>
      </div>
      <div className="relative h-40 w-3 max-md:h-24">
        <span className="absolute inset-y-0 start-1/2 w-px bg-current opacity-20" />
        <span className="absolute inset-0 opacity-35 [background:repeating-linear-gradient(to_bottom,currentColor_0_1px,transparent_1px_10px)] [mask-image:linear-gradient(90deg,transparent_30%,#000_30%,#000_70%,transparent_70%)]" />
        <span ref={marker} className="absolute inset-x-0 top-0 block h-full">
          <span className="absolute -start-1 top-0 block h-[2px] w-5 -translate-y-1/2 bg-accent" />
        </span>
      </div>
    </div>
  );
}
