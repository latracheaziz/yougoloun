import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import { useBitmapTexture } from '../bitmap';
import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  LatheGeometry,
  MathUtils,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Color,
  TorusGeometry,
  Vector2,
  type Group,
  type Material,
  type Mesh,
  type Texture,
} from 'three';
import { ARCH_ANGLES, GALLERY, HERO, ORB, PLAZA, PORTAL, WALK } from './layout';
import { archFrameGeometry, archPictureGeometry, doorwayGeometry, portalGeometry } from './shapes';
import { floorStone, trimStone, wallStone } from './stone';
import { rippleNormals } from './ripples';
import { Cypresses } from './Cypress';
import { Plants } from './Plants';
import { Planets } from './Planets';
import { gradient } from '../props/geometry';
import { glossy } from '../props/materials';
import { token, type Token } from '../palette';
import { world } from '../state';
import { hold } from '@/interaction/hold';
import { brandImages, feedPosts } from '@/config/light';
import { useApp } from '@/store/app';
import { qualityPresets } from '@/config/quality';

const { lerp, smoothstep } = MathUtils;
const NO = new Set(import.meta.env.DEV ? (new URLSearchParams(window.location.search).get('no') ?? '').split(',') : []);

// ── materials ───────────────────────────────────────────────────────────────────────
const glaze = () =>
  new MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.1 });

// ── water ───────────────────────────────────────────────────────────────────────────
/** Pool water: wind ripples (normal map, drifting) + sky fresnel; a blurred mirror on the high tier. */
function Water({ radius, y = 0.26, inView }: { radius: number; y?: number; inView: (G: number) => boolean }) {
  const tier = useApp((s) => s.tier);
  // a mirror re-renders the whole scene every frame: only on capable GPUs, and only for the pool in view
  const [visible, setVisible] = useState(() => inView(world.G));
  useFrame(() => {
    const v = inView(world.G);
    if (v !== visible) setVisible(v);
  });
  const reflect = qualityPresets[tier].reflector && visible;
  const normals = useMemo(() => {
    const t = rippleNormals().clone();
    t.repeat.set(radius / 2.2, radius / 2.2);
    t.needsUpdate = true;
    return t;
  }, [radius]);
  useEffect(() => () => normals.dispose(), [normals]);
  useFrame((_, delta) => {
    if (useApp.getState().reducedMotion) return;
    normals.offset.x += delta * 0.011;
    normals.offset.y += delta * 0.006;
  });
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={y} receiveShadow>
      <circleGeometry args={[radius, 96]} />
      {reflect ? (
        <MeshReflectorMaterial
          resolution={1024}
          blur={[220, 60]}
          mixBlur={0.35}
          mixStrength={1.6}
          mirror={0.8}
          depthScale={0}
          color="#5C9FC6"
          metalness={0}
          roughness={0.06}
          normalMap={normals}
          normalScale={new Vector2(0.12, 0.12)}
          envMapIntensity={1.2}
        />
      ) : (
        <meshPhysicalMaterial
          color="#3E90C0"
          roughness={0.04}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.02}
          normalMap={normals}
          normalScale={new Vector2(0.18, 0.18)}
          envMapIntensity={1.5}
        />
      )}
    </mesh>
  );
}

/** Pool rim: a low rounded stone ring. */
function PoolRim({ radius, material }: { radius: number; material: Material }) {
  const geometry = useMemo(() => {
    const r0 = radius;
    const r1 = radius + 0.55;
    const pts = [
      [r0, 0], [r0, 0.32], [r0 + 0.05, 0.38], [r1 - 0.05, 0.38], [r1, 0.32], [r1, 0],
    ].map(([x, y]) => new Vector2(x, y));
    return new LatheGeometry(pts, 128);
  }, [radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} castShadow receiveShadow />;
}

/** A floating island slab (top at y = 0), slightly tapered. */
function Slab({ radius, top, side }: { radius: number; top: Material; side: Material }) {
  const geometry = useMemo(() => new CylinderGeometry(radius, radius * 0.94, 1.6, 128, 1), [radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  // cylinder groups: side, top cap, bottom cap
  return <mesh geometry={geometry} material={[side, top, side]} position-y={-0.8} receiveShadow castShadow />;
}

/** Low parapet wall around an island, with a gap where the walkway joins. */
function Parapet({ radius, gapAt, gap, material }: { radius: number; gapAt: number; gap: number; material: Material }) {
  const geometry = useMemo(() => {
    const pts = [
      [radius - 0.32, 0], [radius - 0.32, 0.62], [radius - 0.28, 0.68], [radius - 0.04, 0.68], [radius, 0.62], [radius, 0],
    ].map(([x, y]) => new Vector2(x, y));
    return new LatheGeometry(pts, 160, gapAt + gap, Math.PI * 2 - gap * 2);
  }, [radius, gapAt, gap]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} castShadow receiveShadow />;
}

// ── portals ─────────────────────────────────────────────────────────────────────────
function Portals() {
  const blue = useMemo(() => glaze(), []);
  const green = useMemo(() => glaze(), []);
  useEffect(() => () => (blue.dispose(), green.dispose()), [blue, green]);
  // hold to awaken: the glaze glows from within as the voice charges, flashes when it speaks
  useMemo(() => {
    blue.emissive = token('blueLight');
    green.emissive = token('greenLight');
  }, [blue, green]);
  useFrame(({ clock }) => {
    const since = hold.burstAt < 0 ? 99 : clock.elapsedTime - hold.burstAt;
    const flash = Math.exp(-since * 3.2);
    const glow = world.charge * world.charge * 0.55 + flash * 0.9;
    blue.emissiveIntensity = glow;
    green.emissiveIntensity = glow * 0.8;
  });
  const y = PORTAL.bottom + PORTAL.h / 2;
  return (
    <group>
      <mesh geometry={portalGeometry('green')} material={green} position={[3.0, y - 0.42, -3.0]} rotation-y={-0.28} castShadow receiveShadow />
      <mesh geometry={portalGeometry('blue')} material={blue} position={[0, y, 0]} castShadow receiveShadow />
    </group>
  );
}

// ── gallery ─────────────────────────────────────────────────────────────────────────
const FRAME = { w: 2.1, h: 3.5, t: 0.16, depth: 0.24 };
const full = (src: string) => src.replace('-sm.webp', '.webp');
const PICTURES = [feedPosts[0].image, full(brandImages.social), feedPosts[1].image, full(brandImages.studio), feedPosts[2].image, full(brandImages.analytics)];

function coverFit(tex: Texture, aspect: number, anisotropy: number) {
  const t = tex.clone();
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = anisotropy;
  const img = tex.image as { width: number; height: number } | undefined;
  const a = img ? img.width / img.height : 1;
  if (a > aspect) {
    t.repeat.set(aspect / a, 1);
    t.offset.set((1 - t.repeat.x) / 2, 0);
  } else {
    t.repeat.set(1, a / aspect);
    t.offset.set(0, (1 - t.repeat.y) / 2);
  }
  t.needsUpdate = true;
  return t;
}

function Gallery({ plaster, base }: { plaster: Material; base: Material }) {
  const textures = useBitmapTexture(PICTURES);
  const maxAniso = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const pictureAspect = (FRAME.w - 2 * FRAME.t) / (FRAME.h - 2 * FRAME.t);
  const materials = useMemo(
    () =>
      textures.map((t) => {
        // a print in daylight: lit (it takes the frame's shadow), with a little glow so it stays vivid
        const map = coverFit(t, pictureAspect, Math.min(8, maxAniso));
        return new MeshStandardMaterial({ map, emissiveMap: map, emissive: new Color(1, 1, 1), emissiveIntensity: 0.32, roughness: 0.5, metalness: 0, envMapIntensity: 0.4 });
      }),
    [textures, pictureAspect, maxAniso],
  );
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);
  const plinth = useMemo(() => new BoxGeometry(FRAME.w + 0.4, 0.34, 0.7), []);
  useEffect(() => () => plinth.dispose(), [plinth]);
  return (
    <group>
      {GALLERY.map(([x, z, ry], i) => (
        <group key={i} position={[x, 0, z]} rotation-y={ry}>
          <mesh geometry={plinth} material={base} position-y={0.17} castShadow receiveShadow />
          <group position-y={0.34}>
            <mesh geometry={archFrameGeometry(FRAME.w, FRAME.h, FRAME.t, FRAME.depth)} material={plaster} castShadow receiveShadow />
            <mesh geometry={archPictureGeometry(FRAME.w, FRAME.h, FRAME.t)} material={materials[i % materials.length]} position-z={-0.02} receiveShadow />
          </group>
        </group>
      ))}
    </group>
  );
}

// ── plaza: four doorway arches (the cornerstones), objects on plinths, the orb ─────────
const ARCH = { W: 4.6, H: 6.8, w: 2.5, hIn: 5.0, depth: 0.95 };
const RING_COLORS: Token[] = ['blue', 'green', 'blueLight', 'greenLight'];

function Plaza({ plaster, trim }: { plaster: Material; trim: Material }) {
  const glowMats = useMemo(
    () => RING_COLORS.map((c) => new MeshBasicMaterial({ color: token(c).multiplyScalar(1.25), transparent: true, opacity: 0, depthWrite: false, side: DoubleSide })),
    [],
  );
  useEffect(() => () => glowMats.forEach((m) => m.dispose()), [glowMats]);
  const plinth = useMemo(() => new CylinderGeometry(0.62, 0.7, 1.25, 48), []);
  const plinthCap = useMemo(() => new CylinderGeometry(0.74, 0.74, 0.1, 48), []);
  // the arches read as built: a projecting cornice on top, a base course at the foot
  const cornice = useMemo(() => new BoxGeometry(ARCH.W + 0.34, 0.28, ARCH.depth + 0.3), []);
  const base = useMemo(() => new BoxGeometry(ARCH.W + 0.2, 0.26, ARCH.depth + 0.2), []);
  useEffect(() => () => (plinth.dispose(), plinthCap.dispose(), cornice.dispose(), base.dispose()), [plinth, plinthCap, cornice, base]);

  useFrame(() => {
    world.reveal.forEach((r, i) => {
      glowMats[i].opacity = Math.min(1, r * 1.2) * lerp(0.55, 0.85, world.meet);
    });
  });

  return (
    <group position={PLAZA.center}>
      {ARCH_ANGLES.map((a, i) => {
        const x = Math.cos(a) * PLAZA.archRadius;
        const z = Math.sin(a) * PLAZA.archRadius;
        const ry = Math.atan2(-x, -z);
        const px = Math.cos(a) * (PLAZA.archRadius - 2.1);
        const pz = Math.sin(a) * (PLAZA.archRadius - 2.1);
        return (
          <group key={i}>
            <group position={[x, 0, z]} rotation-y={ry}>
              <mesh geometry={doorwayGeometry(ARCH.W, ARCH.H, ARCH.w, ARCH.hIn, ARCH.depth)} material={plaster} castShadow receiveShadow />
              <mesh geometry={cornice} material={trim} position-y={ARCH.H + 0.14} castShadow receiveShadow />
              <mesh geometry={base} material={trim} position-y={0.13} receiveShadow />
              {/* the doorway lights up in the cornerstone's colour */}
              <mesh geometry={archPictureGeometry(ARCH.w, ARCH.hIn, 0)} material={glowMats[i]} position-z={-0.2} />
            </group>
            <mesh geometry={plinth} material={trim} position={[px, 0.625, pz]} castShadow receiveShadow />
            <mesh geometry={plinthCap} material={trim} position={[px, 1.25, pz]} castShadow receiveShadow />
          </group>
        );
      })}
    </group>
  );
}

function Orb() {
  const geometry = useMemo(() => gradient(new SphereGeometry(ORB.radius, 96, 64), 'blueLight', 'green'), []);
  const ring = useMemo(() => new TorusGeometry(ORB.radius * 1.55, 0.025, 16, 160), []);
  const material = useMemo(
    () => new MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.2, sheen: 0.3 }),
    [],
  );
  useEffect(() => () => (geometry.dispose(), ring.dispose(), material.dispose()), [geometry, ring, material]);
  const group = useRef<Group>(null);
  const ringRef = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const t = useApp.getState().reducedMotion ? 0 : clock.elapsedTime;
    if (group.current) {
      group.current.position.set(ORB.center.x, ORB.center.y + Math.sin(t * 0.8) * 0.12, ORB.center.z);
      group.current.rotation.y = t * 0.15;
    }
    if (ringRef.current) {
      ringRef.current.rotation.set(1.2 + Math.sin(t * 0.3) * 0.1, t * 0.4, 0.2);
      // the cornerstone planets' orbits take over from the orb's own ring
      const away = Math.min(1, world.reveal[0] * 1.6);
      ringRef.current.scale.setScalar(Math.max(1 - away, 1e-4));
      ringRef.current.visible = away < 0.999;
    }
  });
  return (
    <group ref={group}>
      <mesh geometry={geometry} material={material} castShadow />
      <mesh ref={ringRef} geometry={ring} material={glossy('white')} castShadow />
    </group>
  );
}

// ── the whole place ─────────────────────────────────────────────────────────────────
export function Architecture() {
  const plaster = wallStone();
  const trim = trimStone();
  const floor = floorStone();
  const walkway = useMemo(() => new BoxGeometry(WALK.width, 1.6, WALK.from - WALK.to), []);
  const wall = useMemo(() => new BoxGeometry(0.3, 0.62, WALK.from - WALK.to), []);
  useEffect(() => () => (walkway.dispose(), wall.dispose()), [walkway, wall]);
  const walkZ = (WALK.from + WALK.to) / 2;
  const heroGap = Math.asin(WALK.width / 2 / HERO.radius) + 0.04;
  const plazaGap = Math.asin(WALK.width / 2 / PLAZA.radius) + 0.04;

  return (
    <group>
      {/* hero island */}
      <group position={HERO.center}>
        <Slab radius={HERO.radius} top={floor} side={plaster} />
        <Parapet radius={HERO.radius} gapAt={Math.PI} gap={heroGap} material={plaster} />
        <PoolRim radius={HERO.pool} material={trim} />
        <Water radius={HERO.pool} inView={(G) => G < 1.35} />
        <Portals />
      </group>

      {/* walkway */}
      <mesh geometry={walkway} material={[plaster, plaster, floor, plaster, plaster, plaster]} position={[0, -0.8, walkZ]} receiveShadow castShadow />
      <mesh geometry={wall} material={plaster} position={[-WALK.width / 2 + 0.15, 0.31, walkZ]} castShadow receiveShadow />
      <mesh geometry={wall} material={plaster} position={[WALK.width / 2 - 0.15, 0.31, walkZ]} castShadow receiveShadow />
      <Gallery plaster={trim} base={plaster} />

      {/* plaza */}
      <group position={PLAZA.center}>
        <Slab radius={PLAZA.radius} top={floor} side={plaster} />
        <Parapet radius={PLAZA.radius} gapAt={0} gap={plazaGap} material={plaster} />
        <PoolRim radius={PLAZA.pool} material={trim} />
        {!NO.has('water') && <Water radius={PLAZA.pool} inView={(G) => G > 1.65} />}
      </group>
      <Plaza plaster={plaster} trim={trim} />
      {!NO.has('planets') && <Planets />}
      {!NO.has('orb') && <Orb />}

      {!NO.has('trees') && <Cypresses />}
      {!NO.has('plants') && <Plants />}
    </group>
  );
}

/** Fade helper for the plaza ribbon (shown as the cornerstones meet). */
export const plazaRibbonVisible = () => smoothstep(world.meet, 0.05, 0.6);
