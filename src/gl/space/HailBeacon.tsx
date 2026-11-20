import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, DoubleSide, Quaternion, ShaderMaterial, Vector3, type Mesh } from 'three';
import quadVert from '../shaders/quad.vert?raw';
import pulseFrag from '../shaders/pulse.frag?raw';
import { token } from '../palette';
import { space } from '../state';
import { HAIL_LOCAL } from './arcData';
import { Glow } from './Glow';
import { useApp } from '@/store/app';

/** Hail on the globe: a hot core, sonar rings lying on the surface. Lives in the globe frame. */
export function HailBeacon() {
  const mobile = useApp((s) => s.mobile);
  const corePosition = useMemo(() => HAIL_LOCAL.clone().multiplyScalar(1.004), []);
  const ringPosition = useMemo(() => HAIL_LOCAL.clone().multiplyScalar(1.0025), []);
  const orientation = useMemo(() => new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), HAIL_LOCAL.clone().normalize()), []);
  const color = useMemo(() => token('ember'), []);
  const hot = useMemo(() => token('glow'), []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: quadVert,
        fragmentShader: pulseFrag,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
        uniforms: { uColor: { value: color }, uIntensity: { value: 0 }, uTime: { value: 0 } },
      }),
    [color],
  );
  useEffect(() => () => material.dispose(), [material]);

  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    material.uniforms.uIntensity.value = space.beacon;
    material.uniforms.uTime.value = clock.elapsedTime;
    if (ring.current) ring.current.visible = space.beacon > 0.002;
  });

  return (
    <group>
      <mesh ref={ring} position={ringPosition} quaternion={orientation} material={material} renderOrder={6}>
        <planeGeometry args={[0.16, 0.16]} />
      </mesh>
      <Glow position={corePosition} color={hot} size={mobile ? 34 : 46} intensity={() => space.beacon * 1.2} renderOrder={7} />
    </group>
  );
}
