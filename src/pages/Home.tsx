import { lazy, Suspense, useEffect, useState } from 'react';
import { useContent } from '@/i18n/LangContext';
import { site } from '@/config/site';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SmoothScroll } from '@/scroll/SmoothScroll';
import { Tracks } from '@/scroll/Tracks';
import { Hero } from '@/sections/Hero';
import { SectionStub } from '@/sections/SectionStub';

// three.js + R3F load in their own chunk, after the HTML has painted.
const Experience = lazy(() => import('@/gl/Experience'));

export default function Home() {
  const t = useContent();
  const [mountGL, setMountGL] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMountGL(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <>
      <a href="#main" className="label sr-only z-50 rounded-full bg-sand px-4 py-3 text-night focus:not-sr-only focus:fixed focus:start-4 focus:top-4">
        {t.ui.skipToContent}
      </a>

      {mountGL && (
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      )}

      <Header />

      <main id="main">
        <Tracks />
        <Hero />
        <SectionStub id="about" label={t.about.label} title={t.about.title} />
        <SectionStub id="cornerstones" title={t.cornerstones.title} />
        <SectionStub id="positioning" label={t.positioning.label} title={t.positioning.title} />
        <SectionStub
          id="landing"
          label={t.ui.hailLabel}
          title={
            <span lang="en" dir="ltr" className="font-mono text-[0.6em] tracking-tight">
              {site.hail.coords}
            </span>
          }
        />
        <SectionStub id="services" label={t.services.label} title={t.services.title} />
        <SectionStub id="portfolio" label={t.portfolio.label} title={t.portfolio.title} />
        <SectionStub id="process" label={t.process.label} title={t.process.title} />
        <SectionStub id="faq" label={t.faq.label} title={t.faq.title} />
        <SectionStub id="contact" title={t.contact.headline} />
      </main>

      <Footer />
      <div className="grain" aria-hidden="true" />
      <SmoothScroll />
    </>
  );
}
