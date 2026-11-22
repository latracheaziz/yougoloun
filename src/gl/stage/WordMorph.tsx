import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, Color, MathUtils, NeutralToneMapping, ShaderMaterial, Vector2, type Group, type PerspectiveCamera } from 'three';
import { token } from '../palette';
import { useApp } from '@/store/app';
import { writeHold } from '@/interaction/hold';

/**
 * FROM → TO, IN PARTICLES. The positioning statements' words are drawn with the site's display font,
 * sampled into thousands of particles, and morphed with scroll: "Visibility" dissolves, swirls through
 * depth and re-forms as "To Conversion", turning from muted ink into the brand gradient; then the next
 * statement's word forms. Cursor: particles flee and spring back · the word tilts in 3D with the mouse ·
 * HOLD: the word explodes, release: it re-assembles.
 *
 * `link.stage` runs 0 → 5 over the six words (from₀, to₀, from₁, to₁, from₂, to₂).
 */

const { clamp, damp } = MathUtils;
const WORDS = 6;

/** Sample a word into `n` points (x, y, z), centred, height-normalised; shared `size` keeps letters equal. */
function sampleWord(text: string, n: number, rtl: boolean, family: string, maxW: number) {
  const W = 1800;
  const H = 520;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  let size = 230;
  const font = (px: number) => `600 ${px}px ${family}`;
  // fit on one line, or break into two at the space nearest the middle
  let lines = [text];
  ctx.font = font(size);
  if (ctx.measureText(text).width > W * 0.94) {
    const words = text.split(' ');
    if (words.length > 1) {
      let best = 1;
      let bestDiff = Infinity;
      for (let k = 1; k < words.length; k++) {
        const d = Math.abs(ctx.measureText(words.slice(0, k).join(' ')).width - ctx.measureText(words.slice(k).join(' ')).width);
        if (d < bestDiff) {
          bestDiff = d;
          best = k;
        }
      }
      lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
    }
    size = 200;
  }
  ctx.font = font(size);
  while (Math.max(...lines.map((l) => ctx.measureText(l).width)) > W * 0.94 || size * lines.length * 1.1 > H * 0.95) {
    size -= 8;
    ctx.font = font(size);
  }
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = rtl ? 'rtl' : 'ltr';
  const lh = size * 1.08;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * lh));
  const data = ctx.getImageData(0, 0, W, H).data;
  const cand: number[] = [];
  const step = 3;
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (data[(y * W + x) * 4 + 3] > 140) cand.push(x, y);
  const out = new Float32Array(n * 3);
  const count = cand.length / 2;
  for (let i = 0; i < n; i++) {
    const k = Math.floor(Math.random() * count);
    const jx = (Math.random() - 0.5) * step;
    const jy = (Math.random() - 0.5) * step;
    out[i * 3] = ((cand[k * 2] + jx - W / 2) / maxW) * 2;
    out[i * 3 + 1] = (-(cand[k * 2 + 1] + jy - H / 2) / maxW) * 2;
    // extruded: particles fill the letters' thickness (seen when the word tilts)
    out[i * 3 + 2] = -Math.pow(Math.random(), 1.6) * 0.07;
  }
  // order by x so the morph flows across the word (reading direction)
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => (rtl ? out[b * 3] - out[a * 3] : out[a * 3] - out[b * 3]));
  const sorted = new Float32Array(n * 3);
  idx.forEach((src, dst) => sorted.set(out.subarray(src * 3, src * 3 + 3), dst * 3));
  return sorted;
}

const vert = /* glsl */ `
attribute vec3 aW0; attribute vec3 aW1; attribute vec3 aW2; attribute vec3 aW3; attribute vec3 aW4; attribute vec3 aW5;
attribute vec4 aRand;
uniform float uStage; uniform float uTime; uniform vec2 uMouse; uniform float uMouseOn; uniform float uBurst; uniform float uScale; uniform float uPx;
varying float vBrand; varying float vX; varying float vMid; varying float vDepth;
vec3 wordAt(int k) {
  if (k == 0) return aW0; if (k == 1) return aW1; if (k == 2) return aW2;
  if (k == 3) return aW3; if (k == 4) return aW4; return aW5;
}
void main() {
  int k = int(floor(clamp(uStage, 0.0, 4.999)));
  float f = clamp(uStage - float(k), 0.0, 1.0);
  // staggered along the reading direction, eased
  float d = aRand.x * 0.45;
  float fp = smoothstep(d, d + 0.55, f);
  fp = fp * fp * (3.0 - 2.0 * fp);
  vec3 a = wordAt(k) * uScale;
  vec3 b = wordAt(min(k + 1, 5)) * uScale;
  vec3 p = mix(a, b, fp);
  vDepth = clamp(-p.z / (0.07 * uScale), 0.0, 1.0);
  // mid-flight: the particles swirl out through depth
  float mid = sin(fp * 3.14159);
  float ph = aRand.y * 6.2832;
  p += vec3(cos(ph + uTime * 0.8) * 0.9, sin(ph * 1.3 + uTime * 0.7) * 0.6, sin(ph * 0.7) * 2.2 + 0.6) * mid * (0.4 + aRand.z);
  // idle shimmer
  p += vec3(sin(uTime * 1.3 + ph), cos(uTime * 1.1 + ph * 1.7), 0.0) * 0.008;
  // the cursor pushes particles away; they spring back
  vec2 dm = p.xy - uMouse;
  float dl = length(dm);
  float push = (1.0 - smoothstep(0.0, 0.9, dl)) * uMouseOn;
  p.xy += normalize(dm + 1e-4) * push * 0.45;
  p.z += push * 0.6;
  // hold: the word explodes
  p += vec3(normalize(dm + 1e-4) * (0.6 + aRand.w * 2.4), (aRand.z - 0.5) * 4.0) * uBurst;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = (0.036 + aRand.w * 0.02 + mid * 0.012) * uPx / -mv.z;
  gl_Position = projectionMatrix * mv;
  // odd words are the "to" words: brand colours; even ones ("from"): muted ink
  float brandA = mod(float(k), 2.0);
  float brandB = mod(float(k + 1), 2.0);
  vBrand = mix(brandA, brandB, fp);
  vX = clamp(p.x / (uScale * 2.2) + 0.5, 0.0, 1.0);
  vMid = mid;
}`;

const frag = /* glsl */ `
uniform vec3 uInk; uniform vec3 uBlue; uniform vec3 uGreen; uniform vec3 uLight;
varying float vBrand; varying float vX; varying float vMid; varying float vDepth;
void main() {
  float r = length(gl_PointCoord - 0.5);
  if (r > 0.5) discard;
  float a = smoothstep(0.5, 0.32, r);
  vec3 brand = mix(uBlue, uGreen, vX);
  vec3 col = mix(uInk, brand, vBrand);
  col = mix(col, uLight, vMid * 0.35);
  col *= 1.0 - vDepth * 0.38; // the letters' back layers are in shadow
  gl_FragColor = vec4(col, a * mix(0.6, 1.0, vBrand) * (1.0 - vDepth * 0.35));
  #include <colorspace_fragment>
}`;

export interface MorphLink {
  /** 0 → 5 across the six words. */
  stage: number;
}

function Particles({ words, link, surface }: { words: string[]; link: MorphLink; surface: HTMLElement | null }) {
  const { dir, mobile } = useApp.getState();
  const n = mobile ? 6500 : 14000;
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uStage: { value: 0 },
          uTime: { value: 0 },
          uMouse: { value: new Vector2(99, 99) },
          uMouseOn: { value: 0 },
          uBurst: { value: 0 },
          uScale: { value: 1 },
          uPx: { value: 800 },
          uInk: { value: new Color('#14142E').lerp(new Color('#F5F3EF'), 0.42) },
          uBlue: { value: token('blueDeep').multiplyScalar(0.95) },
          uGreen: { value: token('greenDeep').multiplyScalar(0.95) },
          uLight: { value: token('blueLight') },
        },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  // sample the six words once the display font is ready
  useEffect(() => {
    let alive = true;
    document.fonts.ready.then(() => {
      if (!alive) return;
      const family = getComputedStyle(document.documentElement).getPropertyValue('--font-display') || 'sans-serif';
      const rtl = dir === 'rtl';
      const g = new BufferGeometry();
      words.slice(0, WORDS).forEach((w, i) => g.setAttribute(`aW${i}`, new BufferAttribute(sampleWord(w, n, rtl, family, 1800), 3)));
      const rand = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) rand.set([i / n, Math.random(), Math.random(), Math.random()], i * 4);
      g.setAttribute('aRand', new BufferAttribute(rand, 4));
      g.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3)); // unused (bounds)
      setGeometry(g);
    });
    return () => {
      alive = false;
    };
  }, [words, n, dir]);
  useEffect(() => () => geometry?.dispose(), [geometry]);

  // pointer + hold on the section
  const ptr = useRef({ ndc: new Vector2(9, 9), inside: false, pressing: false, charge: 0, burst: 0 });
  useEffect(() => {
    if (!surface) return;
    const move = (e: PointerEvent) => {
      const r = surface.getBoundingClientRect();
      ptr.current.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ptr.current.inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    };
    const down = (e: PointerEvent) => {
      if (e.button === 0 && !(e.target as Element).closest('a, button')) ptr.current.pressing = true;
    };
    const up = () => (ptr.current.pressing = false);
    window.addEventListener('pointermove', move, { passive: true });
    surface.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      surface.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      writeHold(0);
    };
  }, [surface]);

  const size = useThree((s) => s.size);
  const group = useRef<Group>(null);
  const on = useRef(0);
  useFrame(({ clock, camera, gl }, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const reduced = useApp.getState().reducedMotion;
    const u = material.uniforms;
    const cam = camera as PerspectiveCamera;
    u.uTime.value = reduced ? 0 : clock.elapsedTime;
    u.uStage.value = link.stage;
    // fit the words in the view (height-normalised words, max two lines)
    const viewH = 2 * cam.position.z * Math.tan(MathUtils.degToRad(cam.fov) / 2);
    const viewW = viewH * (size.width / size.height);
    u.uScale.value = Math.min((viewW * 0.94) / 2, (viewH * 0.92) / (2 * (520 / 1800)));
    u.uPx.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan(MathUtils.degToRad(cam.fov) / 2));
    // pointer on the z = 0 plane
    const p = ptr.current;
    u.uMouse.value.set((p.ndc.x * viewW) / 2, (p.ndc.y * viewH) / 2);
    on.current = damp(on.current, p.inside && !reduced ? 1 : 0, 6, dt);
    u.uMouseOn.value = on.current;
    // hold → burst, release → re-assemble
    if (p.pressing && !reduced) p.charge = Math.min(1, p.charge + dt * 1.4);
    else p.charge = Math.max(0, p.charge - dt * 2.5);
    p.burst = damp(p.burst, p.pressing ? p.charge : 0, p.pressing ? 3 : 4, dt);
    u.uBurst.value = p.burst;
    writeHold(p.charge);
    // the word tilts in 3D with the mouse
    if (group.current) {
      // a slow sway shows the letters' depth even without the mouse
      const t = clock.elapsedTime;
      const swayY = Math.sin(t * 0.45) * 0.16 * (1 - on.current);
      const swayX = Math.sin(t * 0.33 + 1) * 0.06 * (1 - on.current);
      group.current.rotation.y = damp(group.current.rotation.y, reduced ? 0 : p.ndc.x * 0.32 * on.current + swayY, 4, dt);
      group.current.rotation.x = damp(group.current.rotation.x, reduced ? 0 : -p.ndc.y * 0.2 * on.current + swayX, 4, dt);
    }
  });

  return <group ref={group}>{geometry && <points geometry={geometry} material={material} frustumCulled={false} />}</group>;
}

export default function WordMorph({ words, link, active, surface, className }: { words: string[]; link: MorphLink; active: boolean; surface: HTMLElement | null; className?: string }) {
  return (
    <Canvas
      aria-hidden="true"
      className={className}
      dpr={[1, 1.75]}
      frameloop={active ? 'always' : 'never'}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: NeutralToneMapping }}
      camera={{ fov: 30, near: 0.1, far: 60, position: [0, 0, 10] }}
    >
      <Particles words={words} link={link} surface={surface} />
    </Canvas>
  );
}

export const clampStage = (v: number) => clamp(v, 0, WORDS - 1);
