import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useContent } from '@/i18n/LangContext';
import { useApp } from '@/store/app';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Cursor } from '@/interaction/Cursor';
import { ScrollProgress } from '@/components/ScrollProgress';
import { ChapterRail } from '@/components/ChapterRail';
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
import { Feed } from '@/sections/light/Feed';
import { Portfolio } from '@/sections/light/Portfolio';
import { Process } from '@/sections/light/Process';
import { Faq } from '@/sections/light/Faq';
import { Contact } from '@/sections/light/Contact';
import { Socials } from '@/sections/light/Socials';
import { boot, finishLoader } from '@/loader';

// three.js + R3F load in their own chunk, after the HTML has painted.
const Experience = lazy(() => import('@/gl/Experience'));

/** Past this point of the dive the paper is opaque: the canvas pauses, then unmounts. */
const PAUSE_AT = sectionConfig('positioning').keys.paper[1] + 0.02;
const UNMOUNT_AFTER_MS = 4000;
const LIGHT_SECTIONS = ['services', 'portfolio', 'process', 'faq', 'contact'];

/** Scroll position (px) past which the space part is covered by paper and needs no canvas. */
const pausePoint = () => (journey.starts[sectionIndex.positioning] ?? 0) + (journey.lengths[sectionIndex.positioning] ?? 0) * PAUSE_AT;

/** Boot loader (index.html): leaves once the 3D world has drawn — or isn't needed (reloaded further
 *  down the page) — after at least one wave of the letters; never later than LOADER_MAX_MS. */
const LOADER_MIN_MS = 1700;
const LOADER_MAX_MS = 8000;
function useBootLoader() {
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now(); // since navigation start
      const spaceInView = !journey.lengths.length || journey.y <= pausePoint();
      if (now > LOADER_MAX_MS || (now > LOADER_MIN_MS && (boot.glDrawn || !spaceInView))) {
        window.clearInterval(id);
        finishLoader();
      }
    }, 120);
    return () => window.clearInterval(id);
  }, []);
}

/** Canvas lifecycle: mounted while the space part can be seen; paused, then freed, after the clouds. */
function useCanvasLifecycle() {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(true);
  const state = useRef({ mounted: false, active: true, timer: 0 });

  useEffect(() => {
    const s = state.current;
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

/**
 * The light site (everything below the clouds) mounts just after first paint, when the browser is idle:
 * at load, the hero's layout work then only covers the 3D part's small DOM (measured: building and
 * laying out the whole page up front cost ~400 ms of freezes). Nobody can scroll there that fast; a deep
 * link (#services…) mounts it at once.
 */
function useLightSite() {
  const [ready, setReady] = useState(() => typeof window !== 'undefined' && window.location.hash.length > 1);
  useEffect(() => {
    if (ready) return;
    const go = () => setReady(true);
    const idle = 'requestIdleCallback' in window;
    const id = idle ? window.requestIdleCallback(go, { timeout: 1200 }) : window.setTimeout(go, 600);
    // anything that needs it sooner (nav click, fast scroll) asks for it
    window.addEventListener('yg:light', go);
    return () => {
      if (idle) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
      window.removeEventListener('yg:light', go);
    };
  }, [ready]);
  // the page just grew: re-measure every scroll trigger once it's laid out
  useEffect(() => {
    if (!ready) return;
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [ready]);
  return ready;
}

/** Header highlight for the light sections (the space part reports its own track). */
function useLightSectionObserver(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
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
  }, [ready]);
}

export default function Home() {
  const t = useContent();
  const gl = useCanvasLifecycle();
  useBootLoader();
  const light = useLightSite();
  useLightSectionObserver(light);

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
          {light && (
            <>
              <Arrival />
              <Statements />
              <Services />
              <Platforms />
              <Buzz />
              <Feed />
              <Portfolio />
              <Process />
              <Faq />
              <Contact />
              <Socials />
            </>
          )}
        </div>
      </main>

      <Footer />
      <Cursor />
      <ScrollProgress />
      <ChapterRail />
      <div className="grain" aria-hidden="true" />
      <SmoothScroll />
    </>
  );
}
