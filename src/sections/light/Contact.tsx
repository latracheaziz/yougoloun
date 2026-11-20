import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useContent } from '@/i18n/LangContext';
import { useReveal } from '@/interaction/useReveal';
import { Magnetic } from '@/interaction/Magnetic';
import { mailtoLink, site, whatsappLink } from '@/config/site';
import { SectionMark } from '@/components/SectionMark';
import { HailClock } from '@/components/HailClock';

// Small interactive globe (drag to rotate, Hail glowing) — its own lazy chunk, mounted near view.
const MiniGlobe = lazy(() => import('@/gl/MiniGlobe'));

/** PDF §10 — the closing call to action. Dark band: the story ends where it began, in space. */
export function Contact() {
  const t = useContent();
  const root = useRef<HTMLElement>(null);
  const globeSlot = useRef<HTMLDivElement>(null);
  const [showGlobe, setShowGlobe] = useState(false);
  useReveal(root);

  useEffect(() => {
    const el = globeSlot.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setShowGlobe(true), { rootMargin: '60% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const contactLabel = t.nav.items.find((i) => i.target === 'contact')?.label;

  return (
    <section ref={root} id="contact" data-tone="dark" aria-labelledby="contact-title" className="tone-dark band relative overflow-hidden">
      <div className="shell section-y">
        <SectionMark n={9} label={contactLabel} variant="brand" className="text-paper/70" />
        <h2 id="contact-title" data-reveal="lines" className="display mt-8 max-w-[15ch] text-[clamp(2.75rem,8vw,8.5rem)] text-balance">
          {t.contact.headline}
        </h2>

        <div className="grid-12 mt-[clamp(3rem,6vw,5rem)] items-end gap-y-12">
          <div className="col-span-12 lg:col-span-6">
            <p data-reveal="up" className="max-w-[30rem] text-[clamp(1.05rem,1.4vw,1.3rem)] leading-relaxed text-paper/70">
              {t.contact.body}
            </p>
            <div data-reveal="up" className="mt-10 flex flex-wrap gap-3">
              <Magnetic>
                <a href={whatsappLink(t.ui.whatsappMessage)} target="_blank" rel="noopener noreferrer" data-cursor="talk" className="btn btn-brand min-h-14 px-7">
                  {t.hero.actions.primary}
                  <span aria-hidden="true">↗</span>
                </a>
              </Magnetic>
              <Magnetic>
                <a href={mailtoLink()} className="btn btn-line min-h-14 px-7 text-paper">
                  {t.contact.labels.email}
                </a>
              </Magnetic>
            </div>

            <dl data-reveal="up" className="mt-14 grid gap-x-8 gap-y-7 border-t border-paper/12 pt-8 sm:grid-cols-2">
              <div>
                <dt className="label text-paper/45">{t.contact.labels.email}</dt>
                <dd className="mt-2">
                  <a href={mailtoLink()} dir="ltr" className="underline decoration-paper/25 underline-offset-4 transition-colors hover:text-blue-light hover:decoration-blue-light">
                    {site.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="label text-paper/45">{t.contact.labels.phone}</dt>
                <dd className="mt-2">
                  <a href={whatsappLink(t.ui.whatsappMessage)} target="_blank" rel="noopener noreferrer" dir="ltr" className="transition-colors hover:text-blue-light">
                    {site.phone.display}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="label text-paper/45">{t.contact.labels.location}</dt>
                <dd className="mt-2">{t.contact.location}</dd>
              </div>
              <div>
                <dt className="label text-paper/45">{t.ui.localTime}</dt>
                <dd className="mt-2">
                  <HailClock />
                </dd>
              </div>
            </dl>
          </div>

          <div ref={globeSlot} className="col-span-12 lg:col-span-5 lg:col-start-8">
            <div className="relative mx-auto aspect-square w-full max-w-[520px]" data-cursor="drag">
              {showGlobe && (
                <Suspense fallback={null}>
                  <MiniGlobe />
                </Suspense>
              )}
              <p lang="en" dir="ltr" className="label pointer-events-none absolute inset-x-0 bottom-2 text-center text-paper/45">
                {site.hail.coords}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
