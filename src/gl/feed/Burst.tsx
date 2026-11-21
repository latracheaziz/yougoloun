import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, InstancedMesh, MeshStandardMaterial, Object3D, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { geo } from './geometry';
import { token } from '../palette';
import { dive, feed } from '../state';
import { journey } from '@/scroll/journey';
import { useApp } from '@/store/app';

const COUNT = 36;
const PER_TAP = 9;
const NAMES = ['blue', 'green', 'blueLight', 'greenLight'] as const;

/**
 * Tap / click anywhere over the 3D part → a burst of glossy hearts flies out of that point
 * (like a "like" on a live stream). Ignored on links and buttons, and once the clouds close.
 */
export function Burst() {
  const mesh = useRef<InstancedMesh>(null);
  const camera = useThree((s) => s.camera);
  const material = useMemo(() => new MeshStandardMaterial({ color: new Color(1, 1, 1), roughness: 0.25, envMapIntensity: 1.2 }), []);
  useEffect(() => () => material.dispose(), [material]);

  const parts = useMemo(() => Array.from({ length: COUNT }, () => ({ life: 0, pos: new Vector3(), vel: new Vector3(), spin: 0, size: 0 })), []);
  const next = useRef(0);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    parts.forEach((_, i) => m.setColorAt(i, token(NAMES[i % NAMES.length])));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [parts]);

  useEffect(() => {
    if (useApp.getState().reducedMotion) return;
    const ray = new Raycaster();
    const plane = new Plane(new Vector3(0, 0, 1), 0);
    const ndc = new Vector2();
    const hit = new Vector3();
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement | null)?.closest('a, button, input, textarea, select, summary, [role="button"]')) return;
      if (journey.y > journey.tracksEnd - journey.stageH || dive.cover > 0.3) return;
      ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      plane.constant = -feed.anchor.z;
      if (!ray.ray.intersectPlane(plane, hit)) return;
      for (let k = 0; k < PER_TAP; k++) {
        const p = parts[next.current];
        next.current = (next.current + 1) % COUNT;
        const a = (k / PER_TAP) * Math.PI * 2 + Math.random() * 0.5;
        p.life = 1;
        p.pos.copy(hit);
        p.vel.set(Math.cos(a) * (0.6 + Math.random() * 0.8), 0.9 + Math.random() * 1.4, 0.4 + Math.random() * 0.8);
        p.spin = (Math.random() - 0.5) * 8;
        p.size = 0.09 + Math.random() * 0.09;
      }
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [camera, parts]);

  const dummy = useMemo(() => new Object3D(), []);
  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(delta, 1 / 20);
    let any = false;
    parts.forEach((p, i) => {
      if (p.life > 0) {
        any = true;
        p.life = Math.max(0, p.life - dt / 1.5);
        p.vel.y -= 1.1 * dt;
        p.vel.multiplyScalar(1 - 0.9 * dt);
        p.pos.addScaledVector(p.vel, dt);
      }
      const age = 1 - p.life;
      const s = p.life > 0 ? p.size * Math.min(1, age * 8) * Math.min(1, p.life * 3) : 1e-4;
      dummy.position.copy(p.pos);
      dummy.rotation.set(0, p.spin * age, Math.sin(age * 6 + i) * 0.4);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.visible = any;
    if (any) m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geo.heart(), material, COUNT]} frustumCulled={false} renderOrder={5} />;
}
