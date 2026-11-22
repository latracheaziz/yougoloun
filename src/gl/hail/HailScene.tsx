import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import {
  Color,
  MathUtils,
  QuadraticBezierCurve3,
  ShaderMaterial,
  TubeGeometry,
  Vector2,
  Vector3,
  type Group,
  type Mesh,
  type PerspectiveCamera,
} from 'three';
import { LogoMark } from '../props/objects';
import { token } from '../palette';
import { light } from '@/config/palette';
import { useApp } from '@/store/app';
import { writeHold } from '@/interaction/hold';
import { heightAt, MAP, PLACES, REACH, SCALE, terrainGeometry, toWorld, type PlaceKey } from './terrain';

/**
 * HAIL IN 3D — the landing after the clouds. A white relief model of the Hail region (Aja, Salma, the
 * Nafud) with contour lines in the brand gradient, computed from the real heights. Scroll: you land
 * top-down (it reads as the flat map), the contours draw outwards from Hail, the map stands up into 3D
 * and the glossy logo drops onto Hail; arcs leave for the GCC & MENA (real bearings).
 * Drag (mouse) to orbit · hover a place name to light its mountain · HOLD to send the voice out: a
 * wave runs across the terrain and pulses fly along every arc.
 */

const { clamp, damp, lerp, smoothstep } = MathUtils;
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Shared with Arrival.tsx (written by its ScrollTrigger / label hover). */
export interface HailLink {
  /** 0..1 scroll progress of the arrival section. */
  p: number;
  /** Hovered place (labels), or null. */
  focus: PlaceKey | null;
  /** Label elements to position each frame: places + cities. */
  labels: Record<string, HTMLElement | null>;
  /** The section (gestures are read on it). */
  surface: HTMLElement | null;
}

const gesture = { pressing: false, charge: 0, burstAt: -99, dragging: false, yaw: 0, startX: 0, startY: 0, startYaw: 0, moved: 0 };

// ── terrain material ─────────────────────────────────────────────────────────────────
/**
 * Our own hill-shade (no three.js lights): flat ground is EXACTLY the paper colour, slopes facing the
 * north-west light brighten a touch, the others shade — so the model is the page, raised.
 * Normals stay right while the relief rises (scale.y = uRise is folded into them).
 */
const terrainVert = /* glsl */ `
attribute vec2 aMap;
uniform float uRise;
varying vec2 vMap;
varying float vH;
varying vec3 vN;
void main() {
  vMap = aMap;
  vH = position.y;
  vN = normalize(vec3(normal.x, normal.y / max(uRise, 0.02), normal.z));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const terrainFrag = /* glsl */ `
uniform vec3 uBlue; uniform vec3 uGreen; uniform vec3 uPaper;
uniform float uReveal; uniform float uWaveR; uniform vec2 uFocus; uniform float uFocusOn; uniform float uTime; uniform float uPin;
varying vec2 vMap; varying float vH; varying vec3 vN;
void main() {
  vec3 n = normalize(vN);
  vec3 L = normalize(vec3(-0.5, 0.72, -0.43));
  float flatL = L.y;
  float shade = 0.5 + 0.5 * dot(n, L) / flatL;          // 1.0 on flat ground
  shade = mix(shade, 1.0, 0.15) * (0.96 + 0.04 * n.y);  // soften, a little ambient occlusion on steep faces
  vec3 col = uPaper * clamp(shade, 0.55, 1.07);

  float dHail = length((vMap - vec2(${MAP.hail.x.toFixed(1)}, ${MAP.hail.y.toFixed(1)})) * vec2(1.0, 1.15));
  // contour lines from the real height, every 0.075 units, every 5th heavier
  float f = vH / 0.075;
  float minor = 1.0 - smoothstep(0.0, fwidth(f) * 1.1 + 1e-4, abs(fract(f - 0.5) - 0.5));
  float f5 = f / 5.0;
  float major = 1.0 - smoothstep(0.0, fwidth(f5) * 2.2 + 1e-4, abs(fract(f5 - 0.5) - 0.5));
  float lines = max(minor * 0.6, major);
  float shown = 1.0 - smoothstep(uReveal - 120.0, uReveal, dHail);
  float near = (1.0 - smoothstep(120.0, 420.0, length(vMap - uFocus))) * uFocusOn;
  float wave = uWaveR > 0.0 ? exp(-pow((dHail - uWaveR) / 70.0, 2.0)) : 0.0;
  float k = vMap.x / ${MAP.w.toFixed(1)} * 0.55 + vMap.y / ${MAP.h.toFixed(1)} * 0.45;
  vec3 ink = mix(uBlue, uGreen, clamp(k, 0.0, 1.0)) * clamp(shade, 0.8, 1.05);
  col = mix(col, ink, clamp(lines * shown * (0.62 + near * 0.38 + wave * 0.4), 0.0, 1.0));
  // the voice's wave: a soft brand-coloured band rolling outwards
  col = mix(col, mix(uBlue, uGreen, 0.4) * 1.25, wave * 0.22);
  // Hail: pulsing rings on the ground + the pin's soft contact shadow
  float rings = 0.0;
  for (int i = 0; i < 3; i++) {
    float r = mod(uTime * 38.0 + float(i) * 70.0, 210.0) + 20.0;
    rings += (1.0 - smoothstep(0.0, 2.2, abs(dHail - r))) * (1.0 - r / 230.0);
  }
  col = mix(col, uGreen, rings * 0.5 * shown);
  col *= 1.0 - 0.16 * uPin * (1.0 - smoothstep(0.0, 75.0, dHail));
  // the model dissolves into the paper towards its edges
  vec2 e = min(vMap, vec2(${MAP.w.toFixed(1)}, ${MAP.h.toFixed(1)}) - vMap);
  col = mix(uPaper, col, smoothstep(0.0, 170.0, min(e.x, e.y)));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

function terrainMaterial() {
  const uniforms = {
    // deep tones: the lines must read on the white model
    uBlue: { value: token('blueDeep').multiplyScalar(0.8) },
    uGreen: { value: token('greenDeep').multiplyScalar(0.8) },
    uPaper: { value: new Color(light.paper) },
    uReveal: { value: 0 },
    uWaveR: { value: -1 },
    uFocus: { value: new Vector2(-9999, -9999) },
    uFocusOn: { value: 0 },
    uTime: { value: 0 },
    uRise: { value: 1 },
    uPin: { value: 0 },
  };
  const material = new ShaderMaterial({ vertexShader: terrainVert, fragmentShader: terrainFrag, uniforms });
  return { material, uniforms };
}

function Terrain({ link }: { link: HailLink }) {
  const mobile = useApp((s) => s.mobile);
  const geometry = useMemo(() => (mobile ? terrainGeometry(200, 125) : terrainGeometry(360, 225)), [mobile]);
  const { material, uniforms } = useMemo(terrainMaterial, []);
  useEffect(() => () => (geometry.dispose(), material.dispose()), [geometry, material]);
  const mesh = useRef<Mesh>(null);
  const focusOn = useRef(0);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const reduced = useApp.getState().reducedMotion;
    const p = link.p;
    uniforms.uTime.value = reduced ? 0 : clock.elapsedTime;
    uniforms.uReveal.value = reduced ? 3000 : lerp(0, 1500, smoothstep(p, 0.02, 0.42));
    const rise = ease(smoothstep(p, 0.2, 0.58));
    const sy = lerp(0.06, 1, rise);
    if (mesh.current) mesh.current.scale.y = sy;
    uniforms.uRise.value = sy;
    uniforms.uPin.value = smoothstep(link.p, 0.38, 0.46);
    const since = clock.elapsedTime - gesture.burstAt;
    uniforms.uWaveR.value = since < 3.2 && !reduced ? since * 520 : -1;
    focusOn.current = damp(focusOn.current, link.focus ? 1 : 0, 6, dt);
    uniforms.uFocusOn.value = focusOn.current;
    if (link.focus) uniforms.uFocus.value.set(PLACES[link.focus].x, PLACES[link.focus].y);
  });
  return <mesh ref={mesh} geometry={geometry} material={material} />;
}

// ── the pin: the glossy logo dropping onto Hail ──────────────────────────────────────
function Pin({ link }: { link: HailLink }) {
  const group = useRef<Group>(null);
  const dropAt = useRef(-1);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const reduced = useApp.getState().reducedMotion;
    if (dropAt.current < 0 && link.p > 0.36) dropAt.current = t;
    const age = dropAt.current < 0 ? -1 : t - dropAt.current;
    const ground = 0.95;
    if (reduced) {
      g.visible = link.p > 0.3;
      g.position.y = ground;
    } else {
      g.visible = age >= 0;
      const fall = clamp(age / 1.1, 0, 1);
      // bounce.out
      const b = (x: number) => {
        const n = 7.5625;
        const d = 2.75;
        if (x < 1 / d) return n * x * x;
        if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
        if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
        return n * (x -= 2.625 / d) * x + 0.984375;
      };
      g.position.y = ground + (1 - b(fall)) * 4 + Math.sin(t * 1.3) * 0.05 * fall;
      const since = t - gesture.burstAt;
      g.scale.setScalar(0.85 * (1 + gesture.charge * 0.18 + Math.exp(-since * 6) * 0.25 * (since > 0 ? 1 : 0)));
      g.rotation.y = Math.sin(t * 0.5) * 0.25 - 0.2;
    }
  });
  return (
    <group ref={group} position={[0, 1, 0]} visible={false}>
      <LogoMark cheap={false} />
    </group>
  );
}

// ── reach arcs to the GCC & MENA ─────────────────────────────────────────────────────
const arcVert = /* glsl */ `
varying float vU;
void main() {
  vU = uv.x;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const arcFrag = /* glsl */ `
uniform vec3 uBlue; uniform vec3 uGreen; uniform float uDraw; uniform float uPulse; uniform float uTime; uniform float uSeed;
varying float vU;
void main() {
  if (vU > uDraw) discard;
  vec3 c = mix(uBlue, uGreen, vU);
  float head = uPulse > 0.0 ? exp(-pow((vU - fract(uTime * 0.55 + uSeed)) / 0.05, 2.0)) * uPulse : 0.0;
  c = mix(c, vec3(1.0), head * 0.75);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

/** Where an arc leaves the model: along its bearing, just inside the map edge. */
function edgePoint(dir: readonly [number, number]) {
  const [hx, hz] = [MAP.hail.x * SCALE, MAP.hail.y * SCALE];
  const tx = dir[0] > 0 ? (MAP.w * SCALE - hx - 1.2) / dir[0] : (-hx + 1.2) / dir[0];
  const tz = dir[1] > 0 ? (MAP.h * SCALE - hz - 1.0) / dir[1] : (-hz + 1.0) / dir[1];
  const t = Math.min(Math.abs(tx), Math.abs(tz)) * 0.74; // ends well inside the frame, labels on screen
  return new Vector3(dir[0] * t, 0, dir[1] * t);
}
export const ARC_ENDS = REACH.map((c) => edgePoint(c.dir));

function Arcs({ link }: { link: HailLink }) {
  const items = useMemo(
    () =>
      REACH.map((_, i) => {
        const end = ARC_ENDS[i].clone();
        const [mx, my] = [end.x / SCALE + MAP.hail.x, end.z / SCALE + MAP.hail.y];
        end.y = heightAt(mx, my) + 0.08;
        const start = new Vector3(0, 1.05, 0);
        const mid = start.clone().lerp(end, 0.5);
        mid.y += 0.7 + end.length() * 0.1;
        const geometry = new TubeGeometry(new QuadraticBezierCurve3(start, mid, end), 96, 0.022, 6, false);
        const material = new ShaderMaterial({
          vertexShader: arcVert,
          fragmentShader: arcFrag,
          uniforms: {
            uBlue: { value: token('blue') },
            uGreen: { value: token('green') },
            uDraw: { value: 0 },
            uPulse: { value: 0 },
            uTime: { value: 0 },
            uSeed: { value: i * 0.17 },
          },
        });
        return { geometry, material };
      }),
    [],
  );
  useEffect(() => () => items.forEach((it) => (it.geometry.dispose(), it.material.dispose())), [items]);
  const rise = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const reduced = useApp.getState().reducedMotion;
    const since = t - gesture.burstAt;
    items.forEach((it, i) => {
      const u = it.material.uniforms;
      u.uDraw.value = reduced ? (link.p > 0.5 ? 1.01 : 0) : ease(clamp((link.p - 0.5 - i * 0.025) / 0.2, 0, 1)) * 1.01;
      u.uTime.value = t;
      // idle: a slow pulse; after the voice speaks: bright, fast pulses for a few seconds
      u.uPulse.value = reduced ? 0 : 0.35 + (since < 4 ? 0.65 * (1 - since / 4) : 0);
    });
    if (rise.current) rise.current.scale.y = lerp(0.06, 1, ease(smoothstep(link.p, 0.2, 0.58)));
  });
  return (
    <group ref={rise}>
      {items.map((it, i) => (
        <mesh key={i} geometry={it.geometry} material={it.material} />
      ))}
    </group>
  );
}

// ── camera, labels, gestures ─────────────────────────────────────────────────────────
const tmp = new Vector3();
function Rig({ link }: { link: HailLink }) {
  const camera = useThree((s) => s.camera as PerspectiveCamera);
  const size = useThree((s) => s.size);
  const sm = useRef({ yaw: 0, px: 0, py: 0 });

  // gestures on the section: drag (mouse) orbits; a press that stays charges the voice
  useEffect(() => {
    const el = link.surface;
    if (!el) return;
    const ignore = 'a, button, input, [data-no-hold]';
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || (e.target as Element).closest(ignore)) return;
      gesture.pressing = true;
      gesture.startX = e.clientX;
      gesture.startY = e.clientY;
      gesture.startYaw = gesture.yaw;
      gesture.moved = 0;
    };
    const move = (e: PointerEvent) => {
      sm.current.px = (e.clientX / window.innerWidth) * 2 - 1;
      sm.current.py = (e.clientY / window.innerHeight) * 2 - 1;
      if (!gesture.pressing && !gesture.dragging) return;
      gesture.moved = Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY);
      if (gesture.pressing && gesture.moved > 10) {
        gesture.pressing = false;
        gesture.dragging = e.pointerType === 'mouse';
      }
      if (gesture.dragging) gesture.yaw = clamp(gesture.startYaw + ((e.clientX - gesture.startX) / window.innerWidth) * 2.6, -1.1, 1.1);
    };
    const up = () => {
      gesture.pressing = false;
      gesture.dragging = false;
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      writeHold(0);
    };
  }, [link]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const t = clock.elapsedTime;
    const reduced = useApp.getState().reducedMotion;
    const rtl = useApp.getState().dir === 'rtl';

    // hold to awaken
    if (gesture.pressing && !reduced) {
      gesture.charge = Math.min(1, gesture.charge + dt / 1.0);
      if (gesture.charge >= 1) {
        gesture.burstAt = t;
        gesture.pressing = false;
      }
    } else gesture.charge = Math.max(0, gesture.charge - dt * 2);
    writeHold(gesture.charge);
    if (!gesture.dragging) gesture.yaw = damp(gesture.yaw, 0, 0.9, dt); // drifts back home

    // camera: top-down (the flat map) → tilted 3D view, slowly turning
    const p = link.p;
    const tilt = ease(smoothstep(p, 0.16, 0.6));
    const portrait = size.height > size.width;
    const polar = lerp(0.015, 0.98, tilt);
    const dist = lerp(portrait ? 25 : 13.5, portrait ? 23.5 : 12.2, tilt);
    sm.current.yaw = damp(sm.current.yaw, gesture.yaw, 6, dt);
    const yaw = lerp(0, rtl ? 0.32 : -0.32, tilt) + sm.current.yaw + (reduced ? 0 : Math.sin(t * 0.07) * 0.06 * tilt) + sm.current.px * 0.05 * tilt;
    const target = tmp.set(0, lerp(0, 0.4, tilt), lerp(0, 0.4, tilt));
    camera.position.set(
      target.x + Math.sin(yaw) * Math.sin(polar) * dist,
      target.y + Math.cos(polar) * dist + sm.current.py * 0.25 * tilt,
      target.z + Math.cos(yaw) * Math.sin(polar) * dist,
    );
    camera.up.set(0, 1, 0); // polar never reaches 0 → north stays up, no flip
    camera.lookAt(target);
    camera.fov = portrait ? 42 : 34;
    // the model sits under the title: shift the image down as the view tilts
    camera.setViewOffset(size.width, size.height, 0, -size.height * lerp(0.04, portrait ? 0.07 : 0.16, tilt), size.width, size.height);
    camera.updateProjectionMatrix();

    // labels follow their 3D anchors
    const place = (key: string, x: number, y: number, z: number, show: number) => {
      const el = link.labels[key];
      if (!el) return;
      tmp.set(x, y, z).project(camera);
      const visible = tmp.z < 1 && show > 0.01;
      el.style.opacity = visible ? String(show) : '0';
      el.style.transform = `translate(-50%, -50%) translate(${((tmp.x + 1) / 2) * size.width}px, ${((1 - tmp.y) / 2) * size.height}px)`;
    };
    const rise = lerp(0.06, 1, ease(smoothstep(p, 0.2, 0.58)));
    (Object.keys(PLACES) as PlaceKey[]).forEach((k) => {
      const { x, y } = PLACES[k];
      const [wx, wz] = toWorld(x, y);
      place(k, wx, heightAt(x, y) * rise + 0.35, wz, smoothstep(p, 0.22, 0.36));
    });
    REACH.forEach((c, i) => {
      const e = ARC_ENDS[i];
      place(c.key, e.x, 0.25, e.z, smoothstep(p, 0.62 + i * 0.025, 0.72 + i * 0.025));
    });

  });

  return (
    <>
      <hemisphereLight args={['#FFFFFF', '#D9CFBF', 0.48]} />
      {/* the classic hill-shade light: high, from the north-west. Intensities calibrated (measured on
          screenshots) so flat ground renders exactly as the paper — slopes then shade and catch light */}
      <directionalLight
        position={[-7, 10, -6]}
        intensity={1.02}
        color="#FFF8EF"
      />
      {/* studio reflections for the glossy logo (no HDR download) */}
      {/* surrounds the logo on every side: the camera orbits (RTL, drag) and it must stay bright */}
      <Environment resolution={128} frames={1} environmentIntensity={1.25}>
        <Lightformer form="ring" intensity={2.4} position={[0, 7, 0]} rotation-x={Math.PI / 2} scale={8} />
        <Lightformer form="rect" intensity={1.8} position={[0, 3, 7]} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[0, 3, -7]} rotation-y={Math.PI} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1.3} color="#D6EEFA" position={[-7, 3, 0]} rotation-y={Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={1.3} color="#E4F2D6" position={[7, 3, 0]} rotation-y={-Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="circle" intensity={3} position={[4, 6, 4]} scale={2} />
      </Environment>
    </>
  );
}

export default function HailScene({ link, active }: { link: HailLink; active: boolean }) {
  return (
    <Canvas
      aria-hidden="true"
      className="!absolute inset-0"
      dpr={[1, 2]}
      flat
      frameloop={active ? 'always' : 'never'}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      camera={{ fov: 34, near: 0.1, far: 120, position: [0, 14, 0.01] }}
      onCreated={({ gl }) => gl.setClearColor(new Color(light.paper), 1)}
    >
      <Rig link={link} />
      <Terrain link={link} />
      <Pin link={link} />
      <Arcs link={link} />
    </Canvas>
  );
}

/** Hold charge of the arrival (for the hint ring). */
export const hailGesture = gesture;
