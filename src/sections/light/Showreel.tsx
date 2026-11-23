import { useEffect, useRef, useState } from 'react';
import { useContent } from '@/i18n/LangContext';
import { useApp } from '@/store/app';
import { showreel } from '@/config/light';

/**
 * The agency's story video, right under the Portfolio title.
 * The file only starts loading near view; it plays muted and looped while on screen (not with reduced
 * motion) and pauses off screen. Click = play / pause; the sound button unmutes (and restarts it once,
 * so sound starts from the beginning). A thin line shows the progress.
 */
export function Showreel({ className = '' }: { className?: string }) {
  const t = useContent();
  const reduced = useApp((s) => s.reducedMotion);
  const box = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const restarted = useRef(false);
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false); // paused by the visitor: don't autoplay again

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const nearIo = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '60% 0px' });
    const seenIo = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    nearIo.observe(el);
    seenIo.observe(el);
    return () => (nearIo.disconnect(), seenIo.disconnect());
  }, []);

  // autoplay while on screen
  useEffect(() => {
    const v = video.current;
    if (!v || !near) return;
    if (inView && !reduced && !paused) v.play().catch(() => {});
    else if (!inView) v.pause();
  }, [near, inView, reduced, paused]);

  // progress line (timeupdate: a few times a second, no layout reads)
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const tick = () => bar.current && (bar.current.style.transform = `scaleX(${v.duration ? v.currentTime / v.duration : 0})`);
    const on = () => setPlaying(true);
    const off = () => setPlaying(false);
    v.addEventListener('timeupdate', tick);
    v.addEventListener('play', on);
    v.addEventListener('pause', off);
    return () => {
      v.removeEventListener('timeupdate', tick);
      v.removeEventListener('play', on);
      v.removeEventListener('pause', off);
    };
  }, []);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      setPaused(false);
      v.play().catch(() => {});
    } else {
      setPaused(true);
      v.pause();
    }
  };
  const toggleSound = () => {
    const v = video.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    setMuted(next);
    if (!next && !restarted.current) {
      restarted.current = true;
      v.currentTime = 0;
    }
    if (v.paused) {
      setPaused(false);
      v.play().catch(() => {});
    }
  };

  return (
    <figure ref={box} className={`group relative isolate overflow-hidden rounded-[28px] bg-navy shadow-[0_50px_100px_-50px_rgba(20,20,46,0.75)] ${className}`}>
      <video
        ref={video}
        src={near ? showreel.src : undefined}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        aria-label={t.ui.showreel.title}
        data-cursor="view"
        onClick={toggle}
        className="block aspect-video max-h-[82svh] w-full cursor-pointer object-cover"
      />

      {/* soft shade so the controls read on any frame */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/55 to-transparent" />

      <figcaption className="pointer-events-none absolute start-4 top-4 md:start-6 md:top-6">
        <span className="bubble inline-flex items-center gap-2 bg-paper/90 px-3.5 py-1.5 text-[0.85rem] font-medium text-ink">
          <span className={`size-1.5 rounded-full ${playing ? 'bg-green' : 'bg-ink/40'}`} />
          {t.ui.showreel.title}
        </span>
      </figcaption>

      {/* big play button while it isn't playing (reduced motion, or paused) */}
      {!playing && (
        <button
          type="button"
          onClick={toggle}
          aria-label={t.ui.showreel.play}
          className="absolute start-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand-gradient text-ink shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] transition-transform duration-500 hover:scale-105 rtl:translate-x-1/2 md:size-24"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="ms-1 size-8">
            <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
          </svg>
        </button>
      )}

      <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 md:inset-x-6 md:bottom-6">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? t.ui.showreel.pause : t.ui.showreel.play}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-paper/90 text-ink transition-colors hover:bg-white md:size-11"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
            {playing ? <path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" /> : <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />}
          </svg>
        </button>
        <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/25">
          <span ref={bar} className="absolute inset-0 origin-left rounded-full bg-brand-gradient rtl:origin-right" style={{ transform: 'scaleX(0)' }} />
        </span>
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={!muted}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-paper/90 px-3 text-[0.78rem] font-medium text-ink transition-colors hover:bg-white md:h-11 md:gap-2 md:px-4 md:text-[0.85rem]"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
            <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
            {muted ? (
              <path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            ) : (
              <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            )}
          </svg>
          {muted ? t.ui.sound.on : t.ui.sound.off}
        </button>
      </div>
    </figure>
  );
}
