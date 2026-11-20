import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  MathUtils,
  Quaternion,
  ShaderMaterial,
  Vector3,
  type Group,
} from 'three';
import quadVert from './shaders/quad.vert?raw';
import pulseFrag from './shaders/pulse.frag?raw';
import { latLonToVec3, spinToFace } from './geo';
import { ARCS, HAIL_LOCAL } from './space/arcData';
import { Glow } from './space/Glow';
import { token } from './palette';
import { useApp } from '@/store/app';

const DOT_VERT = `
uniform float uSize;
uniform float uPixelRatio;
varying float vFacing;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * position);
  vFacing = dot(n, normalize(-mv.xyz));
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPixelRatio * (3.0 / -mv.z);
}`;
const DOT_FRAG = `
uniform vec3 uColor;
varying float vFacing;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5 || vFacing < 0.0) discard;
  float a = smoothstep(0.5, 0.35, d) * mix(0.25, 0.75, smoothstep(0.0, 0.6, vFacing));
  gl_FragColor = vec4(uColor, a);
}`;

/** Land as dots: a Fibonacci sphere, keeping the points that fall on land in the ocean mask. */
function useLandDots(count: number) {
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.src = '/textures/earth/sd/ocean.webp';
    img.decode().then(() => {
      if (!alive) return;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const out: number[] = [];
      const golden = Math.PI * (3 - Math.sqrt(5));
      const v = new Vector3();
      for (let i = 0; i < count; i++) {
        const y = 1 - (i / (count - 1)) * 2;
        const lat = Math.asin(y) * MathUtils.RAD2DEG;
        const lon = ((((i * golden) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) * MathUtils.RAD2DEG - 180;
        const px = Math.min(width - 1, Math.floor(((lon + 180) / 360) * width));
        const py = Math.min(height - 1, Math.floor(((90 - lat) / 180) * height));
        if (data[(py * width + px) * 4] > 110) continue; // ocean
        latLonToVec3(lat, lon, 1, v);
        out.push(v.x, v.y, v.z);
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(new Float32Array(out), 3));
      setGeometry(g);
    });
    return () => {
      alive = false;
    };
  }, [count]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  return geometry;
}

function Globe({ drag }: { drag: { x: number; y: number; vx: number; vy: number; active: boolean } }) {
  const mobile = useApp((s) => s.mobile);
  const reduced = useApp((s) => s.reducedMotion);
  const dots = useLandDots(mobile ? 6000 : 11000);
  const paper = useMemo(() => token('paper'), []);
  const ember = useMemo(() => token('ember'), []);
  const glow = useMemo(() => token('glow'), []);
  const ink = useMemo(() => token('ink'), []);

  const dotMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: DOT_VERT,
        fragmentShader: DOT_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: { uColor: { value: paper }, uSize: { value: 4.2 }, uPixelRatio: { value: 1 } },
      }),
    [paper],
  );
  const pulseMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: quadVert,
        fragmentShader: pulseFrag,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
        uniforms: { uColor: { value: ember }, uIntensity: { value: 1.2 }, uTime: { value: 0 } },
      }),
    [ember],
  );
  useEffect(
    () => () => {
      dotMaterial.dispose();
      pulseMaterial.dispose();
    },
    [dotMaterial, pulseMaterial],
  );

  const arcs = useMemo(() => ARCS.map((c) => c.getPoints(48).map((p) => p.multiplyScalar(1.004))), []);
  const ringAt = useMemo(() => HAIL_LOCAL.clone().multiplyScalar(1.003), []);
  const ringQuat = useMemo(() => new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), HAIL_LOCAL.clone().normalize()), []);
  const pinAt = useMemo(() => HAIL_LOCAL.clone().multiplyScalar(1.01), []);

  const spin = useRef<Group>(null);
  const tilt = useRef<Group>(null);
  const base = { y: spinToFace(42), x: 26 * MathUtils.DEG2RAD };

  useFrame(({ clock, viewport }, delta) => {
    const dt = Math.min(delta, 1 / 20);
    dotMaterial.uniforms.uPixelRatio.value = viewport.dpr;
    pulseMaterial.uniforms.uTime.value = clock.elapsedTime;
    if (!drag.active) {
      drag.y += drag.vy * dt * 60;
      drag.x += drag.vx * dt * 60;
      drag.vy *= 0.94;
      drag.vx *= 0.9;
      if (!reduced) drag.y += dt * 0.06;
      drag.x = MathUtils.damp(drag.x, 0, 1.2, dt);
    }
    drag.x = MathUtils.clamp(drag.x, -0.6, 0.6);
    if (spin.current) spin.current.rotation.y = base.y + drag.y;
    if (tilt.current) tilt.current.rotation.x = base.x + drag.x;
  });

  return (
    <group ref={tilt}>
      <group ref={spin}>
        <mesh>
          <sphereGeometry args={[0.992, 64, 32]} />
          <meshBasicMaterial color={ink} />
        </mesh>
        {dots && <points geometry={dots} material={dotMaterial} />}
        {arcs.map((points, i) => (
          <Line key={i} points={points} color={ember} lineWidth={1.1} transparent opacity={0.75} />
        ))}
        <mesh position={ringAt} quaternion={ringQuat} material={pulseMaterial}>
          <planeGeometry args={[0.2, 0.2]} />
        </mesh>
        <Glow position={pinAt} color={glow} size={mobile ? 30 : 38} intensity={() => 1.4} />
      </group>
    </group>
  );
}

/** Dotted globe for the contact section: drag to rotate, Hail glowing, the city arcs again. */
export default function MiniGlobe() {
  const drag = useRef({ x: 0, y: 0, vx: 0, vy: 0, active: false }).current;
  const wrap = useRef<HTMLDivElement>(null);
  const dir = useApp((s) => s.dir);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let lx = 0;
    let ly = 0;
    const down = (e: PointerEvent) => {
      drag.active = true;
      lx = e.clientX;
      ly = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag.active) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      drag.vy = dx * 0.006;
      drag.vx = dy * 0.004;
      drag.y += drag.vy;
      drag.x += drag.vx;
    };
    const up = (e: PointerEvent) => {
      drag.active = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [drag, dir]);

  return (
    <div ref={wrap} aria-hidden="true" className="absolute inset-0 touch-pan-y">
      <Canvas dpr={[1, 2]} flat camera={{ fov: 35, position: [0, 0, 3.6] }} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}>
        <Globe drag={drag} />
      </Canvas>
    </div>
  );
}
