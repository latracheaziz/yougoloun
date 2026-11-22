import { useEffect, useRef } from 'react';
import { useContent } from '@/i18n/LangContext';
import { journey, onJourney, sectionIds, sectionIndex } from '@/scroll/journey';
import { scrollToSection } from '@/scroll/SmoothScroll';
import { sectionConfig } from '@/config/timeline';
import { useApp } from '@/store/app';

const COVER = sectionConfig('positioning').keys!.cover as number;

/**
 * Chapter rail of the 3D journey (after Orvae): four numbered stops on the end edge, the current one
 * filling with its progress; click to travel. Fades away as the dive whites out.
 */
export function ChapterRail() {
  const t = useContent();
  const root = useRef<HTMLElement>(null);
  const focused = useApp((s) => s.focus !== null); // a planet card takes the end side

  useEffect(
    () =>
      onJourney(() => {
        const el = root.current;
        if (!el) return;
        const items = el.querySelectorAll<HTMLElement>('[data-chapter]');
        items.forEach((item, i) => {
          const p = i < journey.index ? 1 : i > journey.index ? 0 : journey.p[i];
          item.style.setProperty('--fill', p.toFixed(3));
          item.toggleAttribute('data-current', i === journey.index);
        });
        const dive = journey.p[sectionIndex.positioning];
        const gone = journey.index === sectionIndex.positioning && dive > COVER * 0.5;
        el.style.opacity = gone || journey.y > journey.tracksEnd ? '0' : '1';
        el.style.pointerEvents = gone ? 'none' : '';
      }),
    [],
  );

  return (
    <nav ref={root} aria-label={t.ui.rail.label} data-hidden={focused ? '' : undefined} className="chapter-rail data-[hidden]:invisible fixed end-[clamp(0.75rem,1.6vw,1.6rem)] top-1/2 z-30 -translate-y-1/2 transition-opacity duration-500 max-md:hidden">
      <ol className="flex flex-col gap-1">
        {sectionIds.map((id, i) => (
          <li key={id}>
            <button type="button" data-chapter className="chapter-rail-item" onClick={() => scrollToSection(id)}>
              <span className="chapter-rail-label label">{t.ui.rail.chapters[i]}</span>
              <span className="label" dir="ltr">{String(i + 1).padStart(2, '0')}</span>
              <span aria-hidden="true" className="chapter-rail-bar">
                <span />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
