import type { ReactNode } from 'react';
import type { SectionId } from '@/config/timeline';
import { sectionIds } from '@/scroll/journey';

/**
 * Phase 1 placeholder stage: wires a section's id, track and copy into the journey.
 * Replaced section by section in Phase 3.
 */
export function SectionStub({ id, label, title }: { id: SectionId; label?: ReactNode; title: ReactNode }) {
  const n = String(sectionIds.indexOf(id) + 1).padStart(2, '0');
  const total = String(sectionIds.length).padStart(2, '0');
  return (
    <section id={id} data-stage={id} aria-labelledby={`${id}-title`} className="stage flex items-end px-[var(--gutter)] pb-[14vh]">
      <div className="max-w-[56rem]">
        <p className="label flex gap-3 text-sand/55">
          <span lang="en" dir="ltr" className="text-ember">
            {n} / {total}
          </span>
          {label}
        </p>
        <h2 id={`${id}-title`} className="display mt-5 text-[clamp(2.25rem,5.6vw,5.5rem)] text-balance">
          {title}
        </h2>
      </div>
    </section>
  );
}
