import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  CustomBlending,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PlaneGeometry,
  ShaderMaterial,
  type Group,
  type Mesh,
} from 'three';
import cloudLayerVert from '../shaders/cloudLayer.vert?raw';
import cloudLayerFrag from '../shaders/cloudLayer.frag?raw';
import screenVert from '../shaders/screen.vert?raw';
import transitionFrag from '../shaders/transition.frag?raw';
import { noiseTexture } from './noise';
import { dive } from '../state';
import { useApp } from '@/store/app';
import { qualityPresets } from '@/config/quality';

/** Depth (in layer units) where the cloud stack is densest — the Director times the world swap to it. */
export const CLOUD_PEAK_DEPTH = 44;

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cloud layers the camera falls through. Instanced, all motion in the vertex shader. */
function CloudLayers() {
  const tier = useApp((s) => s.tier);
  const count = Math.round(44 * qualityPresets[tier].particles) + 8;

  const geometry = useMemo(() => {
    const base = new PlaneGeometry(1, 1);
    const g = new InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute('position', base.attributes.position);
    g.setAttribute('uv', base.attributes.uv);
    const rand = mulberry32(4169);
    const layers = new Float32Array(count * 4);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // 45% of the layers bunch up around the peak so the cover is total exactly there
      const clustered = i < count * 0.4;
      const depth = clustered ? CLOUD_PEAK_DEPTH - 7 + rand() * 14 : 6 + rand() * 76;
      const spread = clustered ? 5 : 10;
      layers.set([(rand() - 0.5) * spread * 2, (rand() - 0.5) * spread * 2, depth, 4 + rand() * 7], i * 4);
      seeds[i] = rand();
    }
    // far → near so blending reads correctly most of the time
    const order = [...Array(count).keys()].sort((a, b) => layers[b * 4 + 2] - layers[a * 4 + 2]);
    const sortedLayers = new Float32Array(count * 4);
    const sortedSeeds = new Float32Array(count);
    order.forEach((src, dst) => {
      sortedLayers.set(layers.subarray(src * 4, src * 4 + 4), dst * 4);
      sortedSeeds[dst] = seeds[src];
    });
    g.setAttribute('aLayer', new InstancedBufferAttribute(sortedLayers, 4));
    g.setAttribute('aSeed', new InstancedBufferAttribute(sortedSeeds, 1));
    g.instanceCount = count;
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: cloudLayerVert,
        fragmentShader: cloudLayerFrag,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uNoise: { value: noiseTexture() },
          uTravel: { value: 0 },
          uOpacity: { value: 0 },
          uTime: { value: 0 },
          uLit: { value: dive.cloudLit },
          uShade: { value: dive.cloudShade },
        },
      }),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  const group = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  useFrame(({ camera, clock }) => {
    if (!group.current || !mesh.current) return;
    mesh.current.visible = dive.clouds > 0.002;
    if (!mesh.current.visible) return;
    group.current.position.copy(camera.position);
    group.current.quaternion.copy(camera.quaternion);
    material.uniforms.uTravel.value = dive.cloudTravel;
    material.uniforms.uOpacity.value = dive.clouds;
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <group ref={group}>
      <mesh ref={mesh} geometry={geometry} material={material} renderOrder={900} frustumCulled={false} />
    </group>
  );
}

/** Full-screen cover + speed streaks (see transition.frag). */
function TransitionPass() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: screenVert,
        fragmentShader: transitionFrag,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: CustomBlending,
        blendSrc: OneFactor,
        blendDst: OneMinusSrcAlphaFactor,
        uniforms: {
          uNoise: { value: noiseTexture() },
          uCover: { value: 0 },
          uStreaks: { value: 0 },
          uTime: { value: 0 },
          uAspect: { value: 1 },
          uColor: { value: dive.coverColor },
        },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  const mesh = useRef<Mesh>(null);
  useFrame(({ clock, size }) => {
    if (!mesh.current) return;
    mesh.current.visible = dive.cover > 0.001 || dive.streaks > 0.001;
    material.uniforms.uCover.value = dive.cover;
    material.uniforms.uStreaks.value = dive.streaks;
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uAspect.value = size.width / size.height;
  });

  return (
    <mesh ref={mesh} material={material} renderOrder={1000} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

export function Dive() {
  return (
    <>
      <CloudLayers />
      <TransitionPass />
    </>
  );
}
