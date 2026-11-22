import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  MathUtils,
  NeutralToneMapping,
  Plane,
  QuadraticBezierCurve3,
  Raycaster,
  ShaderMaterial,
  TubeGeometry,
  Vector2,
  Vector3,
  type Group,
  type PerspectiveCamera,
} from 'three';
import { LogoMark } from '../props/objects';
import { token } from '../palette';
import { useApp } from '@/store/app';
import { writeHold } from '@/interaction/hold';
import { buildCrowd, CITIES, WINDOW, toWorld, type Crowd } from './crowd';
import { gesture, mouse, shared, wave } from './state';
import { Glow, Influencers, RisingBuzz } from './Buzz';

/**
 * WORD OF MOUTH SPREADS — the landing after the clouds. Thousands of people (dots) on the real land of
 * the Arabian Peninsula. A conversation starts in Hail (the glossy logo) and, as you scroll, passes
 * person to person and jumps city to city across the GCC (arcs), each person lighting up in the brand
 * gradient; notification bubbles pop from those just reached. The camera starts close on Hail and pulls
 * back until the region is alive. Cursor: the crowd parts and rises · drag: orbit · HOLD: broadcast — a
 * wave runs through everyone.
 */

const { clamp, damp, lerp, smoothstep } = MathUtils;
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Shared with Arrival.tsx. */
export interface SpreadLink {
  /** 0..1 scroll progress of the section. */
  p: number;
  /** City name tags, by city key. */
  labels: Record<string, HTMLElement | null>;
  /** Notification bubble pool. */
  bubbles: (HTMLElement | null)[];
  /** Texts the bubbles cycle through. */
  messages: string[];
  /** Funnel HUD: gets data-stage + --front. */
  hud: HTMLElement | null;
  /** The section (gestures are read on it). */
  surface: HTMLElement | null;
  /** Live feed list (events are prepended) + city names for it. */
  feed: HTMLElement | null;
  cityNames: Record<string, string>;
}


// window bounds in world units, for the edge fade
const [W0, N0] = toWorld(WINDOW.lat[1], WINDOW.lon[0]);
const [E0, S0] = toWorld(WINDOW.lat[0], WINDOW.lon[1]);

// ── the crowd ─────────────────────────────────────────────────────────────────────────
const crowdVert = /* glsl */ `
attribute float aT;
attribute float aSeed;
uniform float uFront; uniform float uTime; uniform vec2 uMouse; uniform float uMouseOn;
uniform vec2 uWaveO; uniform float uWaveR; uniform float uPx; uniform vec4 uWin;
varying float vAct; varying float vFresh; varying float vRing; varying float vT; varying float vEdge; varying float vFlow;
void main() {
  float act = smoothstep(aT, aT + 0.012, uFront);
  float fresh = act * exp(-max(uFront - aT, 0.0) * 28.0);
  // the conversation keeps flowing outwards in waves through everyone already reached
  float flow = act * smoothstep(0.86, 1.0, fract(uTime * 0.2 - aT * 5.0));
  vec3 p = position;
  p.y = act * (0.02 + 0.015 * sin(uTime * 1.6 + aSeed * 40.0)) + fresh * 0.3;
  // the cursor parts the crowd, people rise towards it
  vec2 dm = p.xz - uMouse;
  float push = (1.0 - smoothstep(0.0, 1.1, length(dm))) * uMouseOn;
  p.xz += normalize(dm + 1e-4) * push * 0.25;
  p.y += push * 0.2;
  // the broadcast wave
  float ring = uWaveR > 0.0 ? exp(-pow((length(position.xz - uWaveO) - uWaveR) / 0.4, 2.0)) : 0.0;
  p.y += ring * 0.4;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float size = 0.03 + act * 0.016 + fresh * 0.045 + ring * 0.035 + push * 0.02 + flow * 0.014;
  vFlow = flow;
  gl_PointSize = size * uPx / -mv.z;
  gl_Position = projectionMatrix * mv;
  vAct = act; vFresh = fresh; vRing = ring; vT = aT;
  vec2 e = min(position.xz - uWin.xy, uWin.zw - position.xz);
  vEdge = smoothstep(0.0, 1.4, min(e.x, e.y));
}`;
const crowdFrag = /* glsl */ `
uniform vec3 uInk; uniform vec3 uBlue; uniform vec3 uGreen; uniform vec3 uLight;
varying float vAct; varying float vFresh; varying float vRing; varying float vT; varying float vEdge; varying float vFlow;
void main() {
  float r = length(gl_PointCoord - 0.5);
  if (r > 0.5) discard;
  float a = smoothstep(0.5, 0.36, r);
  vec3 col = mix(uInk, mix(uBlue, uGreen, smoothstep(0.0, 0.9, vT)), vAct);
  col = mix(col, uLight, clamp(vFresh * 0.8 + vRing * 0.7 + vFlow * 0.55, 0.0, 1.0));
  gl_FragColor = vec4(col, a * mix(0.28, 1.0, vAct) * vEdge);
  #include <colorspace_fragment>
}`;

// ── the conversation's paths (who told whom) ──────────────────────────────────────────
const edgeVert = /* glsl */ `
attribute float aT;
uniform float uFront; uniform vec4 uWin; uniform float uTime;
varying float vA; varying float vT; varying float vFlow;
void main() {
  vT = aT;
  vFlow = smoothstep(0.86, 1.0, fract(uTime * 0.2 - aT * 5.0));
  vec2 e = min(position.xz - uWin.xy, uWin.zw - position.xz);
  vA = smoothstep(aT, aT + 0.02, uFront) * smoothstep(0.0, 1.4, min(e.x, e.y));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position + vec3(0.0, 0.015, 0.0), 1.0);
}`;
const edgeFrag = /* glsl */ `
uniform vec3 uBlue; uniform vec3 uGreen; uniform vec3 uLight;
varying float vA; varying float vT; varying float vFlow;
void main() {
  if (vA < 0.01) discard;
  vec3 c = mix(mix(uBlue, uGreen, smoothstep(0.0, 0.9, vT)), uLight, vFlow * 0.6);
  gl_FragColor = vec4(c, vA * (0.3 + vFlow * 0.55));
  #include <colorspace_fragment>
}`;

// ── city-to-city jumps ────────────────────────────────────────────────────────────────
const arcVert = /* glsl */ `
varying float vU;
void main() { vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const arcFrag = /* glsl */ `
uniform vec3 uBlue; uniform vec3 uGreen; uniform vec3 uLight; uniform float uDraw; uniform float uTime; uniform float uSeed; uniform float uBoost;
varying float vU;
void main() {
  if (vU > uDraw) discard;
  vec3 c = mix(uBlue, uGreen, vU);
  float head = exp(-pow((vU - fract(uTime * (0.35 + uBoost) + uSeed)) / 0.05, 2.0)) * step(0.999, uDraw);
  head += exp(-pow((vU - uDraw) / 0.04, 2.0)) * step(uDraw, 0.999); // the tip while it travels
  gl_FragColor = vec4(mix(c, uLight, clamp(head, 0.0, 1.0) * 0.8), 1.0);
  #include <colorspace_fragment>
}`;

function useBrand() {
  return useMemo(
    () => ({
      ink: new Color('#14142E').lerp(new Color('#F5F3EF'), 0.25),
      blue: token('blueDeep').multiplyScalar(0.92),
      green: token('greenDeep').multiplyScalar(0.92),
      light: token('blueLight'),
    }),
    [],
  );
}

function CrowdScene({ crowd }: { crowd: Crowd }) {
  const brand = useBrand();
  const pts = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(crowd.positions, 3));
    g.setAttribute('aT', new BufferAttribute(crowd.arrival, 1));
    g.setAttribute('aSeed', new BufferAttribute(crowd.seed, 1));
    const m = new ShaderMaterial({
      vertexShader: crowdVert,
      fragmentShader: crowdFrag,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uFront: { value: 0 },
        uTime: { value: 0 },
        uMouse: { value: new Vector2(99, 99) },
        uMouseOn: { value: 0 },
        uWaveO: { value: new Vector2() },
        uWaveR: { value: -1 },
        uPx: { value: 800 },
        uWin: { value: [W0, N0, E0, S0] },
        uInk: { value: brand.ink },
        uBlue: { value: brand.blue },
        uGreen: { value: brand.green },
        uLight: { value: brand.light },
      },
    });
    return { g, m };
  }, [crowd, brand]);
  const lines = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(crowd.edges.positions, 3));
    g.setAttribute('aT', new BufferAttribute(crowd.edges.arrival, 1));
    const m = new ShaderMaterial({
      vertexShader: edgeVert,
      fragmentShader: edgeFrag,
      transparent: true,
      depthWrite: false,
      uniforms: { uFront: { value: 0 }, uTime: { value: 0 }, uWin: { value: [W0, N0, E0, S0] }, uBlue: { value: brand.blue }, uGreen: { value: brand.green }, uLight: { value: brand.light } },
    });
    return { g, m };
  }, [crowd, brand]);
  const arcs = useMemo(
    () =>
      crowd.jumps.map((j, i) => {
        const a = new Vector3(j.from[0], 0.03, j.from[1]);
        const b = new Vector3(j.to[0], 0.03, j.to[1]);
        const mid = a.clone().lerp(b, 0.5);
        mid.y = 0.25 + a.distanceTo(b) * 0.2;
        const g = new TubeGeometry(new QuadraticBezierCurve3(a, mid, b), 80, 0.0085, 5, false);
        const m = new ShaderMaterial({
          vertexShader: arcVert,
          fragmentShader: arcFrag,
          uniforms: {
            uBlue: { value: brand.blue },
            uGreen: { value: brand.green },
            uLight: { value: brand.light },
            uDraw: { value: 0 },
            uTime: { value: 0 },
            uSeed: { value: i * 0.13 },
            uBoost: { value: 0 },
          },
        });
        return { g, m, j };
      }),
    [crowd, brand],
  );
  useEffect(
    () => () => {
      pts.g.dispose();
      pts.m.dispose();
      lines.g.dispose();
      lines.m.dispose();
      arcs.forEach((a) => (a.g.dispose(), a.m.dispose()));
    },
    [pts, lines, arcs],
  );
  useFrame(({ clock, size, camera, gl }) => {
    const t = clock.elapsedTime;
    const reduced = useApp.getState().reducedMotion;
    const front = shared.front;
    const u = pts.m.uniforms;
    u.uFront.value = front;
    u.uTime.value = reduced ? 0 : t;
    u.uMouse.value.set(mouse.world.x, mouse.world.z);
    u.uMouseOn.value = reduced ? 0 : mouse.on;
    const since = t - wave.at;
    u.uWaveO.value.copy(wave.origin);
    u.uWaveR.value = since < 3 && !reduced ? since * 7 : -1;
    const cam = camera as PerspectiveCamera;
    u.uPx.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan(MathUtils.degToRad(cam.fov) / 2));
    lines.m.uniforms.uFront.value = front;
    lines.m.uniforms.uTime.value = reduced ? 0 : t;
    arcs.forEach(({ m, j }) => {
      m.uniforms.uDraw.value = clamp((front - j.t0) / Math.max(j.t1 - j.t0, 1e-3), 0, 1.0);
      m.uniforms.uTime.value = t;
      m.uniforms.uBoost.value = since < 3.5 ? 0.6 * (1 - since / 3.5) : 0;
    });
  });

  return (
    <group>
      <lineSegments geometry={lines.g} material={lines.m} frustumCulled={false} />
      <points geometry={pts.g} material={pts.m} frustumCulled={false} />
      {arcs.map((a, i) => (
        <mesh key={i} geometry={a.g} material={a.m} frustumCulled={false} />
      ))}
    </group>
  );
}

/** The glossy logo at Hail, where it all starts. */
function Voice() {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const t = useApp.getState().reducedMotion ? 0 : clock.elapsedTime;
    const since = clock.elapsedTime - gesture.burstAt;
    g.current.position.y = 0.32 + Math.sin(t * 1.3) * 0.03;
    g.current.rotation.y = Math.sin(t * 0.5) * 0.3 - 0.15;
    g.current.scale.setScalar(0.3 * (1 + gesture.charge * 0.25 + (since > 0 ? Math.exp(-since * 6) * 0.3 : 0)));
  });
  return (
    <group ref={g} position={[0, 0.32, 0]}>
      <LogoMark cheap={false} />
    </group>
  );
}

// ── camera, gestures, labels, bubbles, HUD ────────────────────────────────────────────
const tmp = new Vector3();
const plane = new Plane(new Vector3(0, 1, 0), 0);
const raycaster = new Raycaster();
const CENTRE = new Vector3(toWorld(22.6, 45.4)[0], 0, toWorld(22.6, 45.4)[1]);

interface Pop {
  i: number;
  born: number;
  text: string;
}

function Rig({ crowd, link }: { crowd: Crowd; link: SpreadLink }) {
  const camera = useThree((s) => s.camera as PerspectiveCamera);
  const size = useThree((s) => s.size);
  const sm = useRef({ yaw: 0, px: 0, py: 0, lastFront: 0, timer: 0, feedTimer: 0, reached: new Set<string>() });
  const pops = useRef<(Pop | null)[]>([]);

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
      const r = el.getBoundingClientRect();
      mouse.inside = e.clientY >= Math.max(r.top, 0) && e.clientY <= Math.min(r.bottom, window.innerHeight);
      mouse.ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      sm.current.px = mouse.ndc.x;
      sm.current.py = mouse.ndc.y;
      if (!gesture.pressing && !gesture.dragging) return;
      gesture.moved = Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY);
      if (gesture.pressing && gesture.moved > 10) {
        gesture.pressing = false;
        gesture.dragging = e.pointerType === 'mouse';
      }
      if (gesture.dragging) gesture.yaw = clamp(gesture.startYaw + ((e.clientX - gesture.startX) / window.innerWidth) * 2.4, -1, 1);
    };
    const up = () => {
      gesture.pressing = false;
      gesture.dragging = false;
    };
    const leave = () => (mouse.inside = false);
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.documentElement.removeEventListener('pointerleave', leave);
      writeHold(0);
    };
  }, [link]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const t = clock.elapsedTime;
    const { reducedMotion: reduced, dir } = useApp.getState();
    const p = link.p;
    const s = sm.current;

    // the spread follows the scroll
    const front = smoothstep(p, 0.05, 0.88) * 1.03;
    shared.front = front;
    const scrolling = Math.abs(front - s.lastFront) > 1e-4;
    s.lastFront = front;
    shared.scrolling = scrolling;

    // camera: close over Hail (reads as the arrival) → pulled back, tilted, the whole region alive
    const zoom = ease(smoothstep(p, 0.05, 0.72));
    shared.zoom = zoom;
    const tilt = ease(smoothstep(p, 0.12, 0.78));
    const portrait = size.height > size.width;
    const dist = lerp(portrait ? 4.2 : 3.0, portrait ? 21 : 18.5, zoom);
    const polar = lerp(0.02, 0.7, tilt);
    if (!gesture.dragging) gesture.yaw = damp(gesture.yaw, 0, 0.9, dt);
    s.yaw = damp(s.yaw, gesture.yaw, 6, dt);
    // portrait: turn so the peninsula's long NW→SE diagonal runs down the tall screen
    const yaw = (portrait ? 0.78 * zoom : lerp(0, dir === 'rtl' ? 0.22 : -0.22, tilt)) + s.yaw + (reduced ? 0 : Math.sin(t * 0.06) * 0.05 * tilt) + s.px * 0.04 * tilt;
    const target = tmp.copy(CENTRE).multiplyScalar(zoom);
    camera.position.set(target.x + Math.sin(yaw) * Math.sin(polar) * dist, Math.cos(polar) * dist + s.py * 0.2 * tilt, target.z + Math.cos(yaw) * Math.sin(polar) * dist);
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
    camera.fov = portrait ? 44 : 36;
    // the region sits a little high: the funnel above, the hint below
    // landscape: the region leans to the end side, leaving the start side to the live feed
    const lean = portrait ? 0 : lerp(0, 0.07, zoom) * (dir === 'rtl' ? 1 : -1);
    camera.setViewOffset(size.width, size.height, size.width * lean, size.height * lerp(0, portrait ? -0.03 : 0.05, tilt), size.width, size.height);
    camera.updateProjectionMatrix();

    // project a world point to the section's frame
    const project = (x: number, y: number, z: number) => {
      tmp.set(x, y, z).project(camera);
      return { x: ((tmp.x + 1) / 2) * size.width, y: ((1 - tmp.y) / 2) * size.height, front: tmp.z < 1 };
    };

    // pointer on the ground
    raycaster.setFromCamera(mouse.ndc, camera);
    const hit = raycaster.ray.intersectPlane(plane, mouse.world);
    mouse.on = damp(mouse.on, mouse.inside && hit ? 1 : 0, 5, dt);

    // hold → broadcast from where you hold (or from Hail)
    if (gesture.pressing && !reduced) {
      gesture.charge = Math.min(1, gesture.charge + dt);
      if (gesture.charge >= 1) {
        gesture.burstAt = t;
        gesture.pressing = false;
        wave.at = t;
        if (hit && mouse.inside) wave.origin.set(mouse.world.x, mouse.world.z);
        else wave.origin.set(0, 0);
        s.timer = 0;
        for (let k = 0; k < link.bubbles.length; k++) spawn(k, true);
      }
    } else gesture.charge = Math.max(0, gesture.charge - dt * 2);
    writeHold(gesture.charge);

    // city name tags light up when the conversation arrives
    CITIES.forEach((c) => {
      const el = link.labels[c.key];
      if (!el) return;
      const city = crowd.cities[c.key];
      const on = smoothstep(front, city.t, city.t + 0.03) * smoothstep(p, 0.18, 0.3);
      const q = project(city.x, 0.12, city.z);
      el.style.opacity = q.front ? on.toFixed(3) : '0';
      el.style.transform = `translate(-50%, -130%) translate(${q.x.toFixed(1)}px, ${q.y.toFixed(1)}px)`;
    });

    // notification bubbles from people just reached (or anyone talking, when you stop scrolling)
    function spawn(k: number, broadcast = false) {
      for (let tries = 0; tries < 24; tries++) {
        const i = Math.floor(Math.random() * crowd.count);
        const at = crowd.arrival[i];
        const fresh = at <= front && at > front - 0.06;
        if (at > front || (!broadcast && scrolling && !fresh)) continue;
        const q = project(crowd.positions[i * 3], 0.1, crowd.positions[i * 3 + 2]);
        if (!q.front || q.x < size.width * 0.08 || q.x > size.width * 0.92 || q.y < size.height * 0.3 || q.y > size.height * 0.86) continue;
        pops.current[k] = { i, born: t + (broadcast ? Math.random() * 0.5 : 0), text: link.messages[Math.floor(Math.random() * link.messages.length)] };
        const el = link.bubbles[k];
        if (el) el.textContent = pops.current[k]!.text;
        return;
      }
    }
    s.timer -= dt;
    if (s.timer <= 0 && front > 0.03 && !reduced) {
      const free = link.bubbles.findIndex((_, k) => !pops.current[k]);
      if (free >= 0) spawn(free);
      s.timer = scrolling ? 0.35 + Math.random() * 0.3 : 1.1 + Math.random() * 0.8;
    }
    link.bubbles.forEach((el, k) => {
      const pop = pops.current[k];
      if (!el) return;
      if (!pop) {
        el.style.opacity = '0';
        return;
      }
      const age = t - pop.born;
      if (age > 2.6) {
        pops.current[k] = null;
        el.style.opacity = '0';
        return;
      }
      const q = project(crowd.positions[pop.i * 3], 0.12, crowd.positions[pop.i * 3 + 2]);
      const inA = clamp(age / 0.22, 0, 1);
      const out = clamp((2.6 - age) / 0.4, 0, 1);
      const sc = age < 0 ? 0 : 0.6 + 0.4 * (1 - Math.pow(1 - inA, 3)) + Math.sin(inA * Math.PI) * 0.08;
      el.style.opacity = age < 0 ? '0' : Math.min(inA, out).toFixed(3);
      el.style.transform = `translate(-10%, -120%) translate(${q.x.toFixed(1)}px, ${(q.y - inA * 10).toFixed(1)}px) scale(${sc.toFixed(3)})`;
    });

    // live feed: an event when the word reaches a city, then a steady trickle from cities already talking
    const reachedNow = CITIES.filter((c) => link.cityNames[c.key] && front >= crowd.cities[c.key].t);
    for (const c of reachedNow)
      if (!s.reached.has(c.key)) {
        s.reached.add(c.key);
        post(c.key);
      }
    for (const key of [...s.reached]) if (front < crowd.cities[key as keyof typeof crowd.cities].t) s.reached.delete(key);
    s.feedTimer -= dt;
    if (s.feedTimer <= 0 && reachedNow.length && !reduced) {
      post(reachedNow[Math.floor(Math.random() * reachedNow.length)].key);
      s.feedTimer = 1.4 + Math.random() * 1.2;
    }
    function post(key: string) {
      const list = link.feed;
      if (!list) return;
      const li = document.createElement('li');
      const dot = document.createElement('span');
      dot.className = 'wom-feed-dot';
      const msg = document.createElement('span');
      msg.textContent = link.messages[Math.floor(Math.random() * (link.messages.length - 1))];
      const where = document.createElement('span');
      where.className = 'wom-feed-city';
      where.textContent = link.cityNames[key];
      li.append(dot, msg, where);
      list.prepend(li);
      while (list.children.length > 5) list.lastElementChild?.remove();
    }

    // funnel HUD: Reach → Engagement → Conversion → Loyalty
    if (link.hud) {
      const stage = String(Math.min(3, Math.floor(clamp(front, 0, 0.999) * 4)));
      if (link.hud.dataset.stage !== stage) link.hud.dataset.stage = stage;
      link.hud.style.setProperty('--front', clamp(front, 0, 1).toFixed(3));
    }
    link.feed?.parentElement?.style.setProperty('--front', clamp(front, 0, 1).toFixed(3));
  });
  return null;
}

export default function WordOfMouth({ link, active }: { link: SpreadLink; active: boolean }) {
  const mobile = useApp((s) => s.mobile);
  const [crowd, setCrowd] = useState<Crowd | null>(null);
  useEffect(() => {
    let alive = true;
    buildCrowd(mobile ? 0.34 : 0.24).then((c) => alive && setCrowd(c));
    return () => {
      alive = false;
    };
  }, [mobile]);
  return (
    <Canvas
      aria-hidden="true"
      className="!absolute inset-0"
      dpr={[1, 1.75]}
      frameloop={active ? 'always' : 'never'}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: NeutralToneMapping }}
      camera={{ fov: 36, near: 0.05, far: 200, position: [0, 3, 0.05] }}
    >
      {crowd && (
        <>
          <Glow crowd={crowd} />
          <CrowdScene crowd={crowd} />
          <Influencers crowd={crowd} />
          <RisingBuzz crowd={crowd} />
          <Rig crowd={crowd} link={link} />
        </>
      )}
      <Voice />
      <Environment resolution={64} frames={1} environmentIntensity={1.2}>
        <Lightformer form="ring" intensity={2.4} position={[0, 7, 0]} rotation-x={Math.PI / 2} scale={8} />
        <Lightformer form="rect" intensity={1.8} position={[0, 3, 7]} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[0, 3, -7]} rotation-y={Math.PI} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1.3} color="#D6EEFA" position={[-7, 3, 0]} rotation-y={Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="circle" intensity={3} position={[4, 6, 4]} scale={2} />
      </Environment>
    </Canvas>
  );
}
