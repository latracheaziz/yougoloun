import { useId } from 'react';
import { useContent } from '@/i18n/LangContext';

/**
 * Typeset placeholder until the official SVG logo arrives: two speech bubbles (blue + green,
 * the logo's motif, colours from src/config/palette.ts) + يقولون / YOUGOLOUN.
 */
export function BubbleMark({ size = 34 }: { size?: number }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg aria-hidden="true" width={size} height={(size * 36) / 40} viewBox="0 0 40 36" className="shrink-0 overflow-visible">
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--color-blue-light)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-blue-deep)' }} />
        </linearGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--color-green-light)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-green-deep)' }} />
        </linearGradient>
      </defs>
      {/* green bubble (back), tail bottom-right */}
      <path d="M19 9h12a7 7 0 0 1 7 7v7a7 7 0 0 1-7 7h-1l1 5-6-5h-6a7 7 0 0 1-7-7v-7a7 7 0 0 1 7-7z" fill={`url(#${id}g)`} />
      {/* blue bubble (front), tail bottom-left */}
      <path d="M8 1h14a7 7 0 0 1 7 7v8a7 7 0 0 1-7 7H11l-7 6 1.5-6.3A7 7 0 0 1 1 16V8a7 7 0 0 1 7-7z" fill={`url(#${id}b)`} />
      {/* microphone */}
      <rect x="12.6" y="5" width="4.8" height="9" rx="2.4" fill="#fff" />
      <path d="M10.6 11.5a4.4 4.4 0 0 0 8.8 0M15 16v2.4" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark() {
  const t = useContent();
  return (
    <span className="flex items-center gap-3">
      <BubbleMark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.05rem] font-semibold tracking-tight">{t.brand.name}</span>
        <span lang={t.lang === 'ar' ? 'en' : 'ar'} className="label mt-1 text-[0.6rem] opacity-55">
          {t.brand.nameAlt}
        </span>
      </span>
    </span>
  );
}
