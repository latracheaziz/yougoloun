import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { Director } from './Director';
import { Effects } from './Effects';
import { Earth } from './space/Earth';
import { Stars } from './space/Stars';
import { SunFlare } from './space/SunFlare';
import { Arcs } from './space/Arcs';
import { Whispers } from './space/Whispers';
import { Rings } from './space/Rings';
import { HailBeacon } from './space/HailBeacon';
import { Dive } from './dive/Dive';
import { token } from './palette';
import { useApp } from '@/store/app';
import { qualityPresets } from '@/config/quality';

/** Flags the canvas as ready once the globe (textures included) has mounted. */
function ReadySignal() {
  useEffect(() => {
    const id = requestAnimationFrame(() => useApp.getState().setGlReady(true));
    return () => {
      cancelAnimationFrame(id);
      useApp.getState().setGlReady(false);
    };
  }, []);
  return null;
}

/**
 * The single fixed WebGL canvas behind the space part of the site.
 * Lazy-loaded after first paint; paused (`active=false`) and later unmounted by the Home page
 * once the visitor is past the clouds.
 */
export default function Experience({ active = true }: { active?: boolean }) {
  const tier = useApp((s) => s.tier);
  const stepTier = useApp((s) => s.stepTier);
  const setTier = useApp((s) => s.setTier);
  const { maxDpr, renderScale } = qualityPresets[tier];
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr) * renderScale;
  // dev-only profiling switch: /ar?nofx renders without postprocessing
  const noFx = import.meta.env.DEV && new URLSearchParams(window.location.search).has('nofx');

  return (
    <Canvas
      aria-hidden="true"
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100lvh', zIndex: 0 }}
      dpr={dpr}
      flat
      frameloop={active ? 'always' : 'never'}
      resize={{ scroll: false }}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false, alpha: false }}
      camera={{ fov: 35, near: 0.01, far: 900, position: [0, 0, 4.2] }}
      onCreated={({ gl }) => gl.setClearColor(token('night'), 1)}
    >
      <PerformanceMonitor flipflops={3} onIncline={() => stepTier(1)} onDecline={() => stepTier(-1)} onFallback={() => setTier('low')} />
      <Director />
      <Stars />
      <Suspense fallback={null}>
        <Earth>
          <Arcs />
          <Whispers />
          <Rings />
          <HailBeacon />
        </Earth>
        <ReadySignal />
      </Suspense>
      <SunFlare />
      <Dive />
      {!noFx && <Effects />}
    </Canvas>
  );
}
