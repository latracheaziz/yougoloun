import type { ReactNode } from 'react';

/** Section counter + label, e.g. "02 / 09 — About". Numbers stay Western in both languages. */
export const SECTION_TOTAL = 9;

/**
 * `space`: ember number (the golden-hour part).
 * `brand`: the number sits in a small speech bubble filled with the brand gradient (light site + navy band).
 */
export function SectionMark({ n, label, className = '', variant = 'space' }: { n: number; label?: ReactNode; className?: string; variant?: 'space' | 'brand' }) {
  const number = `${String(n).padStart(2, '0')} / ${String(SECTION_TOTAL).padStart(2, '0')}`;
  return (
    <p className={`label flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      {variant === 'brand' ? (
        <span lang="en" dir="ltr" className="bubble bg-brand-gradient px-2.5 py-1 text-ink">
          {number}
        </span>
      ) : (
        <span lang="en" dir="ltr" className="text-ember">
          {number}
        </span>
      )}
      {label && <span className={variant === 'brand' ? '' : 'opacity-70'}>{label}</span>}
    </p>
  );
}
