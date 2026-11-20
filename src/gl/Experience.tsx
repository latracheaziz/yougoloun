import { lazy, Suspense, useEffect, useState } from 'react';
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

// The Hail world (terrain worker, sky, pin) loads in its own chunk once the hero is up.
const HailWorld = lazy(() => import('./hail/HailWorld'));

function useIdleMount(delay: number) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(() => setReady(true), { timeout: 1500 });
      else setReady(true);
    }, delay);
    return () => window.clearTimeout(id);
  }, [delay]);
  return ready;
}

/**
 * The single fixed WebGL canvas behind the whole site (one context for everything).
 * Lazy-loaded by the Home page so three.js stays out of the first-paint bundle.
 */
export default function Experience() {
  const tier = useApp((s) => s.tier);
  const stepTier = useApp((s) => s.stepTier);
  const setTier = useApp((s) => s.setTier);
  const { maxDpr, renderScale } = qualityPresets[tier];
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr) * renderScale;
  const mountHail = useIdleMount(1200);
  // dev-only profiling switch: /ar?nofx renders without postprocessing
  const noFx = import.meta.env.DEV && new URLSearchParams(window.location.search).has('nofx');

  return (
    <Canvas
      aria-hidden="true"
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100lvh', zIndex: 0 }}
      dpr={dpr}
      flat
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
      </Suspense>
      <SunFlare />
      {mountHail && (
        <Suspense fallback={null}>
          <HailWorld />
        </Suspense>
      )}
      <Dive />
      {!noFx && <Effects />}
    </Canvas>
  );
}
