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
            <SectionMark n={8} label={<span lang="en">{t.faq.label}</span>} variant="brand" className="muted" />
            <h2 key={t.lang} id="faq-title" data-reveal="lines" className="display mt-6 text-[clamp(2.25rem,4.4vw,4.25rem)]">
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
                      <span className="font-display text-[clamp(1.2rem,2vw,1.75rem)] leading-snug font-medium transition-colors duration-300 group-hover:text-link">{item.q}</span>
                      <span
                        aria-hidden="true"
                        className="relative mt-[0.15em] grid size-9 shrink-0 place-items-center rounded-full border hairline transition-colors duration-500 group-hover:border-blue group-aria-expanded:border-transparent group-aria-expanded:bg-[image:var(--p-gradient-brand)]"
                      >
                        <span className="relative size-3.5 transition-transform duration-500 group-aria-expanded:rotate-45">
                          <span className="absolute inset-x-0 top-1/2 h-px bg-current" />
                          <span className="absolute inset-y-0 start-1/2 w-px bg-current" />
                        </span>
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
