import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, InstancedBufferAttribute, InstancedBufferGeometry, PlaneGeometry, ShaderMaterial, type Mesh } from 'three';
import { noiseTexture } from '../dive/noise';
import { HORIZON, SUN_DIR } from './Sky';
import { useApp } from '@/store/app';
import { qualityPresets } from '@/config/quality';

const vert = /* glsl */ `
attribute vec4 aCloud;   // xyz position, w size
attribute float aSeed;
uniform float uTime;
varying vec2 vUv;
varying float vSeed;
varying float vFog;
void main() {
  vUv = uv;
  vSeed = aSeed;
  vec3 center = aCloud.xyz + vec3(sin(uTime * 0.02 + aSeed * 6.28) * 2.0, 0.0, uTime * 0.12 * (0.5 + aSeed));
  center.z = mod(center.z + 160.0, 260.0) - 160.0;
  // camera-facing quad, flattened (clouds are wider than tall)
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 p = center + right * position.x * aCloud.w * 1.6 + up * position.y * aCloud.w * 0.7;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vFog = smoothstep(60.0, 200.0, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

const frag = /* glsl */ `
uniform sampler2D uNoise;
uniform vec3 uLit;
uniform vec3 uShade;
uniform vec3 uHorizon;
varying vec2 vUv;
varying float vSeed;
varying float vFog;
void main() {
  vec2 c = vUv - 0.5;
  float n = texture2D(uNoise, vUv * 0.85 + vSeed * 7.3).r;
  float n2 = texture2D(uNoise, vUv * 2.1 + vSeed * 3.1).g;
  float n3 = texture2D(uNoise, vUv * 4.7 + vSeed * 1.7).r;
  // cumulus silhouette: billowy top, flatter base, eaten by noise
  float d = length(c * vec2(1.0, 1.35 + c.y * 0.8));
  float a = smoothstep(0.5, 0.1, d + (n - 0.5) * 0.55 + (n2 - 0.5) * 0.2 + (n3 - 0.5) * 0.06);
  a *= smoothstep(-0.46, -0.3, c.y);                                        // flat base
  a *= smoothstep(0.5, 0.36, abs(c.x)) * smoothstep(0.5, 0.36, abs(c.y));   // never show the quad's edge
  if (a < 0.01) discard;
  // sun from above: bright billowy tops, cool shaded bellies, a little self-shadow from the noise
  float light = clamp(0.35 + vUv.y * 0.85 + (n2 - 0.5) * 0.55 + (n3 - 0.5) * 0.2, 0.0, 1.0);
  light = light * light * (3.0 - 2.0 * light);
  vec3 col = mix(uShade, uLit, light);
  // thin edges are lit through (silver lining)
  col += uLit * 0.18 * (1.0 - smoothstep(0.0, 0.55, a));
  col = mix(col, uHorizon, vFog);
  gl_FragColor = vec4(col * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The sea of clouds the world floats on, plus a few higher drifts. One instanced draw call of
 * camera-facing puffs; they drift slowly and wrap around.
 */
export function CloudSea() {
  const tier = useApp((s) => s.tier);
  const count = Math.round(150 * qualityPresets[tier].particles) + 40;

  const geometry = useMemo(() => {
    const base = new PlaneGeometry(1, 1);
    const g = new InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute('position', base.attributes.position);
    g.setAttribute('uv', base.attributes.uv);
    const rand = mulberry32(2752);
    const clouds = new Float32Array(count * 4);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const high = i % 9 === 0;
      let x = (rand() - 0.5) * 220;
      const z = 40 - rand() * 220;
      // keep the islands' own footprint clear (the sea sits below them anyway)
      if (Math.abs(x) < 14 && !high) x += Math.sign(x || 1) * 14;
      const y = high ? 9 + rand() * 14 : -2.6 - rand() * 4.5;
      clouds.set([x, y, z, high ? 10 + rand() * 12 : 9 + rand() * 16], i * 4);
      seeds[i] = rand();
    }
    g.setAttribute('aCloud', new InstancedBufferAttribute(clouds, 4));
    g.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1));
    g.instanceCount = count;
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        premultipliedAlpha: true,
        uniforms: {
          uNoise: { value: noiseTexture() },
          uTime: { value: 0 },
          uLit: { value: new Color(1.18, 1.18, 1.2) },
          uShade: { value: new Color('#A9C2DC') },
          uHorizon: { value: HORIZON },
          uSunDir: { value: SUN_DIR },
        },
      }),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = useApp.getState().reducedMotion ? 0 : clock.elapsedTime;
  });
  return <mesh ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />;
}
