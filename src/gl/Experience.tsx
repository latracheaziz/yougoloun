import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { NeutralToneMapping, NoToneMapping } from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { Director } from './Director';
import { Precompile, prodGl } from './Precompile';
import { isWeakGpu } from '@/config/quality';
import { Effects } from './Effects';
import { World } from './world/World';
import { HORIZON } from './world/Sky';
import { Dive } from './dive/Dive';
import { useApp } from '@/store/app';
import { journey } from '@/scroll/journey';
import { qualityPresets } from '@/config/quality';
import { markGlDrawn } from '@/loader';


/**
 * Tone mapping lives in the composer when there is one (it needs the HDR buffer), otherwise in the
 * renderer — same Khronos Neutral curve either way. Switching recompiles materials (tier changes only).
 */
function ToneMode({ post }: { post: boolean }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMapping = post ? NoToneMapping : NeutralToneMapping;
    gl.toneMappingExposure = 1;
  }, [gl, post]);
  return null;
}

/**
 * Tells the boot loader the world is really on screen. glReady (compiled) comes earlier, and "frames
 * issued" isn't "frames drawn": on integrated GPUs the first heavy frames queue up for a second or more.
 * So a GPU fence goes in after the first two frames and is polled (non-blocking) until the GPU has
 * actually finished them. WebGL1: a few frames' grace instead.
 */
function Drawn() {
  const gl = useThree((s) => s.gl);
  const st = useRef<{ frames: number; sync: WebGLSync | null; done: boolean }>({ frames: 0, sync: null, done: false });
  useFrame(() => {
    const s = st.current;
    if (s.done) return;
    const ctx = gl.getContext();
    const gl2 = typeof WebGL2RenderingContext !== 'undefined' && ctx instanceof WebGL2RenderingContext ? ctx : null;
    s.frames++;
    // useFrame runs before this frame's render: a fence placed now follows the two frames already drawn
    if (s.frames === 3) {
      s.sync = gl2?.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0) ?? null;
      gl2?.flush();
      return;
    }
    if (s.frames < 3) return;
    const finished = s.sync && gl2 ? gl2.getSyncParameter(s.sync, gl2.SYNC_STATUS) === gl2.SIGNALED : s.frames > 8;
    if (finished) {
      if (s.sync && gl2) gl2.deleteSync(s.sync);
      s.done = true;
      markGlDrawn();
    }
  });
  return null;
}

/** 1× density while scrolling, full density once still (see QualityPreset.motionDpr). */
function MotionDpr({ full }: { full: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const st = useRef({ low: false, still: 0 });
  useFrame((_, delta) => {
    const s = st.current;
    if (Math.abs(journey.velocity) > 0.4) {
      s.still = 0;
      if (!s.low && full > 1) {
        s.low = true;
        setDpr(1);
      }
    } else {
      s.still += delta;
      if (s.low && s.still > 0.35) {
        s.low = false;
        setDpr(full);
      }
    }
  });
  return null;
}

/**
 * The single fixed WebGL canvas behind the 3D part of the site.
 * Lazy-loaded after first paint; paused (`active=false`) and later unmounted by the Home page
 * once the visitor is past the clouds.
 */
export default function Experience({ active = true }: { active?: boolean }) {
  const tier = useApp((s) => s.tier);
  const stepTier = useApp((s) => s.stepTier);
  const setTier = useApp((s) => s.setTier);
  const tierLocked = useApp((s) => s.tierLocked);
  const { maxDpr, renderScale, post, motionDpr } = qualityPresets[tier];
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr) * renderScale;
  // dev-only profiling switch: /ar?nofx renders without postprocessing
  const noFx = import.meta.env.DEV && new URLSearchParams(window.location.search).has('nofx');
  // nothing is drawn until every shader is compiled in the background (see Precompile)
  const [compiled, setCompiled] = useState(false);
  const onCompiled = useCallback(() => {
    setCompiled(true);
    requestAnimationFrame(() => requestAnimationFrame(() => useApp.getState().setGlReady(true)));
  }, []);
  useEffect(() => () => useApp.getState().setGlReady(false), []);

  return (
    <Canvas
      aria-hidden="true"
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100lvh', zIndex: 0 }}
      dpr={dpr}
      shadows="percentage"
      frameloop={active && compiled ? 'always' : 'never'}
      resize={{ scroll: false }}
      gl={{ antialias: true, powerPreference: 'high-performance', stencil: false, alpha: false }}
      camera={{ fov: 35, near: 0.01, far: 900, position: [0, 0, 4.2] }}
      onCreated={({ gl }) => {
        prodGl({ gl });
        gl.setClearColor(HORIZON, 1);
        // integrated GPU → start at 'medium' (read from this context: no extra one at start-up)
        const app = useApp.getState();
        if (!app.tierLocked && app.tier === 'high' && isWeakGpu(gl.getContext())) app.capTier('medium');
      }}
    >
      {!tierLocked && <PerformanceMonitor flipflops={3} onIncline={() => stepTier(1)} onDecline={() => stepTier(-1)} onFallback={() => setTier('low')} />}
      <Director />
      <Suspense fallback={null}>
        <World />
        <Precompile onDone={onCompiled} />
        <Drawn />
      </Suspense>
      <Dive />
      <ToneMode post={post && !noFx} />
      {motionDpr && <MotionDpr full={dpr} />}
      {post && !noFx && <Effects />}
    </Canvas>
  );
}
