import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CylinderGeometry, LatheGeometry, MeshStandardMaterial, Vector2, type BufferGeometry, type Group } from 'three';
import { FORT } from './layout';
import { bake, batter, box, merge, merlonsLine, merlonsSquare, triangle } from './najdi';
import { floorStone, mudStone, trimStone, wallStone } from './stone';
import { Palms } from './Palm';
import { world } from '../state';

/**
 * The Hail fortress — Najdi mud architecture after A'arif and Qishlah: a raised terrace reached by steps,
 * a walled enclosure with battered corner towers and a tall keep, all crowned with pierced triangular
 * merlons; triangular vents, a wooden gate in a white gypsum frame, wooden water spouts; a white
 * octagonal minaret and date palms beside it. It floats on its own island beside the hero, on the END
 * side of the layout (mirrored in RTL), turned towards the camera.
 *
 * Merged by material: mud (1 draw), dark vents (1), wood (1), white trim + minaret (1).
 */

// local plan (m): terrace 15 × 11, walls 12 × 8 on it, front = +z
const T = { w: 15, d: 11, h: 1.1 };
const W = { w: 12, d: 8, h: 3.6, t: 0.8 };
const TOWER = { s: 2.8, h: 5.2, top: 0.86 };
const KEEP = { s: 4.2, h: 8.8, top: 0.85, x: 6.2, z: 3.8 };
/** Yaw that turns the front towards the hero camera (0 when it stands on the axis). */
const FACE = Math.atan2(0 - FORT.x, 13.5 - FORT.z);
/** The hill under it: a rocky island, top at y = 0. */
const HILL = 5;

const wood = new MeshStandardMaterial({ color: '#5B3F2A', roughness: 0.85, metalness: 0 });
const dark = new MeshStandardMaterial({ color: '#2E2119', roughness: 1, metalness: 0 });

function build() {
  const mud: BufferGeometry[] = [];
  const vents: BufferGeometry[] = [];
  const timber: BufferGeometry[] = [];
  const white: BufferGeometry[] = [];
  const y0 = T.h;

  // terrace + steps up to the gate
  mud.push(bake(batter(T.w, T.d, T.h, 0.97), [0, 0, 0]));
  for (let k = 0; k < 5; k++) {
    const h = T.h - k * 0.22;
    mud.push(bake(box(3.6, h, 0.42), [0, h / 2, T.d / 2 + 0.21 + k * 0.42]));
  }

  // walls (battered), crowned
  const wallTop = y0 + W.h;
  const crown = { size: 0.5, thick: W.t * 0.75 };
  mud.push(bake(batter(W.w, W.t, W.h, 0.95), [0, y0, W.d / 2]));
  mud.push(bake(batter(W.w, W.t, W.h, 0.95), [0, y0, -W.d / 2]));
  mud.push(bake(batter(W.t, W.d, W.h, 0.95), [-W.w / 2, y0, 0]));
  mud.push(bake(batter(W.t, W.d, W.h, 0.95), [W.w / 2, y0, 0]));
  const inset = TOWER.s / 2 + 0.2;
  merlonsLine(mud, [-W.w / 2 + inset, W.d / 2], [KEEP.x - KEEP.s / 2 - 0.2, W.d / 2], wallTop, crown);
  merlonsLine(mud, [-W.w / 2 + inset, -W.d / 2], [W.w / 2 - inset, -W.d / 2], wallTop, crown);
  merlonsLine(mud, [-W.w / 2, -W.d / 2 + inset], [-W.w / 2, W.d / 2 - inset], wallTop, crown);
  merlonsLine(mud, [W.w / 2, -W.d / 2 + inset], [W.w / 2, KEEP.z - KEEP.s / 2 - 0.2], wallTop, crown);

  // three corner towers + the keep (front corner on the end side)
  const corners: [number, number][] = [
    [-W.w / 2, W.d / 2],
    [-W.w / 2, -W.d / 2],
    [W.w / 2, -W.d / 2],
  ];
  for (const [x, z] of corners) {
    mud.push(bake(batter(TOWER.s, TOWER.s, TOWER.h, TOWER.top), [x, y0, z]));
    merlonsSquare(mud, x, z, TOWER.s * TOWER.top, y0 + TOWER.h, { size: 0.42, thick: 0.34 });
  }
  mud.push(bake(batter(KEEP.s, KEEP.s, KEEP.h, KEEP.top), [KEEP.x, y0, KEEP.z]));
  // a slight set-back course two thirds up, like the reference's upper storey
  mud.push(bake(batter(KEEP.s * 0.93, KEEP.s * 0.93, 0.28, 1), [KEEP.x, y0 + KEEP.h * 0.64, KEEP.z]));
  merlonsSquare(mud, KEEP.x, KEEP.z, KEEP.s * KEEP.top, y0 + KEEP.h, { size: 0.56, thick: 0.4 });

  // triangular vents: on each face of the keep (two rows) and the corner towers (one row)
  const faceAt = (cx: number, cz: number, half: (y: number) => number, y: number, offsets: number[], size: number) => {
    for (let f = 0; f < 4; f++) {
      const yaw = (f * Math.PI) / 2;
      const r = half(y) + 0.012;
      for (const o of offsets) {
        const lx = o;
        const lz = r;
        // rotate (lx, lz) by yaw about the tower centre
        const x = cx + lx * Math.cos(yaw) + lz * Math.sin(yaw);
        const z = cz - lx * Math.sin(yaw) + lz * Math.cos(yaw);
        vents.push(bake(triangle(), [x, y, z], yaw, [size, size * 1.15, 1]));
      }
    }
  };
  const keepHalf = (y: number) => (KEEP.s / 2) * (1 - (1 - KEEP.top) * ((y - y0) / KEEP.h));
  faceAt(KEEP.x, KEEP.z, keepHalf, y0 + KEEP.h * 0.74, [-0.9, 0, 0.9], 0.42);
  faceAt(KEEP.x, KEEP.z, keepHalf, y0 + KEEP.h * 0.45, [-0.6, 0.6], 0.36);
  const towerHalf = (y: number) => (TOWER.s / 2) * (1 - (1 - TOWER.top) * ((y - y0) / TOWER.h));
  for (const [x, z] of corners) faceAt(x, z, towerHalf, y0 + TOWER.h * 0.7, [-0.45, 0.45], 0.32);
  // a band of small vents along the front wall, either side of the gate
  for (const x of [-4.2, -3.2, -2.2, 2.2, 3.2]) vents.push(bake(triangle(), [x, y0 + W.h * 0.72, W.d / 2 + W.t / 2 - 0.02], 0, [0.34, 0.4, 1]));

  // the gate: a wooden door in a white gypsum frame, a row of white triangles over it
  white.push(bake(box(2.5, 3.1, 0.1), [0, y0 + 1.55, W.d / 2 + W.t / 2 - 0.01]));
  timber.push(bake(box(1.9, 2.7, 0.14), [0, y0 + 1.35, W.d / 2 + W.t / 2 + 0.03]));
  for (const x of [-0.8, -0.4, 0, 0.4, 0.8]) white.push(bake(triangle(), [x, y0 + 3.2, W.d / 2 + W.t / 2], 0, [0.3, 0.32, 1]));
  // wooden water spouts (mizrab) under the crown
  for (const x of [-4.5, -1.5, 1.5]) timber.push(bake(box(0.12, 0.12, 0.8), [x, wallTop - 0.25, W.d / 2 + 0.55]));
  for (const z of [-2, 1.5]) {
    timber.push(bake(box(0.8, 0.12, 0.12), [-W.w / 2 - 0.55, wallTop - 0.25, z]));
    timber.push(bake(box(0.8, 0.12, 0.12), [W.w / 2 + 0.55, wallTop - 0.25, z]));
  }

  // the white minaret beside the fort (octagonal: an 8-sided lathe, flat-shaded)
  const profile = [
    [1.0, 0], [1.0, 3.0], [0.82, 3.2], [0.76, 9.0], [1.12, 9.05], [1.12, 9.35], [0.62, 9.45], [0.57, 12.4],
    [0.86, 12.45], [0.86, 12.7], [0.47, 12.8], [0.47, 13.8], [0.56, 13.85], [0.03, 15.7], [0.0, 15.7],
  ].map(([r, y]) => new Vector2(r, y));
  const minaret = new LatheGeometry(profile, 8, Math.PI / 8).toNonIndexed();
  minaret.computeVertexNormals();
  white.push(bake(minaret, [9.4, 0, -4.4]));
  minaret.dispose();

  return { mud: merge(mud), vents: merge(vents), timber: merge(timber), white: merge(white) };
}

export function Fortress() {
  const geo = useMemo(build, []);
  const island = useMemo(() => new CylinderGeometry(FORT.island, FORT.island * 0.78, HILL, 96, 1), []);
  useEffect(() => () => (Object.values(geo).forEach((g) => g.dispose()), island.dispose()), [geo, island]);
  const group = useRef<Group>(null);
  // mirrored with the layout side (RTL): the keep and the minaret stay on the end side, away from the copy
  // (three.js flips the front face of mirrored meshes itself)
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.position.x = FORT.x * world.side;
    g.rotation.y = FACE * world.side;
    g.scale.x = world.side < 0 ? -1 : 1;
  });
  const side = wallStone();
  return (
    <group ref={group} position={[FORT.x, FORT.y, FORT.z]} rotation-y={FACE}>
      <mesh geometry={island} material={[side, floorStone(), side]} position-y={-HILL / 2} receiveShadow />
      <mesh geometry={geo.mud} material={mudStone()} castShadow receiveShadow />
      <mesh geometry={geo.vents} material={dark} />
      <mesh geometry={geo.timber} material={wood} castShadow />
      <mesh geometry={geo.white} material={trimStone()} castShadow receiveShadow />
      <Palms list={FORT.palms} castShadow={false} />
    </group>
  );
}
