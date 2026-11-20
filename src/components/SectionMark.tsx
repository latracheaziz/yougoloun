import type { ReactNode } from 'react';

/** Section counter + label, e.g. "02 / 09 — About". Numbers stay Western in both languages. */
export const SECTION_TOTAL = 9;

export function SectionMark({ n, label, className = '' }: { n: number; label?: ReactNode; className?: string }) {
  return (
    <p className={`label flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      <span lang="en" dir="ltr" className="text-ember">
        {String(n).padStart(2, '0')} / {String(SECTION_TOTAL).padStart(2, '0')}
      </span>
      {label && <span className="opacity-70">{label}</span>}
    </p>
  );
}
