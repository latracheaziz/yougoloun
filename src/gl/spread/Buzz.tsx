import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Euler,
  InstancedMesh,
  MathUtils,
  Matrix4,
  MeshPhysicalMaterial,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  type PerspectiveCamera,
} from 'three';
import { geo } from '../props/geometry';
import { glossy } from '../props/materials';
import { token } from '../palette';
import { useApp } from '@/store/app';
import { shared, wave } from './state';
import type { Crowd } from './crowd';

/**
 * The life above and under the word-of-mouth network:
 *  - Glow: a soft brand-coloured heat wash under the people already talking
 *  - Influencers: ~30 people as glossy 3D pins on stems, popping up when the word reaches them
 *  - RisingBuzz: glossy hearts and comment bubbles floating up from the crowd (more while you scroll;
 *    a broadcast releases a burst)
 */

const { clamp, lerp } = MathUtils;
const easeBack = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 + 2.6 * Math.pow(x - 1, 3) + 1.6 * Math.pow(x - 1, 2));

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── heat glow ─────────────────────────────────────────────────────────────────────────
const glowVert = /* glsl */ `
attribute float aT;
uniform float uFront; uniform float uPx; uniform float uTime;
varying float vA; varying float vT;
void main() {
  float act = smoothstep(aT, aT + 0.05, uFront);
  vT = aT;
  vA = act * (0.75 + 0.25 * sin(uTime * 0.8 + aT * 30.0));
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = 0.62 * uPx / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const glowFrag = /* glsl */ `
uniform vec3 uBlue; uniform vec3 uGreen;
varying float vA; varying float vT;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = exp(-r * r * 4.0) * vA * 0.13;
  if (a < 0.002) discard;
  gl_FragColor = vec4(mix(uBlue, uGreen, smoothstep(0.0, 0.9, vT)), a);
  #include <colorspace_fragment>
}`;

export function Glow({ crowd }: { crowd: Crowd }) {
  const { geometry, material } = useMemo(() => {
    // every 6th person is enough for a smooth wash (it's the costly layer: overlapping soft splats)
    const n = Math.floor(crowd.count / 6);
    const pos = new Float32Array(n * 3);
    const at = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const i = k * 6;
      pos.set([crowd.positions[i * 3], -0.01, crowd.positions[i * 3 + 2]], k * 3);
      at[k] = crowd.arrival[i];
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aT', new BufferAttribute(at, 1));
    const m = new ShaderMaterial({
      vertexShader: glowVert,
      fragmentShader: glowFrag,
      transparent: true,
      depthWrite: false,
      uniforms: { uFront: { value: 0 }, uPx: { value: 800 }, uTime: { value: 0 }, uBlue: { value: token('blue') }, uGreen: { value: token('green') } },
    });
    return { geometry: g, material: m };
  }, [crowd]);
  useEffect(() => () => (geometry.dispose(), material.dispose()), [geometry, material]);
  useFrame(({ clock, size, camera, gl }) => {
    const u = material.uniforms;
    u.uFront.value = shared.front;
    u.uTime.value = useApp.getState().reducedMotion ? 0 : clock.elapsedTime;
    u.uPx.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan(MathUtils.degToRad((camera as PerspectiveCamera).fov) / 2));
  });
  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={-1} />;
}

// ── influencers ───────────────────────────────────────────────────────────────────────
const INFLUENCERS = 30;

export function Influencers({ crowd }: { crowd: Crowd }) {
  const picks = useMemo(() => {
    const rand = rng(404);
    const out: { i: number; h: number }[] = [];
    let guard = 0;
    while (out.length < INFLUENCERS && guard++ < 5000) {
      const i = Math.floor(rand() * crowd.count);
      if (crowd.arrival[i] >= 0.98) continue;
      const x = crowd.positions[i * 3];
      const z = crowd.positions[i * 3 + 2];
      // spread out: keep them apart from each other
      if (out.some((o) => Math.hypot(crowd.positions[o.i * 3] - x, crowd.positions[o.i * 3 + 2] - z) < 1.1)) continue;
      out.push({ i, h: 0.32 + rand() * 0.28 });
    }
    return out;
  }, [crowd]);
  const heads = useMemo(() => {
    const m = new InstancedMesh(new SphereGeometry(1, 28, 20), new MeshPhysicalMaterial({ roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.04 }), picks.length);
    const c = new Color();
    const names = ['blue', 'green', 'blueLight', 'greenLight'] as const;
    picks.forEach((_, k) => m.setColorAt(k, c.copy(token(names[k % names.length]))));
    m.frustumCulled = false;
    return m;
  }, [picks]);
  const stems = useMemo(() => {
    const m = new InstancedMesh(new CylinderGeometry(1, 1, 1, 8), new MeshPhysicalMaterial({ color: '#F4F7FB', roughness: 0.3, clearcoat: 1 }), picks.length);
    m.frustumCulled = false;
    return m;
  }, [picks]);
  useEffect(
    () => () => {
      heads.geometry.dispose();
      (heads.material as MeshPhysicalMaterial).dispose();
      stems.geometry.dispose();
      (stems.material as MeshPhysicalMaterial).dispose();
    },
    [heads, stems],
  );
  const reachedAt = useMemo(() => new Float32Array(picks.length).fill(-1), [picks]);
  const m4 = useMemo(() => new Matrix4(), []);
  const q = useMemo(() => new Quaternion(), []);
  const p = useMemo(() => new Vector3(), []);
  const s = useMemo(() => new Vector3(), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const reduced = useApp.getState().reducedMotion;
    picks.forEach((o, k) => {
      const reached = shared.front > crowd.arrival[o.i];
      if (reached && reachedAt[k] < 0) reachedAt[k] = t;
      if (!reached) reachedAt[k] = -1;
      const pop = reachedAt[k] < 0 ? 0 : reduced ? 1 : easeBack(clamp((t - reachedAt[k]) / 0.7, 0, 1));
      const x = crowd.positions[o.i * 3];
      const z = crowd.positions[o.i * 3 + 2];
      const sinceWave = t - wave.at;
      const ring = sinceWave < 3 ? Math.exp(-Math.pow((Math.hypot(x - wave.origin.x, z - wave.origin.y) - sinceWave * 7) / 0.6, 2)) : 0;
      const h = o.h * pop * (1 + ring * 0.6) + (reduced ? 0 : Math.sin(t * 1.4 + k) * 0.02 * pop);
      // stem
      p.set(x, h / 2, z);
      s.set(0.008, Math.max(h, 1e-4), 0.008);
      m4.compose(p, q.identity(), s);
      stems.setMatrixAt(k, m4);
      // head
      const r = 0.085 * pop * (1 + ring * 0.5);
      p.set(x, h + r * 0.6, z);
      s.setScalar(Math.max(r, 1e-4));
      m4.compose(p, q, s);
      heads.setMatrixAt(k, m4);
    });
    heads.instanceMatrix.needsUpdate = true;
    stems.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <primitive object={stems} />
      <primitive object={heads} />
    </>
  );
}

// ── the buzz rising ───────────────────────────────────────────────────────────────────
const PER_KIND = 16;

interface Rising {
  alive: boolean;
  born: number;
  life: number;
  x: number;
  z: number;
  y: number;
  vy: number;
  dx: number;
  dz: number;
  spin: number;
  size: number;
}

export function RisingBuzz({ crowd }: { crowd: Crowd }) {
  const kinds = useMemo(
    () => [
      { g: geo.heartGradient(), m: glossy('blue', false, 0, { gradient: true }) },
      { g: geo.comment(), m: glossy('white') },
      { g: geo.heart(), m: glossy('green') },
    ],
    [],
  );
  const meshes = useMemo(
    () =>
      kinds.map((k) => {
        const m = new InstancedMesh(k.g, k.m, PER_KIND);
        m.count = 0;
        m.frustumCulled = false;
        return m;
      }),
    [kinds],
  );
  const pool = useMemo<Rising[][]>(
    () => kinds.map(() => Array.from({ length: PER_KIND }, () => ({ alive: false, born: 0, life: 4, x: 0, z: 0, y: 0, vy: 0, dx: 0, dz: 0, spin: 0, size: 0.3 }))),
    [kinds],
  );
  const st = useRef({ acc: 0, lastWave: -99 });
  const m4 = useMemo(() => new Matrix4(), []);
  const q = useMemo(() => new Quaternion(), []);
  const e = useMemo(() => new Euler(), []);
  const p = useMemo(() => new Vector3(), []);
  const s = useMemo(() => new Vector3(), []);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const t = clock.elapsedTime;
    if (useApp.getState().reducedMotion) {
      meshes.forEach((m) => (m.count = 0));
      return;
    }
    const front = shared.front;
    const spawn = (near?: { x: number; z: number }) => {
      for (let tries = 0; tries < 16; tries++) {
        let i: number;
        if (near) {
          // around the broadcast wave
          i = Math.floor(Math.random() * crowd.count);
          if (Math.hypot(crowd.positions[i * 3] - near.x, crowd.positions[i * 3 + 2] - near.z) > 3.5) continue;
        } else {
          i = Math.floor(Math.random() * crowd.count);
          const at = crowd.arrival[i];
          if (at > front) continue;
          if (shared.scrolling && at < front - 0.1) continue; // while scrolling: from those just reached
        }
        const kind = Math.floor(Math.random() * pool.length);
        const slot = pool[kind].find((r) => !r.alive);
        if (!slot) return;
        Object.assign(slot, {
          alive: true,
          born: t,
          life: 3.6 + Math.random() * 1.8,
          x: crowd.positions[i * 3],
          z: crowd.positions[i * 3 + 2],
          y: 0.05,
          vy: 0.16 + Math.random() * 0.2,
          dx: (Math.random() - 0.5) * 0.12,
          dz: (Math.random() - 0.5) * 0.12,
          spin: (Math.random() - 0.5) * 2,
          size: 0.75 + Math.random() * 0.5,
        });
        return;
      }
    };
    if (front > 0.02) {
      st.current.acc += dt * (shared.scrolling ? 9 : 2.2);
      while (st.current.acc > 1) {
        st.current.acc -= 1;
        spawn();
      }
    }
    if (wave.at !== st.current.lastWave) {
      st.current.lastWave = wave.at;
      for (let k = 0; k < 24; k++) spawn({ x: wave.origin.x, z: wave.origin.y });
    }
    // world size: small enough over Hail, readable over the whole region
    const base = lerp(0.14, 0.55, shared.zoom);
    pool.forEach((list, kind) => {
      const mesh = meshes[kind];
      let n = 0;
      for (const r of list) {
        if (!r.alive) continue;
        const age = t - r.born;
        if (age > r.life) {
          r.alive = false;
          continue;
        }
        r.y += r.vy * dt * (0.5 + shared.zoom);
        r.x += r.dx * dt;
        r.z += r.dz * dt;
        const inA = clamp(age / 0.35, 0, 1);
        const out = clamp((r.life - age) / 0.9, 0, 1);
        const k = easeBack(inA) * out;
        p.set(r.x, r.y, r.z);
        e.set(0, r.spin * age + Math.sin(age * 2) * 0.3, Math.sin(age * 1.7 + r.spin) * 0.25);
        q.setFromEuler(e);
        s.setScalar(Math.max(base * r.size * k, 1e-4));
        m4.compose(p, q, s);
        mesh.setMatrixAt(n++, m4);
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    });
  });
  return (
    <>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}
