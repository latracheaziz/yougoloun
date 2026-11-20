import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial, Vector3, type Points } from 'three';
import starsVert from '../shaders/stars.vert?raw';
import starsFrag from '../shaders/stars.frag?raw';
import { token } from '../palette';
import { useApp } from '@/store/app';
import { qualityPresets } from '@/config/quality';

/** Normal of the galactic plane (stars bunch up along it). */
export const GALACTIC_NORMAL = new Vector3(0.84, 0.3, 0.45).normalize();

/** Deterministic PRNG so the sky is identical on every visit and every quality tier. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Starfield: one draw call, soft twinkle, a faint galactic band. */
export function Stars() {
  const tier = useApp((s) => s.tier);
  const count = qualityPresets[tier].stars;

  const geometry = useMemo(() => {
    const rand = mulberry32(27_5219);
    const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const warm = token('accentLight');
    const cool = new Color('#a9c6ff');
    const white = new Color('#ffffff');
    const band = GALACTIC_NORMAL;
    const dir = new Vector3();
    const c = new Color();

    for (let i = 0; i < count; i++) {
      dir.set(gauss(), gauss(), gauss()).normalize();
      if (i < count * 0.38) {
        dir.addScaledVector(band, -dir.dot(band)).addScaledVector(band, gauss() * 0.11).normalize();
      }
      const r = 90 + rand() * 110;
      positions.set([dir.x * r, dir.y * r, dir.z * r], i * 3);

      const roll = rand();
      const size = roll < 0.72 ? 1 + rand() * 0.9 : roll < 0.96 ? 1.9 + rand() * 1.3 : 3.2 + rand() * 2.6;
      sizes[i] = size;
      phases[i] = rand();

      c.copy(white).lerp(rand() < 0.5 ? warm : cool, rand() * 0.55);
      const brightness = (0.35 + rand() * 0.55) * (size > 3 ? 2.2 : 1);
      colors.set([c.r * brightness, c.g * brightness, c.b * brightness], i * 3);
    }

    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(positions, 3));
    g.setAttribute('aSize', new BufferAttribute(sizes, 1));
    g.setAttribute('aPhase', new BufferAttribute(phases, 1));
    g.setAttribute('aColor', new BufferAttribute(colors, 3));
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: starsVert,
        fragmentShader: starsFrag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uIntensity: { value: 1.5 } },
      }),
    [],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  const ref = useRef<Points>(null);
  useFrame(({ clock, viewport, camera }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uPixelRatio.value = viewport.dpr;
    if (ref.current) {
      ref.current.position.copy(camera.position);
    }
  });

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={-5} />;
}
