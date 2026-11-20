import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  LatheGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  type Group,
  type Mesh,
  type Points,
} from 'three';
import terrainVert from '../shaders/terrain.vert?raw';
import terrainFrag from '../shaders/terrain.frag?raw';
import skyVert from '../shaders/skydome.vert?raw';
import skyFrag from '../shaders/skydome.frag?raw';
import sphereVert from '../shaders/sphere.vert?raw';
import pinFrag from '../shaders/pin.frag?raw';
import quadVert from '../shaders/quad.vert?raw';
import pulseFrag from '../shaders/pulse.frag?raw';
import beamFrag from '../shaders/beam.frag?raw';
import sandVert from '../shaders/sand.vert?raw';
import sandFrag from '../shaders/sand.frag?raw';
import { noiseTexture } from '../dive/noise';
import { token } from '../palette';
import { GALACTIC_NORMAL } from '../space/Stars';
import { hail, world } from '../state';
import type { TerrainResult } from './terrainGen';
import { HAIL_SUN } from './palette';
import { useApp } from '@/store/app';
import { qualityPresets } from '@/config/quality';

export const TERRAIN_SIZE = 1800;

// ── terrain ─────────────────────────────────────────────────────────────────────────
function Terrain() {
  const mobile = useApp((s) => s.mobile);
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('./terrain.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<TerrainResult>) => {
      const r = e.data;
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(r.positions, 3));
      g.setAttribute('normal', new BufferAttribute(r.normals, 3));
      g.setAttribute('aColor', new BufferAttribute(r.colors, 3));
      g.setAttribute('aShadow', new BufferAttribute(r.shadow, 1));
      g.setIndex(new BufferAttribute(r.index, 1));
      g.computeBoundingSphere();
      hail.groundAtPin = r.groundAtPin;
      setGeometry(g);
      worker.terminate();
    };
    const sun = HAIL_SUN;
    worker.postMessage({ size: TERRAIN_SIZE, segments: mobile ? 150 : 288, sun: [sun.x, sun.y, sun.z] });
    return () => worker.terminate();
  }, [mobile]);

  useEffect(() => {
    if (geometry) world.hailReady = true;
    return () => {
      world.hailReady = false;
      geometry?.dispose();
    };
  }, [geometry]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: terrainVert,
        fragmentShader: terrainFrag,
        uniforms: {
          uNoise: { value: noiseTexture() },
          uLightDir: { value: hail.lightDirection },
          uLightColor: { value: hail.lightColor },
          uAmbientSky: { value: hail.ambientSky },
          uAmbientGround: { value: hail.ambientGround },
          uFogColor: { value: hail.skyHorizon },
          uSunColor: { value: hail.sunColor },
          uSunDir: { value: hail.sunDirection },
          uNight: { value: 0 },
          uFogDensity: { value: 0.00105 },
          uHaze: { value: 1 },
        },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    material.uniforms.uNight.value = hail.night;
    material.uniforms.uHaze.value = hail.haze;
  });

  return geometry ? <mesh geometry={geometry} material={material} /> : null;
}

// ── sky dome ────────────────────────────────────────────────────────────────────────
function SkyDome() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: BackSide,
        depthWrite: false,
        uniforms: {
          uZenith: { value: hail.skyZenith },
          uHorizon: { value: hail.skyHorizon },
          uGround: { value: hail.skyGround },
          uSunColor: { value: hail.sunColor },
          uSunDir: { value: hail.sunDirection },
          uGalaxyNormal: { value: GALACTIC_NORMAL },
          uGalaxyColor: { value: token('haze').lerp(token('sand'), 0.4).multiplyScalar(0.16) },
          uNight: { value: 0 },
        },
      }),
    [],
  );
  const geometry = useMemo(() => new SphereGeometry(1500, 48, 24), []);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const ref = useRef<Mesh>(null);
  useFrame(({ camera }) => {
    ref.current?.position.copy(camera.position);
    material.uniforms.uNight.value = hail.night;
  });
  return <mesh ref={ref} geometry={geometry} material={material} renderOrder={-10} frustumCulled={false} />;
}

// ── pin ─────────────────────────────────────────────────────────────────────────────
const PIN_PROFILE = [
  [0, 0], [0.5, 1.2], [1.15, 2.9], [1.85, 4.6], [2.35, 6.2], [2.5, 7.3], [2.38, 8.3], [1.95, 9.15], [1.25, 9.7], [0.5, 9.95], [0, 10],
].map(([x, y]) => new Vector2(x, y));

const easeOutBounce = (t: number) => {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};

function Pin() {
  const pinGeometry = useMemo(() => new LatheGeometry(PIN_PROFILE, 48), []);
  const pinMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: sphereVert,
        fragmentShader: pinFrag,
        uniforms: {
          uColor: { value: token('ember') },
          uRim: { value: token('glow') },
          uLightDir: { value: hail.lightDirection },
          uLightColor: { value: hail.lightColor },
          uAmbient: { value: hail.ambientSky },
          uGlow: { value: 0 },
        },
      }),
    [],
  );
  const ringMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: quadVert,
        fragmentShader: pulseFrag,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
        uniforms: { uColor: { value: token('ember') }, uIntensity: { value: 0 }, uTime: { value: 0 } },
      }),
    [],
  );
  const beamMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: quadVert,
        fragmentShader: beamFrag,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
        uniforms: { uColor: { value: token('glow') }, uIntensity: { value: 0 } },
      }),
    [],
  );
  useEffect(
    () => () => {
      pinGeometry.dispose();
      pinMaterial.dispose();
      ringMaterial.dispose();
      beamMaterial.dispose();
    },
    [pinGeometry, pinMaterial, ringMaterial, beamMaterial],
  );

  const pin = useRef<Group>(null);
  const base = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = hail.pinDrop;
    const landed = Math.min(1, Math.max(0, (t - 0.55) / 0.45));
    if (pin.current) {
      pin.current.visible = t > 0;
      pin.current.position.y = hail.groundAtPin + 95 * (1 - easeOutBounce(Math.min(1, t)));
      pin.current.rotation.y = clock.elapsedTime * 0.6 + (1 - t) * 4;
    }
    if (base.current) base.current.position.y = hail.groundAtPin;
    pinMaterial.uniforms.uGlow.value = landed * (0.6 + 0.4 * hail.night);
    ringMaterial.uniforms.uIntensity.value = landed * 1.2;
    ringMaterial.uniforms.uTime.value = clock.elapsedTime;
    beamMaterial.uniforms.uIntensity.value = landed * (0.35 + 0.65 * hail.night);
  });

  return (
    <group>
      <group ref={pin}>
        <mesh geometry={pinGeometry} material={pinMaterial} />
      </group>
      <group ref={base}>
        <mesh material={ringMaterial} rotation-x={-Math.PI / 2} position-y={0.35} renderOrder={5}>
          <planeGeometry args={[46, 46]} />
        </mesh>
        <mesh material={beamMaterial} position-y={70} renderOrder={5}>
          <cylinderGeometry args={[0.45, 0.45, 140, 12, 1, true]} />
        </mesh>
      </group>
    </group>
  );
}

// ── sand ────────────────────────────────────────────────────────────────────────────
function SandDrift() {
  const tier = useApp((s) => s.tier);
  const count = Math.round(1600 * qualityPresets[tier].particles);
  const geometry = useMemo(() => {
    let s = 9001;
    const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const pos = new Float32Array(count * 3);
    const speed = new Float32Array(count);
    const size = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos.set([(rand() - 0.5) * 400, rand() * rand() * 16, (rand() - 0.5) * 400], i * 3);
      speed[i] = 0.6 + rand() * 1.4;
      size[i] = 0.6 + rand() * 1.8;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aSpeed', new BufferAttribute(speed, 1));
    g.setAttribute('aSize', new BufferAttribute(size, 1));
    return g;
  }, [count]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: sandVert,
        fragmentShader: sandFrag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uColor: { value: token('glow') }, uOpacity: { value: 1 } },
      }),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  const ref = useRef<Points>(null);
  useFrame(({ clock, viewport }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uPixelRatio.value = viewport.dpr;
    material.uniforms.uOpacity.value = hail.sand * (0.55 - 0.35 * hail.night);
    if (ref.current) {
      ref.current.visible = hail.sand > 0.01;
      ref.current.position.y = hail.groundAtPin;
    }
  });
  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={6} />;
}

/** The Hail world: terrain, sky, pin and sand. Lazy-loaded; terrain is generated in a worker. */
export default function HailWorld() {
  const root = useRef<Group>(null);
  useFrame(() => {
    if (root.current) root.current.visible = world.current === 'hail';
  });
  return (
    <group ref={root} visible={false}>
      <SkyDome />
      <Terrain />
      <Pin />
      <SandDrift />
    </group>
  );
}
