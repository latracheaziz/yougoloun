import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, MathUtils, ShaderMaterial, Vector3, type Mesh } from 'three';
import quadVert from '../shaders/quad.vert?raw';
import flareFrag from '../shaders/flare.frag?raw';
import { token } from '../palette';
import { space } from '../state';

const toCamera = new Vector3();
const across = new Vector3();

/**
 * The sun, peeking over the Earth's limb. Placed on the limb on the sun's side,
 * just behind it, so the depth test lets the planet occlude half of it.
 * Visible only while the sun is behind the planet.
 */
export function SunFlare() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: quadVert,
        fragmentShader: flareFrag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uColor: { value: token('glow') },
          uCore: { value: new Color(1, 0.97, 0.92) },
          uIntensity: { value: 1 },
          uTime: { value: 0 },
        },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  const ref = useRef<Mesh>(null);
  useFrame(({ camera, clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    toCamera.copy(camera.position).sub(space.earthPosition).normalize();
    const facing = space.sunDirection.dot(toCamera); // < 0 → sun behind the planet
    across.copy(space.sunDirection).addScaledVector(toCamera, -facing);
    if (across.lengthSq() < 1e-6) across.set(0, 1, 0);
    across.normalize();

    mesh.position.copy(space.earthPosition).addScaledVector(across, 1.0).addScaledVector(toCamera, -0.45);
    mesh.quaternion.copy(camera.quaternion);

    const intensity = 0.72 * space.flare * MathUtils.smoothstep(-facing, -0.15, 0.3);
    material.uniforms.uIntensity.value = intensity;
    material.uniforms.uTime.value = clock.elapsedTime;
    mesh.visible = intensity > 0.002;
  });

  return (
    <mesh ref={ref} material={material} scale={3.4} renderOrder={3}>
      <planeGeometry />
    </mesh>
  );
}
