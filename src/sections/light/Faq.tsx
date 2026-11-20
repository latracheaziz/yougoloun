import { useRef, useState } from 'react';
import { useContent } from '@/i18n/LangContext';
import { useReveal } from '@/interaction/useReveal';
import { SectionMark } from '@/components/SectionMark';

/** PDF §9 — a clean accordion. */
export function Faq() {
  const t = useContent();
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<number | null>(0);
  useReveal(root);

  return (
    <section ref={root} id="faq" data-tone="light" aria-labelledby="faq-title" className="bg-paper">
      <div className="shell section-y">
        <div className="grid-12 gap-y-10">
          <div className="col-span-12 lg:col-span-4">
            <SectionMark n={8} label={<span lang="en">{t.faq.label}</span>} className="muted" />
            <h2 id="faq-title" data-reveal="lines" className="display mt-6 text-[clamp(2.25rem,4.4vw,4.25rem)]">
              {t.faq.title}
            </h2>
          </div>
          <ul className="col-span-12 border-t hairline lg:col-span-8">
            {t.faq.items.map((item, i) => {
              const expanded = open === i;
              const id = `faq-${i}`;
              return (
                <li key={i} data-reveal="up" className="border-b hairline">
                  <h3>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={id}
                      onClick={() => setOpen(expanded ? null : i)}
                      className="group flex w-full items-start justify-between gap-8 py-[clamp(1.4rem,2.6vw,2.2rem)] text-start"
                    >
                      <span className="font-display text-[clamp(1.2rem,2vw,1.75rem)] leading-snug font-medium transition-colors duration-300 group-hover:text-ember">{item.q}</span>
                      <span aria-hidden="true" className="relative mt-[0.45em] size-4 shrink-0">
                        <span className="absolute inset-x-0 top-1/2 h-px bg-current" />
                        <span className="absolute inset-y-0 start-1/2 w-px bg-current transition-transform duration-500 group-aria-expanded:scale-y-0" />
                      </span>
                    </button>
                  </h3>
                  <div id={id} role="region" aria-label={item.q} className="expander" data-open={expanded || undefined}>
                    <div>
                      <p className="max-w-[44rem] pb-8 text-[clamp(1rem,1.2vw,1.15rem)] leading-relaxed muted">{item.a}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
