import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Euler, IcosahedronGeometry, Matrix4, MeshStandardMaterial, Quaternion, RingGeometry, Vector3, type BufferGeometry, type InstancedMesh } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { bake, merge } from './najdi';

/**
 * A Hail park garden (the client's reference: lawns, clipped hedges, flowering shrubs, paved paths):
 * a ring of lawn round a pool, broken by paved paths, edged with a clipped hedge and dotted with flower
 * beds. Static parts are merged; mounds and flowers are instanced (one draw call each).
 *
 * Ring angles use RingGeometry's θ laid flat: a point at θ is (r·cos θ, 0, −r·sin θ) — so −z (the walkway
 * side) is θ = π/2 and +z (towards the camera) is θ = 3π/2.
 */

/** Leafy / grassy surface: the colour, mottled by world-space noise (no texture). Instancing-aware. */
const natureCache = new Map<string, MeshStandardMaterial>();
function nature(color: string, roughness = 0.95, freq = 1.4, amp = 0.32) {
  const key = `${color}-${roughness}-${freq}-${amp}`;
  let m = natureCache.get(key);
  if (m) return m;
  m = new MeshStandardMaterial({ color, roughness, metalness: 0, envMapIntensity: 0.5 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uFreq = { value: freq };
    shader.uniforms.uAmp = { value: amp };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vNatPos;').replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vNatPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
      #else
        vNatPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #endif`,
    );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vNatPos;
        uniform float uFreq; uniform float uAmp;
        float natHash(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
        float natNoise(vec3 p) {
          vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(natHash(i), natHash(i + vec3(1, 0, 0)), f.x), mix(natHash(i + vec3(0, 1, 0)), natHash(i + vec3(1, 1, 0)), f.x), f.y),
                     mix(mix(natHash(i + vec3(0, 0, 1)), natHash(i + vec3(1, 0, 1)), f.x), mix(natHash(i + vec3(0, 1, 1)), natHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float nat = natNoise(vNatPos * uFreq) * 0.6 + natNoise(vNatPos * uFreq * 7.3) * 0.4;
        diffuseColor.rgb *= 1.0 - uAmp * 0.5 + nat * uAmp;`,
      );
  };
  m.customProgramCacheKey = () => 'nature-noise';
  natureCache.set(key, m);
  return m;
}

const lawn = () => nature('#76A04B', 0.96, 1.1, 0.34);
const hedge = () => nature('#3D6A30', 0.92, 2.6, 0.42);
const mound = () => nature('#33592A', 0.9, 3.2, 0.4);
const bloom = new MeshStandardMaterial({ roughness: 0.6, metalness: 0, envMapIntensity: 0.7 });

/** Blossom colours of the reference's flower beds — pinks, magentas, crimson, white, violet (no orange). */
const BLOSSOMS = ['#E0457B', '#C2185B', '#F48FB1', '#FFFFFF', '#9C4DCC', '#D81B60', '#F8BBD0'].map((c) => new Color(c));

export interface Gap {
  at: number;
  half: number;
}

/** The lawn arcs between the gaps (sorted, wrapping). */
function arcsBetween(gaps: Gap[]): [number, number][] {
  const g = [...gaps].sort((a, b) => a.at - b.at);
  return g.map((gi, i) => {
    const next = g[(i + 1) % g.length];
    const start = gi.at + gi.half;
    let end = next.at - next.half;
    if (end <= start) end += Math.PI * 2;
    return [start, end] as [number, number];
  });
}

export function GardenRing({
  center,
  inner,
  outer,
  gaps,
  avoid = [],
  beds = 1.9,
}: {
  center: [number, number];
  inner: number;
  outer: number;
  gaps: Gap[];
  /** points (world x, z) the flower beds keep clear of: trees, shrubs */
  avoid?: [number, number][];
  /** spacing of the flower beds along the ring (m) */
  beds?: number;
}) {
  const [cx, cz] = center;
  const arcs = useMemo(() => arcsBetween(gaps), [gaps]);

  // lawn + hedge: merged, static
  const { lawnGeo, hedgeGeo, mounds } = useMemo(() => {
    const lawnParts: BufferGeometry[] = [];
    const hedgeParts: BufferGeometry[] = [];
    // segments a little longer than their spacing: the hedge reads as one clipped band
    const seg = new RoundedBoxGeometry(1.0, 0.44, 0.42, 2, 0.15);
    const rH = outer - 0.3;
    const mounds: { x: number; z: number; s: number }[] = [];
    for (const [a0, a1] of arcs) {
      const ring = new RingGeometry(inner, outer, Math.max(8, Math.round((a1 - a0) * 24)), 1, a0, a1 - a0);
      ring.rotateX(-Math.PI / 2);
      lawnParts.push(bake(ring, [cx, 0.015, cz]));
      ring.dispose();
      // the clipped hedge along the outer edge
      const n = Math.max(1, Math.floor(((a1 - a0) * rH) / 0.92));
      for (let i = 0; i < n; i++) {
        const a = a0 + ((i + 0.5) / n) * (a1 - a0);
        // segment tangent: along the ring, i.e. yaw so local x follows (−sin a, 0, −cos a)
        hedgeParts.push(bake(seg, [cx + Math.cos(a) * rH, 0.22, cz - Math.sin(a) * rH], a + Math.PI / 2));
      }
      // flower beds in the middle of the lawn, clear of trees and shrubs
      const rB = (inner + outer) / 2 - 0.15;
      const m = Math.max(0, Math.floor(((a1 - a0) * rB) / beds));
      for (let i = 0; i < m; i++) {
        const a = a0 + ((i + 0.5) / m) * (a1 - a0);
        const x = cx + Math.cos(a) * rB;
        const z = cz - Math.sin(a) * rB;
        if (avoid.some(([ax, az]) => Math.hypot(ax - x, az - z) < 1.25)) continue;
        mounds.push({ x, z, s: 0.85 + ((i * 7) % 5) * 0.06 });
      }
    }
    seg.dispose();
    return { lawnGeo: merge(lawnParts), hedgeGeo: hedgeParts.length ? merge(hedgeParts) : null, mounds };
  }, [arcs, cx, cz, inner, outer, avoid, beds]);
  useEffect(() => () => (lawnGeo.dispose(), hedgeGeo?.dispose()), [lawnGeo, hedgeGeo]);

  // flower beds: green mounds, each sprinkled with blossoms
  const PER = 18;
  const moundGeo = useMemo(() => new IcosahedronGeometry(1, 2), []);
  const flowerGeo = useMemo(() => new IcosahedronGeometry(0.06, 1), []);
  useEffect(() => () => (moundGeo.dispose(), flowerGeo.dispose()), [moundGeo, flowerGeo]);
  const moundMesh = useRef<InstancedMesh>(null);
  const flowerMesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mm = moundMesh.current;
    const fm = flowerMesh.current;
    if (!mm || !fm) return;
    const m = new Matrix4();
    const q = new Quaternion();
    const e = new Euler();
    const s = new Vector3();
    const p = new Vector3();
    let f = 0;
    mounds.forEach((b, i) => {
      const sx = 0.62 * b.s;
      const sy = 0.36 * b.s;
      const sz = 0.5 * b.s;
      q.setFromEuler(e.set(0, i * 1.3, 0));
      mm.setMatrixAt(i, m.compose(p.set(b.x, sy * 0.55, b.z), q, s.set(sx, sy, sz)));
      for (let k = 0; k < PER; k++) {
        // golden-angle spread over the top of the mound
        const t = (k + 0.5) / PER;
        const ang = k * 2.39996 + i;
        const rr = Math.sqrt(t) * 0.92;
        const lx = Math.cos(ang) * rr * sx;
        const lz = Math.sin(ang) * rr * sz;
        const ly = sy * 0.55 + sy * Math.sqrt(Math.max(0, 1 - rr * rr)) * 0.98;
        fm.setMatrixAt(f, m.compose(p.set(b.x + lx, ly, b.z + lz), q, s.setScalar(0.8 + ((k * 5) % 4) * 0.12)));
        fm.setColorAt(f, BLOSSOMS[(i * 3 + k) % BLOSSOMS.length]);
        f++;
      }
    });
    mm.count = mounds.length;
    fm.count = f;
    mm.instanceMatrix.needsUpdate = true;
    fm.instanceMatrix.needsUpdate = true;
    if (fm.instanceColor) fm.instanceColor.needsUpdate = true;
    mm.computeBoundingSphere();
    fm.computeBoundingSphere();
  }, [mounds]);

  return (
    <group>
      <mesh geometry={lawnGeo} material={lawn()} receiveShadow />
      {hedgeGeo && <mesh geometry={hedgeGeo} material={hedge()} receiveShadow />}
      <instancedMesh ref={moundMesh} args={[moundGeo, mound(), Math.max(1, mounds.length)]} receiveShadow />
      <instancedMesh ref={flowerMesh} args={[flowerGeo, bloom, Math.max(1, mounds.length * PER)]} />
    </group>
  );
}
