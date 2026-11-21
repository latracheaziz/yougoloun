import { useMemo, useRef, type ComponentType, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Euler, MathUtils, SRGBColorSpace, Vector2, Vector3, type Camera as ThreeCamera, type Group, type Mesh, type MeshBasicMaterial, type Texture } from 'three';
import { feed } from '../state';
import { geo } from './geometry';
import { glow } from './materials';
import { Bell, Camera, Chart, Comment, Growth, Hash, Heart, LogoMark, Megaphone, Phone, PlayButton, Target } from './objects';
import { Chatter } from './Chatter';
import { LOGO_ABOUT, phoneFan } from './formation';
import { useApp } from '@/store/app';
import { brandImages, feedPosts } from '@/config/light';
import type { Token } from '../palette';

/**
 * THE SOCIAL-MEDIA WORLD. Every object blends between four formations (hero, about, corner, dive)
 * with the weights the Director writes into `feed.w`, so the whole scene is a pure function of
 * scroll — scroll back up and everything flies back. On top: idle floating, spin from scroll
 * velocity, and a push away from the pointer (with a faster spin) for the objects near it.
 * Coordinates are local to the subject (the logo at the origin); x is mirrored in RTL.
 */

const { smootherstep, clamp, lerp, damp } = MathUtils;
const TAU = Math.PI * 2;

interface Pose {
  p: Vector3;
  r: Vector3;
  s: number;
}
const pose = (): Pose => ({ p: new Vector3(), r: new Vector3(), s: 0 });
type Formation = (out: Pose, t: number) => void;

/** Accumulate the weighted formations into `out`. */
const tmp = pose();
function blend(out: Pose, forms: Record<keyof typeof feed.w, Formation>, t: number) {
  out.p.set(0, 0, 0);
  out.r.set(0, 0, 0);
  out.s = 0;
  for (const k of ['hero', 'about', 'corner', 'dive'] as const) {
    const w = feed.w[k];
    if (w < 1e-4) continue;
    tmp.p.set(0, 0, 0);
    tmp.r.set(0, 0, 0);
    tmp.s = 1;
    forms[k](tmp, t);
    out.p.addScaledVector(tmp.p, w);
    out.r.addScaledVector(tmp.r, w);
    out.s += tmp.s * w;
  }
}

/** Pointer push (screen space) + hover spin, per object. */
interface Live {
  push: Vector2;
  hover: number;
  spin: number;
  phase: number;
}
const live = (phase: number): Live => ({ push: new Vector2(), hover: 0, spin: 0, phase });
const world = new Vector3();
const ndc = new Vector3();
function interact(l: Live, g: Group, camera: ThreeCamera, aspect: number, dt: number, enabled: boolean) {
  g.getWorldPosition(world);
  ndc.copy(world).project(camera);
  const dx = (ndc.x - feed.pointerRaw.x) * aspect;
  const dy = ndc.y - feed.pointerRaw.y;
  const d = Math.hypot(dx, dy);
  const R = 0.34;
  const near = enabled && d < R ? 1 - d / R : 0;
  const k = near * near * 0.55;
  const tx = d > 1e-4 ? (dx / d) * k : 0;
  const ty = d > 1e-4 ? (dy / d) * k : 0;
  l.push.x = damp(l.push.x, tx * feed.side, 5, dt);
  l.push.y = damp(l.push.y, ty, 5, dt);
  l.hover = damp(l.hover, near > 0 ? 1 : 0, 6, dt);
}

/** Apply a blended pose + idle motion + interaction to a group. */
function apply(g: Group, out: Pose, l: Live, t: number, idle: boolean, bob = 0.06) {
  const side = feed.side;
  const float = idle ? Math.sin(t * 0.9 + l.phase * 7) * bob : 0;
  g.position.set((out.p.x + l.push.x) * side, out.p.y + float + l.push.y, out.p.z);
  g.rotation.set(out.r.x, out.r.y * side + l.spin, out.r.z * side);
  g.scale.setScalar(Math.max(out.s * (1 + l.hover * 0.14), 1e-4));
  g.visible = out.s > 0.002;
}

// ── formations ──────────────────────────────────────────────────────────────────────

/** Hero: icons orbit loosely around the logo. [x, y, z, scale] */
const HERO_SPOTS: [number, number, number, number][] = [
  [0.98, 0.66, 0.35, 0.42],
  [-0.92, 0.78, 0.15, 0.62],
  [1.12, -0.48, 0.25, 0.52],
  [-0.98, -0.55, 0.35, 0.6],
  [0.42, 1.08, -0.5, 0.52],
  [0.55, -1.02, -0.25, 0.48],
  [-0.4, 1.18, 0.55, 0.3],
  [1.62, 0.22, -0.7, 0.42],
  [-1.15, 0.12, -0.6, 0.26],
];


const PHONE_HERO: [number, number, number, number, number, number][] = [
  [1.3, -0.4, -1.1, 0.1, -0.45, 0.18],
  [-0.85, 0.78, -1.9, -0.1, 0.5, -0.15],
  [0.4, 1.12, -2.9, 0.2, -0.2, 0.08],
  [-0.4, -1.1, -2.5, 0.15, 0.4, 0.12],
  [2.0, 0.8, -3.4, 0, -0.6, -0.1],
];

/** Cornerstones: each object rides its own tilted orbit; on "meet" all orbits merge into one. */
const TILTS: [number, number, number][] = [
  [1.15, 0.0, 0.35],
  [1.0, 0.7, -0.45],
  [1.45, -0.55, 0.25],
  [0.85, 0.25, 0.85],
];
const MEET_TILT = new Euler(1.2, 0, 0.12);
const tiltE = new Euler();
const ringPoint = (theta: number, r: number, tilt: Euler, out: Vector3) => out.set(Math.cos(theta) * r, Math.sin(theta) * r, 0).applyEuler(tilt);
function cornerTilt(i: number, meet: number) {
  const a = TILTS[i];
  return tiltE.set(lerp(a[0], MEET_TILT.x, meet), lerp(a[1], MEET_TILT.y, meet), lerp(a[2], MEET_TILT.z, meet));
}
const easeBack = (x: number) => {
  const c = 1.9;
  return x <= 0 ? 0 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};

/** Dive: objects line the tunnel the camera falls through. */
function tunnel(i: number, out: Vector3) {
  const a = i * 2.39996;
  const r = 0.95 + (i % 3) * 0.38;
  return out.set(Math.cos(a) * r, Math.sin(a) * r, 0.7 + ((i * 0.61) % 2.9));
}

// ── cast ────────────────────────────────────────────────────────────────────────────

type IconDef = { C: ComponentType<{ cheap: boolean; color?: Token }>; color?: Token };
const ICONS: IconDef[] = [
  { C: Heart, color: 'blue' },
  { C: Comment },
  { C: PlayButton },
  { C: Megaphone },
  { C: Bell },
  { C: Hash },
  { C: Heart, color: 'green' },
  { C: Comment },
  { C: Heart, color: 'blueLight' },
];
const CORNER: { C: ComponentType<{ cheap: boolean }>; ring: Token }[] = [
  { C: Chart, ring: 'blue' },
  { C: Target, ring: 'green' },
  { C: Camera, ring: 'blueLight' },
  { C: Growth, ring: 'greenLight' },
];
const SCREENS = [brandImages.social, feedPosts[0].image, brandImages.studio, feedPosts[1].image, brandImages.analytics];

/** Fit an image into the phone screen (cover, centred). */
function coverFit(tex: Texture, screenAspect = 0.58 / 1.24) {
  const t = tex.clone();
  t.colorSpace = SRGBColorSpace;
  const img = tex.image as { width: number; height: number } | undefined;
  const aspect = img ? img.width / img.height : 1;
  if (aspect > screenAspect) {
    t.repeat.set(screenAspect / aspect, 1);
    t.offset.set((1 - t.repeat.x) / 2, 0);
  } else {
    t.repeat.set(1, aspect / screenAspect);
    t.offset.set(0, (1 - t.repeat.y) / 2);
  }
  t.needsUpdate = true;
  return t;
}

function Slot({ children, slotRef }: { children: ReactNode; slotRef: (g: Group | null) => void }) {
  return (
    <group ref={slotRef} visible={false}>
      {children}
    </group>
  );
}

export function World() {
  const tier = useApp((s) => s.tier);
  const reduced = useApp((s) => s.reducedMotion);
  const cheap = tier === 'low';
  const icons = tier === 'low' ? ICONS.slice(0, 6) : ICONS;
  const textures = useTexture(SCREENS);
  const screens = useMemo(() => textures.map((t) => coverFit(t)), [textures]);
  const ringMaterials = useMemo(() => CORNER.map(({ ring }) => glow(ring).clone()), []);

  const root = useRef<Group>(null);
  const logo = useRef<Group>(null);
  const iconRefs = useRef<(Group | null)[]>([]);
  const phoneRefs = useRef<(Group | null)[]>([]);
  const cornerRefs = useRef<(Group | null)[]>([]);
  const ringRefs = useRef<(Mesh | null)[]>([]);
  const state = useMemo(
    () => ({
      logo: live(0.1),
      icons: ICONS.map((_, i) => live(i * 0.37 + 0.2)),
      phones: SCREENS.map((_, i) => live(i * 0.53 + 0.4)),
      corner: CORNER.map((_, i) => live(i * 0.29 + 0.7)),
      out: pose(),
      v: new Vector3(),
      tilt: new Vector2(),
    }),
    [],
  );

  useFrame(({ camera, clock, size }, delta) => {
    const r = root.current;
    if (!r) return;
    const dt = Math.min(delta, 1 / 20);
    const t = reduced ? 0 : clock.elapsedTime;
    const aspect = size.width / size.height;
    const idle = !reduced;
    const { out, v } = state;
    const interactive = feed.w.dive < 0.5;

    // the whole subject leans towards the pointer
    state.tilt.x = damp(state.tilt.x, -feed.pointer.y * 0.16, 3, dt);
    state.tilt.y = damp(state.tilt.y, feed.pointer.x * 0.3, 3, dt);
    r.position.copy(feed.anchor);
    r.rotation.set(state.tilt.x, state.tilt.y, 0);

    const spinKick = clamp(feed.velocity * 0.004, -0.12, 0.12);

    // ── logo ──
    if (logo.current) {
      blend(
        out,
        {
          hero: (o) => o.r.set(0.08, -0.32 + Math.sin(t * 0.35) * 0.22, 0),
          about: (o) => {
            o.p.copy(LOGO_ABOUT);
            o.r.set(0.12, -0.15, 0);
            o.s = 0.62;
          },
          corner: (o) => {
            o.r.set(0.1, -0.25 + Math.sin(t * 0.3) * 0.18, 0);
            o.s = 0.82;
          },
          dive: (o) => o.s = 1,
        },
        t,
      );
      const l = state.logo;
      interact(l, logo.current, camera, aspect, dt, interactive);
      l.push.multiplyScalar(0.35); // the logo only leans
      l.spin = clamp(damp(l.spin, 0, 2.5, dt) + spinKick * 0.12, -0.5, 0.5);
      apply(logo.current, out, l, t, idle, 0.04);
    }

    // ── icons ──
    iconRefs.current.forEach((g, i) => {
      if (!g) return;
      const [hx, hy, hz, hs] = HERO_SPOTS[i];
      const orbit = t * 0.07;
      blend(
        out,
        {
          hero: (o) => {
            const c = Math.cos(orbit);
            const s = Math.sin(orbit);
            o.p.set(hx * c - hz * s * 0.4, hy, hz * c + hx * s * 0.25);
            o.r.set(0.15, -0.4 + i, 0.1 * Math.sin(i));
            o.s = hs;
          },
          about: (o) => {
            const n = icons.length;
            o.p.set((i / (n - 1) - 0.5) * 2.9, 0.7 + Math.sin(i * 2.1) * 0.35, 0.35 + (i % 3) * 0.22);
            o.r.set(0.1, -0.3 + i * 0.5, 0);
            o.s = hs * 0.85;
          },
          corner: (o) => {
            const a = (i / icons.length) * TAU + t * 0.05;
            o.p.set(Math.cos(a) * 2.05, Math.sin(a) * 1.25, -1.8 + Math.sin(a * 2) * 0.4);
            o.r.set(0.2, a, 0);
            o.s = hs * 0.7;
          },
          dive: (o) => {
            tunnel(i, o.p);
            o.r.set(0.3, i, 0.2);
            o.s = hs;
          },
        },
        t,
      );
      const l = state.icons[i];
      interact(l, g, camera, aspect, dt, interactive);
      l.spin += dt * (0.25 + l.hover * 4) * (idle ? 1 : 0) + spinKick;
      apply(g, out, l, t, idle);
    });

    // ── phones ──
    phoneRefs.current.forEach((g, i) => {
      if (!g) return;
      const h = PHONE_HERO[i];
      blend(
        out,
        {
          hero: (o) => {
            o.p.set(h[0], h[1], h[2]);
            o.r.set(h[3], h[4] + Math.sin(t * 0.25 + i) * 0.12, h[5]);
          },
          about: (o) => {
            phoneFan(i, o.p);
            const k = i - 2;
            o.r.set(0.04, -k * 0.3 + Math.sin(t * 0.4 + i) * 0.05, -k * 0.06);
          },
          corner: (o) => {
            o.p.set((i - 2) * 0.5, -2.6, -3);
            o.r.set(0.6, (i - 2) * -0.35, 0);
            o.s = 0;
          },
          dive: (o) => {
            tunnel(i + icons.length, o.p);
            o.r.set(0.1, i * 1.3, 0.2);
          },
        },
        t,
      );
      const l = state.phones[i];
      interact(l, g, camera, aspect, dt, interactive && feed.w.about > 0.5);
      l.push.multiplyScalar(0.5);
      l.spin = damp(l.spin, 0, 2, dt) + spinKick * 0.5;
      apply(g, out, l, t, idle, 0.05);
    });

    // ── cornerstones: four objects on orbits that merge ──
    const meet = feed.meet;
    const meetR = lerp(1.8, 1.6, meet);
    cornerRefs.current.forEach((g, i) => {
      if (!g) return;
      const reveal = easeBack(feed.reveal[i]);
      const tilt = cornerTilt(i, smootherstep(meet, 0, 1));
      const theta = lerp(0.6 + i * 1.7, i * (TAU / 4), meet) + t * (0.12 + meet * 0.25);
      ringPoint(theta, meetR, tilt, v);
      blend(
        out,
        {
          hero: (o) => o.s = 0,
          about: (o) => o.s = 0,
          corner: (o) => {
            o.p.copy(v);
            o.r.set(0.15, -0.5 + t * 0.4 + i, 0);
            o.s = 0.62 * reveal;
          },
          dive: (o) => {
            o.p.copy(v);
            o.r.set(0.15, t * 0.4 + i, 0);
            o.s = 0.62;
          },
        },
        t,
      );
      const l = state.corner[i];
      interact(l, g, camera, aspect, dt, interactive);
      l.spin += spinKick + dt * l.hover * 3;
      apply(g, out, l, t, idle, 0.03);

      const ring = ringRefs.current[i];
      if (ring) {
        const on = (feed.w.corner + feed.w.dive * 0.6) * feed.reveal[i];
        ring.visible = on > 0.01;
        ring.rotation.copy(tilt);
        ring.rotation.y *= feed.side;
        ring.rotation.z *= feed.side;
        ring.scale.setScalar((meetR / 1.5) * lerp(0.7, 1, feed.reveal[i]));
        (ring.material as MeshBasicMaterial).opacity = on * lerp(0.8, 0.45, meet);
      }
    });
  });

  return (
    <group ref={root}>
      <group ref={logo}>
        <LogoMark cheap={cheap} />
      </group>
      {icons.map(({ C, color }, i) => (
        <Slot key={i} slotRef={(g) => void (iconRefs.current[i] = g)}>
          <C cheap={cheap} color={color} />
        </Slot>
      ))}
      {screens.map((tex, i) => (
        <Slot key={i} slotRef={(g) => void (phoneRefs.current[i] = g)}>
          <Phone cheap={cheap} texture={tex} />
        </Slot>
      ))}
      {CORNER.map(({ C }, i) => (
        <group key={i}>
          <Slot slotRef={(g) => void (cornerRefs.current[i] = g)}>
            <C cheap={cheap} />
          </Slot>
          <mesh ref={(m) => void (ringRefs.current[i] = m)} geometry={geo.orbit()} material={ringMaterials[i]} visible={false} />
        </group>
      ))}
      <Chatter cheap={cheap} />
    </group>
  );
}
