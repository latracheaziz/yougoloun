import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, DoubleSide, Euler, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, RingGeometry, Vector3, type Mesh } from 'three';
import { geo } from '../props/geometry';
import { glossy } from '../props/materials';
import { world } from '../state';
import { bindHold, hold, tickHold } from '@/interaction/hold';
import { HERO, ORB, PORTAL_WINDOW_Y } from './layout';
import { useApp } from '@/store/app';

/**
 * THE VOICE SPEAKS — what "hold to awaken" does in 3D. At full charge the current subject (the bubble
 * portal, the walkway, the orb) bursts: a spray of glossy hearts and comment bubbles flies out and
 * drifts up into the sky (word of mouth, the agency's name), and rings run across the pool.
 * While charging, `world.charge` lets the portals glow and the camera lean in (Director).
 */

const PER_BURST = 34;
const POOL = PER_BURST * 3; // up to three bursts in the air at once
const KINDS = 3; // blue heart · white comment · green heart

interface Particle {
  alive: boolean;
  born: number;
  life: number;
  pos: Vector3;
  vel: Vector3;
  spin: Vector3;
  rot: Euler;
  size: number;
}

const tmpM = new Matrix4();
const tmpQ = new Quaternion();
const tmpS = new Vector3();
const forward = new Vector3();

/** Where the voice speaks from, for the current chapter. */
function origin(target: Vector3, camera: { position: Vector3; getWorldDirection: (v: Vector3) => Vector3 }) {
  if (world.G < 1.25) return target.set(HERO.center.x, PORTAL_WINDOW_Y, 0.4);
  if (world.G >= 2) return target.copy(ORB.center);
  camera.getWorldDirection(forward);
  return target.copy(camera.position).addScaledVector(forward, 7).setY(2.2);
}

export function Voice() {
  const reduced = useApp((s) => s.reducedMotion);
  const meshes = useRef<(InstancedMesh | null)[]>([]);
  const particles = useMemo<Particle[][]>(
    () =>
      Array.from({ length: KINDS }, () =>
        Array.from({ length: POOL / KINDS }, () => ({
          alive: false,
          born: 0,
          life: 3,
          pos: new Vector3(),
          vel: new Vector3(),
          spin: new Vector3(),
          rot: new Euler(),
          size: 0.3,
        })),
      ),
    [],
  );
  const geometries = useMemo(() => [geo.heartGradient(), geo.comment(), geo.heart()], []);
  const materials = useMemo(() => [glossy('blue', false, 0, { gradient: true }), glossy('white'), glossy('green')], []);

  // ripples on the hero pool
  const ringGeo = useMemo(() => new RingGeometry(0.94, 1, 128), []);
  const ringMats = useMemo(
    () => [0, 1, 2].map(() => new MeshBasicMaterial({ color: new Color(1.4, 1.45, 1.5), transparent: true, opacity: 0, depthWrite: false, side: DoubleSide })),
    [],
  );
  const rings = useRef<(Mesh | null)[]>([]);
  useEffect(() => () => (ringGeo.dispose(), ringMats.forEach((m) => m.dispose())), [ringGeo, ringMats]);

  useEffect(() => bindHold(), []);

  const from = useMemo(() => new Vector3(), []);
  useFrame(({ clock, camera }, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const t = clock.elapsedTime;
    const burst = tickHold(dt, t);
    world.charge = hold.charge;

    if (burst && !reduced) {
      origin(from, camera);
      // toss the spray towards the camera side and up, so it reads on screen
      camera.getWorldDirection(forward).multiplyScalar(-1);
      let k = 0;
      for (const group of particles)
        for (const p of group) {
          if (p.alive || k >= PER_BURST) continue;
          k++;
          const a = Math.random() * Math.PI * 2;
          const spread = 0.55 + Math.random() * 0.6;
          p.alive = true;
          p.born = t + Math.random() * 0.18;
          p.life = 2.6 + Math.random() * 1.4;
          p.pos.copy(from).add(new Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.4));
          p.vel
            .set(Math.cos(a) * spread * 1.25, 0.2 + Math.random() * 0.55, Math.sin(a) * spread * 0.5)
            .addScaledVector(forward, 0.85)
            .normalize()
            .multiplyScalar(4.5 + Math.random() * 4.5);
          p.spin.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4);
          p.rot.set(Math.random() * 0.6, Math.random() * Math.PI, 0);
          p.size = 0.22 + Math.random() * 0.24;
        }
      world.ribbon += 0.8; // the name band whips round
    }

    particles.forEach((group, kind) => {
      const mesh = meshes.current[kind];
      if (!mesh) return;
      let n = 0;
      for (const p of group) {
        if (!p.alive) continue;
        const age = t - p.born;
        if (age > p.life) {
          p.alive = false;
          continue;
        }
        if (age < 0) continue;
        // drag + buoyancy: they slow down and float up like released balloons
        p.vel.multiplyScalar(Math.exp(-1.6 * dt));
        p.vel.y += 0.9 * dt;
        p.pos.addScaledVector(p.vel, dt);
        p.rot.x += p.spin.x * dt;
        p.rot.y += p.spin.y * dt;
        p.rot.z += p.spin.z * dt * 0.3;
        const grow = Math.min(1, age / 0.25);
        const fade = 1 - Math.max(0, (age - p.life + 0.7) / 0.7);
        const s = p.size * grow * (1 - (1 - grow) * 0.3) * Math.max(fade, 0);
        tmpQ.setFromEuler(p.rot);
        tmpS.setScalar(Math.max(s, 1e-4));
        tmpM.compose(p.pos, tmpQ, tmpS);
        mesh.setMatrixAt(n++, tmpM);
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    });

    // pool ripples (hero), staggered
    const since = hold.burstAt < 0 ? 99 : t - hold.burstAt;
    rings.current.forEach((r, i) => {
      if (!r) return;
      const age = since - i * 0.22;
      const on = age > 0 && age < 1.8 && world.G < 1.25 && !reduced;
      r.visible = on;
      if (!on) return;
      const radius = 0.8 + age * 3.4;
      r.scale.setScalar(Math.min(radius, HERO.pool - 0.1));
      ringMats[i].opacity = 0.55 * (1 - age / 1.8);
    });
  });

  return (
    <group>
      {geometries.map((g, i) => (
        <instancedMesh
          key={i}
          ref={(m) => void (meshes.current[i] = m)}
          args={[g, materials[i], POOL / KINDS]}
          count={0}
          frustumCulled={false}
          castShadow
        />
      ))}
      {ringMats.map((m, i) => (
        <mesh key={i} ref={(r) => void (rings.current[i] = r)} geometry={ringGeo} material={m} rotation-x={-Math.PI / 2} position={[HERO.center.x, 0.275, HERO.center.z]} visible={false} />
      ))}
    </group>
  );
}
