import { timeline } from '@/config/timeline';
import { useMediaQuery } from '@/hooks/useMediaQuery';

/**
 * Invisible scroll spacers — one per section, sized from timeline.ts.
 * Their sum is the length of the space journey; the stages themselves are fixed layers.
 * The light document follows straight after the last track (it enters during the dive white-out).
 */
export function Tracks() {
  const mobile = useMediaQuery(`(max-width: ${timeline.mobileBreakpoint - 0.02}px)`);
  return (
    <div aria-hidden="true">
      {timeline.sections.map((s) => {
        const scales = !('scaleOnMobile' in s) || s.scaleOnMobile !== false;
        const k = mobile && scales ? timeline.mobileScale : 1;
        return <div key={s.id} data-track={s.id} className="track" style={{ height: `calc(var(--stage-h) * ${((s.length * k) / 100).toFixed(4)})` }} />;
      })}
    </div>
  );
}
