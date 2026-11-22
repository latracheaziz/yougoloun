import { Suspense, useCallback, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { NeutralToneMapping } from 'three';
import { Precompile, prodGl } from '../Precompile';

/**
 * Small transparent "product shot" canvases for the light site (services, process, statements):
 * studio reflections from Lightformers (no HDR download), a key + fill light, Neutral tone mapping
 * (brand colours stay true), native MSAA, no postprocessing. `active` pauses the loop when off screen.
 */
export function StageCanvas({ active, children, className, fov = 30, z = 4 }: { active: boolean; children: ReactNode; className?: string; fov?: number; z?: number }) {
  const [compiled, setCompiled] = useState(false);
  const onCompiled = useCallback(() => setCompiled(true), []);
  return (
    <Canvas
      aria-hidden="true"
      className={className}
      dpr={[1, 1.5]}
      frameloop={active && compiled ? 'always' : 'never'}
      resize={{ scroll: false }}
      onCreated={prodGl}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: NeutralToneMapping }}
      camera={{ fov, near: 0.1, far: 50, position: [0, 0, z] }}
    >
      <Studio />
      <Suspense fallback={null}>
        {children}
        <Precompile onDone={onCompiled} />
      </Suspense>
    </Canvas>
  );
}

export function Studio() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      <Environment resolution={64} frames={1} environmentIntensity={1.15}>
        <Lightformer form="rect" intensity={2.4} position={[0, 4, 4]} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#D6EEFA" position={[-5, 1, 2]} rotation-y={Math.PI / 2.5} scale={[5, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#E4F2D6" position={[5, 1, 2]} rotation-y={-Math.PI / 2.5} scale={[5, 4, 1]} />
        <Lightformer form="ring" intensity={2} position={[0, 0, -5]} scale={5} />
        <Lightformer form="circle" intensity={3} position={[2.5, 3, 3]} scale={1.2} />
      </Environment>
    </>
  );
}
