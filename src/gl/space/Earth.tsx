import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import {
  AdditiveBlending,
  BackSide,
  NoColorSpace,
  RepeatWrapping,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  type Group,
  type Texture,
} from 'three';
import sphereVert from '../shaders/sphere.vert?raw';
import earthFrag from '../shaders/earth.frag?raw';
import cloudsFrag from '../shaders/clouds.frag?raw';
import atmosphereFrag from '../shaders/atmosphere.frag?raw';
import { token } from '../palette';
import { space } from '../state';
import { useApp } from '@/store/app';
import { qualityPresets } from '@/config/quality';

const MAPS = ['day', 'night', 'normal', 'ocean', 'clouds'] as const;
const earthUrls = (set: string) => MAPS.map((m) => `/textures/earth/${set}/${m}.webp`);

/**
 * Globe + cloud shell + atmosphere halo. Orientation and lighting come from `space` (gl/state.ts).
 * `children` live in the globe's geographic frame (unit sphere, see gl/geo.ts) and turn with it.
 */
export function Earth({ children }: { children?: ReactNode }) {
  const textureSet = useApp((s) => s.textures);
  const tier = useApp((s) => s.tier);
  const segments = qualityPresets[tier].earthSegments;
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());

  const [day, night, normal, ocean, clouds] = useTexture(earthUrls(textureSet)) as Texture[];

  useEffect(() => {
    const anisotropy = Math.min(8, maxAnisotropy);
    for (const t of [day, night]) t.colorSpace = SRGBColorSpace;
    for (const t of [normal, ocean, clouds]) t.colorSpace = NoColorSpace;
    clouds.wrapS = RepeatWrapping;
    for (const t of [day, night, normal, ocean, clouds]) {
      t.anisotropy = anisotropy;
      t.needsUpdate = true;
    }
  }, [day, night, normal, ocean, clouds, maxAnisotropy]);

  const geometry = useMemo(() => new SphereGeometry(1, segments, Math.round(segments / 2)), [segments]);

  const materials = useMemo(() => {
    const twilight = token('accent');
    const nightRim = token('deep').multiplyScalar(3);
    const earth = new ShaderMaterial({
      vertexShader: sphereVert,
      fragmentShader: earthFrag,
      uniforms: {
        uDay: { value: day },
        uNight: { value: night },
        uNormalMap: { value: normal },
        uOcean: { value: ocean },
        uClouds: { value: clouds },
        uSunDirection: { value: space.sunDirection },
        uAtmosphereDay: { value: token('haze') },
        uAtmosphereTwilight: { value: twilight },
        uAtmosphereNight: { value: nightRim },
        uCityLights: { value: token('accentLight') },
        uNightLights: { value: 1 },
        uCloudOffset: { value: 0 },
        uNormalStrength: { value: 0.85 },
      },
    });
    const cloudShell = new ShaderMaterial({
      vertexShader: sphereVert,
      fragmentShader: cloudsFrag,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uClouds: { value: clouds },
        uSunDirection: { value: space.sunDirection },
        uTwilight: { value: twilight },
        uCloudOffset: { value: 0 },
        uOpacity: { value: 1 },
      },
    });
    const atmosphere = new ShaderMaterial({
      vertexShader: sphereVert,
      fragmentShader: atmosphereFrag,
      side: BackSide,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uSunDirection: { value: space.sunDirection },
        uDay: { value: token('haze') },
        uTwilight: { value: twilight },
        uNight: { value: nightRim },
        uIntensity: { value: 1.35 },
        uFalloff: { value: 0.32 },
      },
    });
    return { earth, cloudShell, atmosphere };
  }, [day, night, normal, ocean, clouds]);

  useEffect(
    () => () => {
      materials.earth.dispose();
      materials.cloudShell.dispose();
      materials.atmosphere.dispose();
    },
    [materials],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const root = useRef<Group>(null);
  const roll = useRef<Group>(null);
  const tilt = useRef<Group>(null);
  const spin = useRef<Group>(null);

  useFrame(() => {
    if (!root.current || !roll.current || !tilt.current || !spin.current) return;
    root.current.position.copy(space.earthPosition);
    roll.current.rotation.z = space.roll;
    tilt.current.rotation.x = space.tilt;
    spin.current.rotation.y = space.spin;
    materials.earth.uniforms.uCloudOffset.value = space.cloudOffset;
    materials.earth.uniforms.uNightLights.value = space.nightLights;
    materials.cloudShell.uniforms.uCloudOffset.value = space.cloudOffset;
  });

  return (
    <group ref={root}>
      <group ref={roll}>
        <group ref={tilt}>
          <group ref={spin}>
            <mesh geometry={geometry} material={materials.earth} />
            <mesh geometry={geometry} material={materials.cloudShell} scale={1.008} renderOrder={1} />
            {children}
          </group>
        </group>
      </group>
      <mesh geometry={geometry} material={materials.atmosphere} scale={1.045} renderOrder={2} />
    </group>
  );
}

useTexture.preload(earthUrls(useApp.getState().textures));
