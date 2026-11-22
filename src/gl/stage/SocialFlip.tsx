import { useCallback, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Color, ExtrudeGeometry, MathUtils, NeutralToneMapping, Shape, type Group, type Mesh, type MeshStandardMaterial } from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { Studio } from './Studio';
import { Precompile, prodGl } from '../Precompile';
import { glossy } from '../props/materials';
import { socials } from '@/config/social';
import { platformColors } from '@/config/palette';
import { useApp } from '@/store/app';

/**
 * "Follow us": ONE glossy 3D app icon that turns with the scroll. A pearl-white tile with a platform
 * logo extruded on each face; every half-turn shows the next platform — the face turning away is
 * re-skinned (logo + colour) while it's hidden, so the icon flips TikTok → Snapchat → … → Instagram.
 * Also: leans toward the pointer, hops on each flip, lifts on hover, squashes on press, drag spins
 * it (it settles back on a whole turn). All input comes from the mutable `rig` (Socials.tsx).
 */

export type FlipRig = {
  /** platform position in steps, already eased (2.5 = halfway from platform 2 to 3) */
  turn: number;
  /** +1 LTR / −1 RTL: the next platform comes from the reading side */
  dir: number;
  /** pointer over the section, −1..1 */
  px: number;
  py: number;
  hover: boolean;
  press: boolean;
  dragging: boolean;
  /** extra spin from dragging (radians) */
  spin: number;
};

const { damp } = MathUtils;
const TAU = Math.PI * 2;
const N = socials.length;

/* ── Geometry (cached across remounts) ──────────────────────────────────────────────────── */
const logoCache = new Map<string, ExtrudeGeometry>();
/** A 24×24 Simple Icons path → extruded, centred, 1 unit across. */
function logoGeometry(d: string) {
  let g = logoCache.get(d);
  if (!g) {
    const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${d}"/></svg>`);
    const shapes = svg.paths.flatMap((p) => p.toShapes());
    g = new ExtrudeGeometry(shapes, { depth: 1.6, bevelEnabled: true, bevelThickness: 0.45, bevelSize: 0.14, bevelSegments: 3, curveSegments: 12 });
    g.rotateX(Math.PI); // SVG y points down (a rotation, so the normals stay right)
    g.center();
    g.scale(1 / 24, 1 / 24, 1 / 24);
    logoCache.set(d, g);
  }
  return g;
}

let tileGeo: ExtrudeGeometry | null = null;
/** Rounded "app icon" tile, 1 unit across. */
function tileGeometry() {
  if (!tileGeo) {
    const w = 0.88;
    const r = 0.25;
    const x = -w / 2;
    const s = new Shape();
    s.moveTo(x + r, x);
    s.lineTo(x + w - r, x);
    s.absarc(x + w - r, x + r, r, -Math.PI / 2, 0, false);
    s.lineTo(x + w, x + w - r);
    s.absarc(x + w - r, x + w - r, r, 0, Math.PI / 2, false);
    s.lineTo(x + r, x + w);
    s.absarc(x + r, x + w - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(x, x + r);
    s.absarc(x + r, x + r, r, Math.PI, Math.PI * 1.5, false);
    tileGeo = new ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.06, bevelSegments: 8, curveSegments: 32 });
    tileGeo.center();
  }
  return tileGeo;
}

/** Tile face (depth 0.12 + 2 × bevel 0.09) / 2; the logos sit slightly sunk in. */
const FACE = 0.15;
const LOGO = 0.56;

function Flip({ rig }: { rig: FlipRig }) {
  const group = useRef<Group>(null);
  const front = useRef<Mesh>(null);
  const back = useRef<Mesh>(null);
  const logos = useMemo(() => socials.map((s) => logoGeometry(s.path)), []);
  const colors = useMemo(() => socials.map((s) => new Color(platformColors[s.id].logo)), []);
  // own materials (the shared glossy cache must not be recoloured)
  const mats = useMemo(() => [glossy('navy').clone(), glossy('navy').clone()] as MeshStandardMaterial[], []);
  const st = useRef({ turn: rig.turn, lift: 0, press: 0, rx: 0, ry: 0, faces: [-1, -1] });

  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g || !front.current || !back.current) return;
    const dt = Math.min(delta, 1 / 20);
    const t = clock.elapsedTime;
    const reduced = useApp.getState().reducedMotion;
    const idle = reduced ? 0 : 1;
    const s = st.current;
    s.turn = reduced ? rig.turn : damp(s.turn, rig.turn, 7, dt);

    // between platform i and i+1, the face toward the camera at i shows i, the other shows i+1
    const i = Math.min(Math.floor(s.turn), N - 2);
    const [f, b] = i % 2 === 0 ? [i, i + 1] : [i + 1, i];
    if (s.faces[0] !== f) {
      front.current.geometry = logos[f];
      mats[0].color.copy(colors[f]);
      s.faces[0] = f;
    }
    if (s.faces[1] !== b) {
      back.current.geometry = logos[b];
      mats[1].color.copy(colors[b]);
      s.faces[1] = b;
    }

    if (!rig.dragging) rig.spin = damp(rig.spin, Math.round(rig.spin / TAU) * TAU, 3, dt);
    s.lift = damp(s.lift, rig.hover ? 1 : 0, 6, dt);
    s.press = damp(s.press, rig.press ? 1 : 0, 18, dt);
    s.rx = damp(s.rx, rig.py * 0.28 * idle, 4, dt);
    s.ry = damp(s.ry, rig.px * 0.4 * idle, 4, dt);

    // a little hop as it turns over
    const hop = Math.sin(Math.PI * (s.turn - Math.floor(s.turn)));
    g.rotation.set(s.rx + Math.sin(t * 0.8) * 0.05 * idle, -rig.dir * s.turn * Math.PI + rig.spin + s.ry, Math.sin(t * 0.6) * 0.035 * idle);
    g.position.y = Math.sin(t * 1.1) * 0.045 * idle + hop * 0.12 + s.lift * 0.05;
    g.scale.setScalar(1 + s.lift * 0.06 - s.press * 0.08 - hop * 0.05);
  });

  return (
    <group ref={group}>
      <mesh geometry={tileGeometry()} material={glossy('white')} />
      <mesh ref={front} geometry={logos[0]} material={mats[0]} position-z={FACE} scale={[LOGO, LOGO, 1.25]} />
      <mesh ref={back} geometry={logos[1]} material={mats[1]} position-z={-FACE} rotation-y={Math.PI} scale={[LOGO, LOGO, 1.25]} />
    </group>
  );
}

export default function SocialFlip({ rig, active, onReady, className }: { rig: FlipRig; active: boolean; onReady: () => void; className?: string }) {
  const [compiled, setCompiled] = useState(false);
  const done = useCallback(() => {
    setCompiled(true);
    onReady();
  }, [onReady]);
  return (
    <Canvas
      aria-hidden="true"
      className={className}
      dpr={[1, 1.5]}
      frameloop={active && compiled ? 'always' : 'never'}
      resize={{ scroll: false }}
      onCreated={prodGl}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: NeutralToneMapping }}
      camera={{ fov: 30, near: 0.1, far: 50, position: [0, 0, 4] }}
    >
      <Studio />
      <group scale={1.42}>
        <Flip rig={rig} />
      </group>
      <Precompile onDone={done} />
    </Canvas>
  );
}
