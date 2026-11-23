import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Euler,
  LatheGeometry,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector2,
  Vector3,
  type Group,
  type InstancedMesh,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useApp } from '@/store/app';
import { world } from '../state';

/**
 * Date palms — Hail's gardens. Procedural: a ringed trunk (leaf-base scars) leaning a little, and a crown
 * of ~22 fronds — a drooping rachis with leaflets in a V, darker at the base, lighter at the tips — plus a
 * few young upright fronds. ALL fronds of ALL palms are one InstancedMesh; trunks are one merged mesh.
 * The crowns sway gently in the wind.
 */

export type PalmSpec = [number, number, number, number, number]; // x, z, height, lean, yaw

const FRONDS = 22;
const YOUNG = 5;

let frond: BufferGeometry | null = null;
/** One frond along +x: rachis rising then drooping, ~2.7 m, leaflets both sides. */
function frondGeometry() {
  if (frond) return frond;
  const L = 2.7;
  const rach = (t: number) => new Vector3(L * t, 0.62 * t - 1.35 * t * t, 0);
  const pos: number[] = [];
  const col: number[] = [];
  const dark = new Color('#2F5226');
  const mid = new Color('#4E7A34');
  const light = new Color('#7DA24A');
  const c = new Color();
  const push = (v: Vector3, k: number) => {
    pos.push(v.x, v.y, v.z);
    c.copy(dark).lerp(k < 0.5 ? mid : light, k < 0.5 ? k * 2 : (k - 0.5) * 2);
    col.push(c.r, c.g, c.b);
  };
  const N = 30;
  const up = new Vector3(0, 1, 0);
  for (let i = 0; i < N; i++) {
    const t = 0.07 + (i / N) * 0.9;
    const P = rach(t);
    const T = rach(t + 0.01).sub(P).normalize();
    const S = new Vector3().crossVectors(T, up).normalize();
    const l = 0.7 * Math.sin(Math.PI * Math.min(1, t * 1.08)) + 0.14;
    for (const side of [-1, 1]) {
      // leaflets fan out sideways, forward along the rachis and up (the V), the tips sag
      const dir = new Vector3().addScaledVector(S, side * 0.86).addScaledVector(T, 0.42).addScaledVector(up, 0.3).normalize();
      const tip = P.clone().addScaledVector(dir, l).add(new Vector3(0, -0.1 * l, 0));
      const w = 0.045;
      push(P.clone().addScaledVector(T, -w), 0.05);
      push(P.clone().addScaledVector(T, w), 0.05);
      push(tip, 0.55 + t * 0.45);
    }
    // the rachis itself: a thin strip
    if (i < N - 1) {
      const Q = rach(0.07 + ((i + 1) / N) * 0.9);
      const o = new Vector3(0, 0.025 * (1 - t), 0);
      push(P.clone().add(o), 0.15);
      push(Q.clone().add(o), 0.15);
      push(P.clone().sub(o), 0.1);
      push(Q.clone().add(o), 0.15);
      push(Q.clone().sub(o), 0.1);
      push(P.clone().sub(o), 0.1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  g.computeVertexNormals();
  frond = g;
  return g;
}

/** A trunk h tall: tapering, with the ring scars of old leaf bases. Base at y = 0. */
function trunkGeometry(h: number) {
  const pts: Vector2[] = [];
  const step = 0.12;
  for (let y = 0; y <= h; y += step / 2) {
    const k = y / h;
    const r = 0.3 - 0.11 * k + (y < 0.4 ? (0.4 - y) * 0.25 : 0); // flared foot
    const ring = Math.round(y / (step / 2)) % 2 === 0 ? 0.028 : 0;
    pts.push(new Vector2(r + ring, y));
  }
  pts.push(new Vector2(0.001, h));
  return new LatheGeometry(pts, 12);
}

const trunkMaterial = new MeshStandardMaterial({ color: '#8A765C', roughness: 1, metalness: 0 });
const frondMaterial = new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.78, metalness: 0, envMapIntensity: 0.6 });

/** Where each frond goes: crown top, yaw, pitch, scale. */
function crown(spec: PalmSpec) {
  const [x, z, h, lean, yaw] = spec;
  const tilt = new Quaternion().setFromEuler(new Euler(0, yaw, lean));
  const top = new Vector3(0, h, 0).applyQuaternion(tilt).add(new Vector3(x, 0, z));
  const out: { top: Vector3; yaw: number; pitch: number; scale: number }[] = [];
  for (let k = 0; k < FRONDS; k++) {
    const lower = k % 2;
    out.push({ top, yaw: yaw + (k / FRONDS) * Math.PI * 2 + (k % 3) * 0.05, pitch: lower ? -0.28 - (k % 4) * 0.06 : 0.12 + (k % 3) * 0.08, scale: lower ? 1 : 0.9 });
  }
  for (let k = 0; k < YOUNG; k++) out.push({ top, yaw: yaw + (k / YOUNG) * Math.PI * 2 + 0.3, pitch: 0.95, scale: 0.62 });
  return { top, tilt, fronds: out };
}

/**
 * `mirror`: the group flips to the other side with the layout side (RTL), so palms placed on the END side
 * stay there (three.js renders mirrored meshes correctly: it flips the front face when det < 0).
 */
export function Palms({ list, castShadow = true, mirror = false }: { list: PalmSpec[]; castShadow?: boolean; mirror?: boolean }) {
  const root = useRef<Group>(null);
  useFrame(() => {
    if (mirror && root.current) root.current.scale.x = world.side < 0 ? -1 : 1;
  });
  const geometry = frondGeometry();
  const crowns = useMemo(() => list.map(crown), [list]);
  const count = crowns.reduce((n, c) => n + c.fronds.length, 0);
  const trunks = useMemo(() => {
    const parts = list.map((spec, i) => {
      const [x, z, h] = spec;
      const g = trunkGeometry(h);
      g.applyMatrix4(new Matrix4().compose(new Vector3(x, 0, z), crowns[i].tilt, new Vector3(1, 1, 1)));
      return g;
    });
    const m = mergeGeometries(parts, false)!;
    parts.forEach((p) => p.dispose());
    return m;
  }, [list, crowns]);
  useEffect(() => () => trunks.dispose(), [trunks]);

  const mesh = useRef<InstancedMesh>(null);
  const tmp = useMemo(() => ({ m: new Matrix4(), q: new Quaternion(), e: new Euler(), s: new Vector3(), tint: new Color() }), []);
  const place = (sway: number, time: number) => {
    const im = mesh.current;
    if (!im) return;
    let i = 0;
    crowns.forEach((c, ci) => {
      c.fronds.forEach((f, fi) => {
        const w = sway * Math.sin(time * 1.3 + ci * 1.7 + fi * 0.6) * 0.05;
        tmp.q.setFromEuler(tmp.e.set(0, f.yaw, f.pitch + w, 'YZX'));
        tmp.s.setScalar(f.scale);
        tmp.m.compose(c.top, tmp.q, tmp.s);
        im.setMatrixAt(i++, tmp.m);
      });
    });
    im.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => {
    const im = mesh.current;
    if (!im) return;
    let i = 0;
    // a little variation frond to frond (multiplies the vertex colours: stay near white)
    crowns.forEach((c, ci) =>
      c.fronds.forEach((_, fi) => {
        const a = ((ci * 7 + fi * 3) % 5) / 5;
        const b = ((fi * 13) % 7) / 7;
        im.setColorAt(i++, tmp.tint.setRGB(0.88 + a * 0.16, 0.92 + b * 0.1, 0.84 + a * 0.12));
      }),
    );
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    place(0, 0);
    im.computeBoundingSphere();
  }, [crowns]);
  // the wind, ~15 Hz is plenty for a gentle sway (and keeps the matrix uploads cheap)
  const acc = useRef(0);
  useFrame(({ clock }, delta) => {
    if (useApp.getState().reducedMotion) return;
    acc.current += delta;
    if (acc.current < 1 / 15) return;
    acc.current = 0;
    place(1, clock.elapsedTime);
  });

  return (
    <group ref={root}>
      <mesh geometry={trunks} material={trunkMaterial} castShadow={castShadow} receiveShadow />
      <instancedMesh ref={mesh} args={[geometry, frondMaterial, count]} castShadow={castShadow} receiveShadow />
    </group>
  );
}
