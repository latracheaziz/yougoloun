import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { BackSide, Color, LinearFilter, Mesh, RepeatWrapping, ShaderMaterial, SphereGeometry, SRGBColorSpace, Vector3 } from 'three';
import { token } from '../palette';

/**
 * The sky: a real photographed sky (Poly Haven "Kloofendal 48d partly cloudy, pure sky", CC0) graded
 * towards the brand blue — clouds stay white, the blue becomes the logo's blue. The same photo, as a
 * 1k HDR, lights the world (World.tsx), so reflections and the sun match what you see.
 */

/** Direction towards the sun — measured on the photo (53° up), so shadows agree with the sky. */
export const SUN_DIR = new Vector3(0.469, 0.799, 0.378).normalize();

/** Horizon colour, for fog and the cloud sea (matches the graded sky near the horizon). */
export const HORIZON = new Color('#C3DCEE');

export const SKY_IMAGE = '/media/world/sky/sky.webp';
export const SKY_HDR = '/media/world/sky/sky-1k.hdr';

const vert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const frag = /* glsl */ `
uniform sampler2D uSky;
uniform vec3 uBlue;
uniform vec3 uBlueDeep;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
varying vec3 vDir;
#define RECIPROCAL_PI2 0.15915494
#define RECIPROCAL_PI 0.31830989
void main() {
  vec3 d = normalize(vDir);
  // three's equirect convention (same as the HDR environment)
  vec2 uv = vec2(atan(d.z, d.x) * RECIPROCAL_PI2 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * RECIPROCAL_PI + 0.5);
  vec3 c = texture2D(uSky, uv).rgb;
  // grade: blue sky → brand blue (deeper overhead), white clouds untouched
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  float blueness = smoothstep(0.03, 0.2, c.b - c.r);
  vec3 brand = mix(uBlue, uBlueDeep, smoothstep(0.1, 0.9, d.y)) * (0.55 + lum * 0.7);
  c = mix(c, brand, blueness * 0.7);
  c *= 1.06;
  // the photo's horizon and below → the haze over the cloud sea (matches the fog)
  c = mix(c, uHorizon, smoothstep(0.16, -0.02, d.y));
  // a soft bloom round the sun
  float s = max(dot(d, uSunDir), 0.0);
  c += vec3(1.0, 0.97, 0.9) * (pow(s, 600.0) * 3.0 + pow(s, 30.0) * 0.12);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function SkyDome({ radius = 450 }: { radius?: number }) {
  const map = useTexture(SKY_IMAGE);
  const geometry = useMemo(() => new SphereGeometry(radius, 64, 32), [radius]);
  const material = useMemo(() => {
    map.colorSpace = SRGBColorSpace;
    map.wrapS = RepeatWrapping;
    map.minFilter = LinearFilter; // no mips: the seam at u = 0/1 would show a line
    map.generateMipmaps = false;
    map.needsUpdate = true;
    return new ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uSky: { value: map },
        uBlue: { value: token('blue') },
        uBlueDeep: { value: token('blueDeep').multiplyScalar(0.78) },
        uHorizon: { value: HORIZON },
        uSunDir: { value: SUN_DIR },
      },
    });
  }, [map]);
  useEffect(() => () => (geometry.dispose(), material.dispose()), [geometry, material]);
  const ref = useRef<Mesh>(null);
  useFrame(({ camera }) => ref.current?.position.copy(camera.position));
  return <mesh ref={ref} geometry={geometry} material={material} renderOrder={-100} frustumCulled={false} />;
}
