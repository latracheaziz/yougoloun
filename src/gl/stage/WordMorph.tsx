import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, CanvasTexture, Color, MathUtils, NeutralToneMapping, SRGBColorSpace, ShaderMaterial, Vector2, type Group, type Mesh, type MeshBasicMaterial, type PerspectiveCamera } from 'three';
import { token } from '../palette';
import { brand } from '@/config/palette';
import { useApp } from '@/store/app';
import { writeHold } from '@/interaction/hold';
import { prodGl } from '../Precompile';

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
/** The word's layout box (canvas px). Particles and the crisp text share it, so they line up exactly. */
const W_FULL = 1800;
const H_FULL = 520;

type Layout = { lines: string[]; size: number };
const fontOf = (family: string, px: number) => `700 ${px}px ${family}`;

/** Fit a word on one line, or two (split at the space nearest the middle); same size for every word. */
function layoutWord(text: string, family: string): Layout {
  const ctx = document.createElement('canvas').getContext('2d')!;
  let size = 230;
  let lines = [text];
  ctx.font = fontOf(family, size);
  if (ctx.measureText(text).width > W_FULL * 0.94) {
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
  ctx.font = fontOf(family, size);
  while (Math.max(...lines.map((l) => ctx.measureText(l).width)) > W_FULL * 0.94 || size * lines.length * 1.1 > H_FULL * 0.95) {
    size -= 8;
    ctx.font = fontOf(family, size);
  }
  return { lines, size };
}

/** Draw a laid-out word into `ctx` at `scale` (1 = the full W_FULL × H_FULL box). Returns the widest line (box px). */
function drawWord(ctx: CanvasRenderingContext2D, layout: Layout, family: string, scale: number, rtl: boolean, fill: string) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.font = fontOf(family, layout.size);
  ctx.fillStyle = fill;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = rtl ? 'rtl' : 'ltr';
  const lh = layout.size * 1.08;
  layout.lines.forEach((l, i) => ctx.fillText(l, W_FULL / 2, H_FULL / 2 + (i - (layout.lines.length - 1) / 2) * lh));
  const widest = Math.max(...layout.lines.map((l) => ctx.measureText(l).width));
  ctx.restore();
  return widest;
}

/**
 * The word as crisp text (shown while the morph is at rest — particles alone read as a fuzzy cloud).
 * "from" words: muted ink (the site's `.muted`); "to" words: brand navy + a brand-gradient underline
 * (blue/green stay shapes, never text on paper).
 */
function wordTexture(layout: Layout, family: string, rtl: boolean, to: boolean, scale: number) {
  const c = document.createElement('canvas');
  c.width = Math.round(W_FULL * scale);
  c.height = Math.round(H_FULL * scale);
  const ctx = c.getContext('2d')!;
  // opaque colours: a translucent fill darkens where joined Arabic letters overlap (ink 64% on paper = #656473)
  const widest = drawWord(ctx, layout, family, scale, rtl, to ? brand.navy : '#656473');
  if (to) {
    const lh = layout.size * 1.08;
    const y = (H_FULL / 2 + ((layout.lines.length - 1) / 2) * lh + layout.size * 0.62) * scale;
    const x0 = ((W_FULL - widest) / 2) * scale;
    const g = ctx.createLinearGradient(x0, 0, x0 + widest * scale, 0);
    g.addColorStop(0, brand.blue);
    g.addColorStop(1, brand.green);
    ctx.fillStyle = g;
    const h = Math.max(3, layout.size * 0.06 * scale);
    ctx.beginPath();
    ctx.roundRect(x0, y, widest * scale, h, h / 2);
    ctx.fill();
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Sample a word into `n` points (x, y, z), centred, height-normalised; shared `size` keeps letters equal. */
function sampleWord(layout: Layout, n: number, rtl: boolean, family: string, maxW: number) {
  // rasterised at 1/3 scale with every pixel sampled = the same density as full scale every 3 px,
  // with 9× fewer pixels to read back
  const R = 3;
  const W = W_FULL / R;
  const H = H_FULL / R;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  drawWord(ctx, layout, family, 1 / R, rtl, '#000');
  const data = ctx.getImageData(0, 0, W, H).data;
  const cand: number[] = [];
  const step = 1;
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (data[(y * W + x) * 4 + 3] > 140) cand.push(x * R, y * R);
  const out = new Float32Array(n * 3);
  const count = cand.length / 2;
  for (let i = 0; i < n; i++) {
    const k = Math.floor(Math.random() * count);
    const jx = (Math.random() - 0.5) * R;
    const jy = (Math.random() - 0.5) * R;
    out[i * 3] = ((cand[k * 2] + jx - (W * R) / 2) / maxW) * 2;
    out[i * 3 + 1] = (-(cand[k * 2 + 1] + jy - (H * R) / 2) / maxW) * 2;
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
uniform vec3 uInk; uniform vec3 uBlue; uniform vec3 uGreen; uniform vec3 uLight; uniform float uAlpha;
varying float vBrand; varying float vX; varying float vMid; varying float vDepth;
void main() {
  float r = length(gl_PointCoord - 0.5);
  if (r > 0.5) discard;
  float a = smoothstep(0.5, 0.32, r);
  vec3 brand = mix(uBlue, uGreen, vX);
  vec3 col = mix(uInk, brand, vBrand);
  col = mix(col, uLight, vMid * 0.35);
  col *= 1.0 - vDepth * 0.38; // the letters' back layers are in shadow
  // uAlpha: the particles step back to a faint sparkle while the crisp word is shown
  gl_FragColor = vec4(col, a * mix(0.75, 1.0, vBrand) * (1.0 - vDepth * 0.35) * uAlpha);
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
          uAlpha: { value: 1 },
          uInk: { value: new Color('#14142E').lerp(new Color('#F5F3EF'), 0.34) },
          uBlue: { value: token('blueDeep').multiplyScalar(0.95) },
          uGreen: { value: token('greenDeep').multiplyScalar(0.95) },
          uLight: { value: token('blueLight') },
        },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  // sample the six words (particles + crisp text) once the display font is ready
  const gl = useThree((s) => s.gl);
  const [textures, setTextures] = useState<CanvasTexture[]>([]);
  useEffect(() => {
    let alive = true;
    const made: CanvasTexture[] = [];
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    const family = getComputedStyle(document.documentElement).getPropertyValue('--font-display') || 'sans-serif';
    // the canvas draws with the font only once it's loaded (a canvas never triggers the download itself)
    Promise.all(words.slice(0, WORDS).map((w) => document.fonts.load(fontOf(family, 60), w)))
      .catch(() => {})
      .then(async () => {
        if (!alive) return;
        const rtl = dir === 'rtl';
        const texScale = mobile ? 0.85 : 1; // phones: ~620 css px × DPR 2 wide
        const g = new BufferGeometry();
        // one word per frame (sample + crisp text + its upload): no single long task
        for (const [i, w] of words.slice(0, WORDS).entries()) {
          const layout = layoutWord(w, family);
          g.setAttribute(`aW${i}`, new BufferAttribute(sampleWord(layout, n, rtl, family, W_FULL), 3));
          const tex = wordTexture(layout, family, rtl, i % 2 === 1, texScale);
          gl.initTexture(tex);
          made.push(tex);
          await frame();
          if (!alive) return;
        }
        const rand = new Float32Array(n * 4);
        for (let i = 0; i < n; i++) rand.set([i / n, Math.random(), Math.random(), Math.random()], i * 4);
        g.setAttribute('aRand', new BufferAttribute(rand, 4));
        g.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3)); // unused (bounds)
        setGeometry(g);
        setTextures(made);
      });
    return () => {
      alive = false;
      made.forEach((tex) => tex.dispose());
    };
  }, [words, n, dir, mobile, gl]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  const plane = useRef<Mesh>(null);
  const shown = useRef(-1);

  // pointer + hold on the section
  const ptr = useRef({ ndc: new Vector2(9, 9), inside: false, pressing: false, charge: 0, burst: 0 });
  useEffect(() => {
    if (!surface) return;
    const move = (e: PointerEvent) => {
      const w = surface.clientWidth || 1;
      const h = surface.clientHeight || 1;
      ptr.current.ndc.set((e.offsetX / w) * 2 - 1, -(e.offsetY / h) * 2 + 1);
      ptr.current.inside = true;
    };
    const leave = () => (ptr.current.inside = false);
    const down = (e: PointerEvent) => {
      if (e.button === 0 && !(e.target as Element).closest('a, button')) ptr.current.pressing = true;
    };
    const up = () => (ptr.current.pressing = false);
    surface.addEventListener('pointermove', move, { passive: true });
    surface.addEventListener('pointerleave', leave);
    surface.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      surface.removeEventListener('pointermove', move);
      surface.removeEventListener('pointerleave', leave);
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
    // at rest on a word (the stage holds on whole numbers while you read): the crisp word shows and the
    // particles step back to a faint sparkle; as the morph starts it dissolves into them, and back
    const k = Math.round(link.stage);
    const rest = 1 - MathUtils.smoothstep(Math.abs(link.stage - k), 0.02, 0.14);
    const text = rest * (1 - p.burst);
    u.uAlpha.value = MathUtils.lerp(1, 0.04, text);
    const m = plane.current;
    if (m) {
      const mat = m.material as MeshBasicMaterial;
      const tex = textures[clamp(k, 0, WORDS - 1)];
      if (tex && shown.current !== k) {
        mat.map = tex;
        mat.needsUpdate = true;
        shown.current = k;
      }
      mat.opacity = tex ? text : 0;
      m.visible = mat.opacity > 0.002;
      m.scale.setScalar(u.uScale.value);
    }
    // the word tilts in 3D with the mouse
    if (group.current) {
      // a slow sway shows the letters' depth even without the mouse
      const t = clock.elapsedTime;
      // (kept small: the crisp word must stay easy to read)
      const swayY = Math.sin(t * 0.45) * 0.05 * (1 - on.current);
      const swayX = Math.sin(t * 0.33 + 1) * 0.02 * (1 - on.current);
      group.current.rotation.y = damp(group.current.rotation.y, reduced ? 0 : p.ndc.x * 0.2 * on.current + swayY, 4, dt);
      group.current.rotation.x = damp(group.current.rotation.x, reduced ? 0 : -p.ndc.y * 0.12 * on.current + swayX, 4, dt);
    }
  });

  return (
    <group ref={group}>
      {geometry && <points geometry={geometry} material={material} frustumCulled={false} />}
      {/* the crisp word, in the same box as the particles (W_FULL × H_FULL → 2 × 2·H/W units, × uScale) */}
      <mesh ref={plane} renderOrder={1} visible={false}>
        <planeGeometry args={[2, (2 * H_FULL) / W_FULL]} />
        <meshBasicMaterial transparent depthWrite={false} toneMapped={false} opacity={0} />
      </mesh>
    </group>
  );
}

export default function WordMorph({ words, link, active, surface, className }: { words: string[]; link: MorphLink; active: boolean; surface: HTMLElement | null; className?: string }) {
  return (
    <Canvas
      aria-hidden="true"
      className={className}
      dpr={[1, 1.75]}
      frameloop={active ? 'always' : 'never'}
      resize={{ scroll: false }}
      onCreated={prodGl}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: NeutralToneMapping }}
      camera={{ fov: 30, near: 0.1, far: 60, position: [0, 0, 10] }}
    >
      <Particles words={words} link={link} surface={surface} />
    </Canvas>
  );
}

export const clampStage = (v: number) => clamp(v, 0, WORDS - 1);
