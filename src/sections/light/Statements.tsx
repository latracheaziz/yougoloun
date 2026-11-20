import { useRef } from 'react';
import { useContent } from '@/i18n/LangContext';
import { useReveal } from '@/interaction/useReveal';

/** PDF §5 — the three positioning statements, big and numbered, revealed line by line. */
export function Statements() {
  const t = useContent();
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  return (
    <section ref={root} id="statements" data-tone="light" aria-labelledby="statements-title" className="bg-paper">
      <div className="shell section-y pt-0">
        <div className="grid-12 items-end border-b hairline pb-8">
          <p data-reveal="up" className="label col-span-12 muted md:col-span-3">
            {t.positioning.label}
          </p>
          <h2 id="statements-title" data-reveal="up" className="col-span-12 mt-3 font-display text-[clamp(1.25rem,2vw,1.75rem)] font-medium md:col-span-9 md:mt-0">
            {t.positioning.title}
          </h2>
        </div>
        <ol>
          {t.positioning.items.map((item) => (
            <li key={item.num} className="grid-12 gap-y-6 border-b hairline py-[clamp(2.5rem,6vw,5.5rem)]">
              <span data-reveal="up" lang="en" className="col-span-12 font-mono text-sm text-ember md:col-span-2">
                {item.num}
              </span>
              <p data-reveal="lines" className="display col-span-12 text-[clamp(2.4rem,6.2vw,6.25rem)] md:col-span-10">
                <span className="text-ink/30">{item.from}</span> <span className="inline-block text-ember rtl:-scale-x-100">→</span> {item.to}
              </p>
              <p data-reveal="up" className="col-span-12 max-w-[32rem] text-[clamp(1rem,1.2vw,1.15rem)] leading-relaxed muted md:col-start-3 md:col-span-6">
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
