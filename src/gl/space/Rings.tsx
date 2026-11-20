import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, MathUtils, Quaternion, ShaderMaterial, TorusGeometry, Vector3, type Mesh } from 'three';
import ringVert from '../shaders/ring.vert?raw';
import ringFrag from '../shaders/ring.frag?raw';
import { token, type Token } from '../palette';
import { space } from '../state';
import { HAIL_LOCAL } from './arcData';
import { Glow } from './Glow';
import { useApp } from '@/store/app';

export const RING_RADIUS = 1.42;
const Z = new Vector3(0, 0, 1);
const Y = new Vector3(0, 1, 0);

/** Ring order = cornerstone order in content: Performance, Strategy, Production, Growth. */
const RINGS: { color: Token; normal: Vector3; speed: number; phase: number }[] = [
  { color: 'ember', normal: new Vector3(0.12, 1, 0.08), speed: 0.07, phase: 0.1 },
  { color: 'sand', normal: new Vector3(0.75, 0.62, 0.2), speed: -0.055, phase: 0.45 },
  { color: 'glow', normal: new Vector3(-0.68, 0.5, 0.52), speed: 0.06, phase: 0.7 },
  { color: 'haze', normal: new Vector3(0.18, 0.42, -0.9), speed: -0.075, phase: 0.25 },
];

/** Final normals: four great circles that all contain Hail's direction, 45° apart → they meet above Hail. */
function finalNormals() {
  const h = HAIL_LOCAL.clone().normalize();
  const u = new Vector3().crossVectors(h, Y).normalize();
  const w = new Vector3().crossVectors(h, u).normalize();
  return RINGS.map((_, i) => {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    return u.clone().multiplyScalar(Math.cos(a)).addScaledVector(w, Math.sin(a)).normalize();
  });
}

/** Four orbital rings, one per cornerstone. They light up in turn, then tilt and intersect above Hail. */
export function Rings() {
  const mobile = useApp((s) => s.mobile);
  const geometry = useMemo(() => new TorusGeometry(RING_RADIUS, mobile ? 0.0065 : 0.0038, 6, 280), [mobile]);

  const rings = useMemo(() => {
    const finals = finalNormals();
    return RINGS.map((r, i) => ({
      material: new ShaderMaterial({
        vertexShader: ringVert,
        fragmentShader: ringFrag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uReveal: { value: 0 },
          uOpacity: { value: 0 },
          uTime: { value: 0 },
          uSpeed: { value: r.speed },
          uPhase: { value: r.phase },
          uColor: { value: token(r.color).multiplyScalar(1.2) },
        },
      }),
      start: new Quaternion().setFromUnitVectors(Z, r.normal.clone().normalize()),
      end: new Quaternion().setFromUnitVectors(Z, finals[i]),
      precession: new Quaternion(),
      current: new Quaternion(),
    }));
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => rings.forEach((r) => r.material.dispose()), [rings]);

  const meshes = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const k = MathUtils.smootherstep(space.rings.intersect, 0, 1);
    rings.forEach((r, i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      const reveal = space.rings.reveal[i];
      mesh.visible = reveal > 0.001 && space.rings.opacity > 0.002;
      if (!mesh.visible) return;
      // slow orbital precession while free, settling into the shared intersection
      r.precession.setFromAxisAngle(Y, t * 0.035 * (i % 2 ? -1 : 1) * (1 - k));
      r.current.copy(r.precession).multiply(r.start).slerp(r.end, k);
      mesh.quaternion.copy(r.current);
      r.material.uniforms.uReveal.value = reveal;
      r.material.uniforms.uOpacity.value = space.rings.opacity;
      r.material.uniforms.uTime.value = t;
    });
  });

  const sparkAt = useMemo(() => HAIL_LOCAL.clone().multiplyScalar(RING_RADIUS), []);
  const sparkColor = useMemo(() => token('glow'), []);

  return (
    <group>
      {rings.map((r, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          geometry={geometry}
          material={r.material}
          renderOrder={4}
          frustumCulled={false}
        />
      ))}
      <Glow position={sparkAt} color={sparkColor} size={mobile ? 70 : 110} intensity={() => space.rings.opacity * MathUtils.smoothstep(space.rings.intersect, 0.75, 1)} />
    </group>
  );
}
