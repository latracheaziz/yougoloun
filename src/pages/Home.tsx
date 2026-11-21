import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useContent } from '@/i18n/LangContext';
import { useApp } from '@/store/app';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AltitudeMeter } from '@/components/AltitudeMeter';
import { Cursor } from '@/interaction/Cursor';
import { ScrollProgress } from '@/components/ScrollProgress';
import { SmoothScroll } from '@/scroll/SmoothScroll';
import { Tracks } from '@/scroll/Tracks';
import { PaperLayer } from '@/scroll/PaperLayer';
import { journey, onJourney, sectionIndex } from '@/scroll/journey';
import { sectionConfig } from '@/config/timeline';
import { Hero } from '@/sections/Hero';
import { About } from '@/sections/space/About';
import { Cornerstones } from '@/sections/space/Cornerstones';
import { DiveTitle } from '@/sections/space/Dive';
import { Arrival } from '@/sections/light/Arrival';
import { Statements } from '@/sections/light/Statements';
import { Services } from '@/sections/light/Services';
import { Platforms } from '@/sections/light/Platforms';
import { Buzz } from '@/sections/light/Buzz';
import { Portfolio } from '@/sections/light/Portfolio';
import { Process } from '@/sections/light/Process';
import { Faq } from '@/sections/light/Faq';
import { Contact } from '@/sections/light/Contact';

// three.js + R3F load in their own chunk, after the HTML has painted.
const Experience = lazy(() => import('@/gl/Experience'));

/** Past this point of the dive the paper is opaque: the canvas pauses, then unmounts. */
const PAUSE_AT = sectionConfig('positioning').keys.paper[1] + 0.02;
const UNMOUNT_AFTER_MS = 4000;
const LIGHT_SECTIONS = ['services', 'portfolio', 'process', 'faq', 'contact'];

/** Canvas lifecycle: mounted while the space part can be seen; paused, then freed, after the clouds. */
function useCanvasLifecycle() {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(true);
  const state = useRef({ mounted: false, active: true, timer: 0 });

  useEffect(() => {
    const s = state.current;
    const pausePoint = () => (journey.starts[sectionIndex.positioning] ?? 0) + (journey.lengths[sectionIndex.positioning] ?? 0) * PAUSE_AT;
    const apply = () => {
      if (!journey.lengths.length) return;
      const past = journey.y > pausePoint();
      if (past) {
        if (s.active) setActive((s.active = false));
        if (s.mounted && !s.timer) {
          s.timer = window.setTimeout(() => {
            s.timer = 0;
            if (journey.y > pausePoint()) setMounted((s.mounted = false));
          }, UNMOUNT_AFTER_MS);
        }
      } else {
        window.clearTimeout(s.timer);
        s.timer = 0;
        if (!s.active) setActive((s.active = true));
        if (!s.mounted) setMounted((s.mounted = true));
      }
    };
    // first mount after first paint (and only if the space part is in reach)
    const raf = requestAnimationFrame(apply);
    const off = onJourney(apply);
    return () => {
      cancelAnimationFrame(raf);
      off();
      window.clearTimeout(s.timer);
    };
  }, []);

  return { mounted, active };
}

/** Header highlight for the light sections (the space part reports its own track). */
function useLightSectionObserver() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) useApp.getState().setActiveSection(e.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    LIGHT_SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);
}

export default function Home() {
  const t = useContent();
  const gl = useCanvasLifecycle();
  useLightSectionObserver();

  return (
    <>
      <a href="#main" className="label sr-only z-50 rounded-full bg-mist px-4 py-3 text-night focus:not-sr-only focus:fixed focus:start-4 focus:top-4">
        {t.ui.skipToContent}
      </a>

      {gl.mounted && (
        <Suspense fallback={null}>
          <Experience active={gl.active} />
        </Suspense>
      )}
      <PaperLayer />

      <Header />

      <main id="main">
        {/* SPACE — scroll tracks + fixed stages over the canvas */}
        <Tracks />
        <Hero />
        <About />
        <Cornerstones />
        <DiveTitle />

        {/* LIGHT — normal document flow, slides up over the white-out */}
        <div className="light relative z-20">
          <Arrival />
          <Statements />
          <Services />
          <Platforms />
          <Buzz />
          <Portfolio />
          <Process />
          <Faq />
          <Contact />
        </div>
      </main>

      <Footer />
      <AltitudeMeter />
      <Cursor />
      <ScrollProgress />
      <div className="grain" aria-hidden="true" />
      <SmoothScroll />
    </>
  );
}
