import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { Director } from './Director';
import { Effects } from './Effects';
import { Earth } from './space/Earth';
import { Stars } from './space/Stars';
import { SunFlare } from './space/SunFlare';
import { token } from './palette';
import { useApp } from '@/store/app';
import { qualityPresets } from '@/config/quality';

/**
 * The single fixed WebGL canvas behind the whole site (one context for everything).
 * Lazy-loaded by the Home page so three.js stays out of the first-paint bundle.
 */
export default function Experience() {
  const tier = useApp((s) => s.tier);
  const stepTier = useApp((s) => s.stepTier);
  const setTier = useApp((s) => s.setTier);
  const { maxDpr } = qualityPresets[tier];

  return (
    <Canvas
      aria-hidden="true"
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100lvh', zIndex: 0 }}
      dpr={[1, maxDpr]}
      flat
      resize={{ scroll: false }}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false, alpha: false }}
      camera={{ fov: 35, near: 0.05, far: 600, position: [0, 0, 4.2] }}
      onCreated={({ gl }) => gl.setClearColor(token('night'), 1)}
    >
      <PerformanceMonitor flipflops={3} onIncline={() => stepTier(1)} onDecline={() => stepTier(-1)} onFallback={() => setTier('low')} />
      <Director />
      <Stars />
      <Suspense fallback={null}>
        <Earth />
      </Suspense>
      <SunFlare />
      <Effects />
    </Canvas>
  );
}
