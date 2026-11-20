import { timeline } from '@/config/timeline';
import { useMediaQuery } from '@/hooks/useMediaQuery';

/**
 * Invisible scroll spacers — one per section, sized from timeline.ts.
 * Their sum is the length of the journey; the stages themselves are fixed layers.
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
      {/* one extra screen so the last section can reach p = 1 before the footer arrives */}
      <div className="track" style={{ height: 'var(--stage-h)' }} />
    </div>
  );
}
