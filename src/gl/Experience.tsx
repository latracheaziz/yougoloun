import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { Director } from './Director';
import { Effects } from './Effects';
import { Stars } from './space/Stars';
import { Nebula } from './space/Nebula';
import { World } from './feed/World';
import { Lights } from './feed/Lights';
import { Burst } from './feed/Burst';
import { Dive } from './dive/Dive';
import { token } from './palette';
import { useApp } from '@/store/app';
import { qualityPresets } from '@/config/quality';

/** Flags the canvas as ready once the world (phone-screen textures included) has mounted. */
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
      <Nebula />
      <Stars />
      <Suspense fallback={null}>
        <Lights />
        <World />
        <ReadySignal />
      </Suspense>
      <Burst />
      <Dive />
      {!noFx && <Effects />}
    </Canvas>
  );
}
