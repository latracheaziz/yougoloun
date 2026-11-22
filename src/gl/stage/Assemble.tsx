import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, Euler, InstancedMesh, MathUtils, Matrix4, MeshPhysicalMaterial, Quaternion, Vector2, Vector3, type Group } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { StageCanvas } from './Studio';
import { token } from '../palette';
import { useApp } from '@/store/app';

/**
 * FROM CHAOS TO SYSTEMS — the positioning statements as a sculpture. 125 glossy blocks in the brand
 * palette scatter, then assemble as you scroll each statement into its own order:
 *   01 Visibility → Conversion           a funnel
 *   02 Content → Structured Systems      a cube grid
 *   03 Branding → Revenue-Driven Identity rising bars
 * Between statements they burst apart and re-form. The cursor knocks blocks loose; drag spins it.
 */

const N = 125;
const B = 0.3; // block size
const { clamp, damp, smoothstep } = MathUtils;

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shapes() {
  const rand = rng(77);
  const chaos: Vector3[] = [];
  for (let i = 0; i < N; i++) {
    const v = new Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize().multiplyScalar(1.2 + rand() * 1.4);
    v.y *= 0.8;
    chaos.push(v);
  }
  // funnel: rings narrowing downwards
  const funnel: Vector3[] = [];
  const rings = [24, 22, 19, 17, 14, 11, 9, 6, 3];
  let k = 0;
  rings.forEach((count, r) => {
    const radius = 1.25 - r * 0.13;
    const y = 1.2 - r * 0.3;
    for (let j = 0; j < count && k < N; j++, k++) {
      const a = (j / count) * Math.PI * 2 + r * 0.3;
      funnel.push(new Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius));
    }
  });
  while (funnel.length < N) funnel.push(new Vector3(0, -1.5, 0));
  // cube grid 5×5×5
  const grid: Vector3[] = [];
  for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) for (let z = 0; z < 5; z++) grid.push(new Vector3((x - 2) * 0.36, (y - 2) * 0.36, (z - 2) * 0.36));
  // rising bars: 5 rows × 5 columns of stacks, taller to the back-right
  const bars: Vector3[] = [];
  const heights: number[][] = [];
  for (let x = 0; x < 5; x++) {
    heights.push([]);
    for (let z = 0; z < 5; z++) heights[x].push(0);
  }
  for (let i = 0; i < N; i++) {
    let bx = 0;
    let bz = 0;
    let best = -Infinity;
    for (let x = 0; x < 5; x++)
      for (let z = 0; z < 5; z++) {
        const want = 1 + x * 0.9 + z * 0.5; // target height grows with x and z
        const score = want - heights[x][z];
        if (score > best) {
          best = score;
          bx = x;
          bz = z;
        }
      }
    bars.push(new Vector3((bx - 2) * 0.36, -1.3 + heights[bx][bz] * 0.33, (bz - 2) * 0.36));
    heights[bx][bz]++;
  }
  return { chaos, orders: [funnel, grid, bars] };
}

const PALETTE = ['blue', 'blueLight', 'blueDeep', 'green', 'greenLight', 'navy'] as const;

function Sculpture({ link }: { link: { p: number } }) {
  const { chaos, orders } = useMemo(shapes, []);
  const geometry = useMemo(() => new RoundedBoxGeometry(B, B, B, 3, 0.06), []);
  const material = useMemo(() => new MeshPhysicalMaterial({ roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, metalness: 0 }), []);
  const mesh = useMemo(() => {
    const m = new InstancedMesh(geometry, material, N);
    const rand = rng(5);
    const c = new Color();
    for (let i = 0; i < N; i++) {
      const name = rand() < 0.12 ? 'white' : PALETTE[Math.floor(rand() * PALETTE.length)];
      m.setColorAt(i, name === 'white' ? c.set('#F4F7FB') : c.copy(token(name)));
    }
    m.frustumCulled = false;
    return m;
  }, [geometry, material]);
  useEffect(() => () => (geometry.dispose(), material.dispose()), [geometry, material]);

  const group = useRef<Group>(null);
  const live = useMemo(() => chaos.map((v) => v.clone()), [chaos]);
  const spinR = useMemo(() => chaos.map((_, i) => new Euler(i * 1.3, i * 0.7, i * 2.1)), [chaos]);
  const kick = useMemo(() => new Float32Array(N), []);
  const pointer = useRef({ ndc: new Vector2(9, 9), on: false, drag: false, x: 0, v: 0, yaw: 0 });
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const el = gl.domElement;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const p = pointer.current;
      p.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      p.on = Math.abs(p.ndc.x) < 1.1 && Math.abs(p.ndc.y) < 1.1;
      if (p.drag) {
        p.v = (e.clientX - p.x) * 0.01;
        p.yaw += p.v;
        p.x = e.clientX;
      }
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      pointer.current.drag = true;
      pointer.current.x = e.clientX;
    };
    const up = () => (pointer.current.drag = false);
    window.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
    };
  }, [gl]);

  const m4 = useMemo(() => new Matrix4(), []);
  const q = useMemo(() => new Quaternion(), []);
  const one = useMemo(() => new Vector3(1, 1, 1), []);
  const target = useMemo(() => new Vector3(), []);
  const proj = useMemo(() => new Vector3(), []);
  const idle = useMemo(() => new Euler(), []);

  useFrame(({ clock, camera }, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const reduced = useApp.getState().reducedMotion;
    const t = reduced ? 0 : clock.elapsedTime;
    // which statement, and how assembled: each slide = scatter → assemble → hold
    const P = clamp(link.p, 0, 0.9999) * orders.length;
    const slide = Math.floor(P);
    const local = P - slide;
    const assembled = reduced ? 1 : smoothstep(local, 0.08, 0.55) * (1 - smoothstep(local, 0.92, 1));
    const shape = orders[slide];
    const p = pointer.current;
    if (!p.drag) {
      p.v *= Math.exp(-3 * dt);
      p.yaw += p.v;
    }
    if (group.current) group.current.rotation.set(0.35, t * 0.12 + p.yaw, 0);

    for (let i = 0; i < N; i++) {
      target.copy(chaos[i]).lerp(shape[i], assembled);
      // the cursor knocks blocks loose
      if (p.on && !reduced) {
        proj.copy(live[i]).applyEuler(group.current?.rotation ?? idle).project(camera);
        const d = Math.hypot(proj.x - p.ndc.x, proj.y - p.ndc.y);
        if (d < 0.16) kick[i] = Math.min(1, kick[i] + dt * 6);
      }
      kick[i] = Math.max(0, kick[i] - dt * 0.9);
      target.lerp(chaos[i], kick[i] * 0.6);
      // ease towards the target (a little lag per block = a satisfying settle)
      const rate = 4 + (i % 7) * 0.6;
      live[i].x = damp(live[i].x, target.x, rate, dt);
      live[i].y = damp(live[i].y, target.y, rate, dt);
      live[i].z = damp(live[i].z, target.z, rate, dt);
      const loose = 1 - assembled + kick[i];
      idle.set(spinR[i].x * loose + t * 0.4 * loose, spinR[i].y * loose + t * 0.3 * loose, spinR[i].z * loose);
      q.setFromEuler(idle);
      m4.compose(live[i], q, one);
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <primitive object={mesh} />
    </group>
  );
}

export default function Assemble({ link, active, className }: { link: { p: number }; active: boolean; className?: string }) {
  return (
    <StageCanvas active={active} className={className} fov={32} z={7.2}>
      <Sculpture link={link} />
    </StageCanvas>
  );
}
