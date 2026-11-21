import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
import nebulaVert from '../shaders/nebula.vert?raw';
import nebulaFrag from '../shaders/nebula.frag?raw';
import { token } from '../palette';
import { feed } from '../state';

const UP = new Vector3();
const RIGHT = new Vector3();
const onScreen = new Vector3();
const toSubject = new Vector3();

/**
 * The sky behind the stars — not black: a navy base with a brand-blue nebula that always glows
 * around the subject (the logo world) and a brand-green cloud beneath it. A camera-following sphere (drawn first).
 */
export function Nebula() {
  const geometry = useMemo(() => new SphereGeometry(300, 32, 16), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: nebulaVert,
        fragmentShader: nebulaFrag,
        side: BackSide,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uBase: { value: token('night') },
          uBlue: { value: token('blue').multiplyScalar(0.55) },
          uGreen: { value: token('green').multiplyScalar(0.42) },
          uBlueDir: { value: new Vector3(0, 0, -1) },
          uGreenDir: { value: new Vector3(0, -0.4, -1).normalize() },
          uIntensity: { value: 1 },
        },
      }),
    [],
  );
  useEffect(() => () => (geometry.dispose(), material.dispose()), [geometry, material]);

  const ref = useRef<Mesh>(null);
  useFrame(({ camera }) => {
    ref.current?.position.copy(camera.position);
    const u = material.uniforms;
    toSubject.copy(feed.anchor).sub(camera.position).normalize();
    u.uBlueDir.value.copy(toSubject);
    // green: below the Earth, pulled towards the middle of the screen (so the planet never hides it)
    UP.set(0, 1, 0).applyQuaternion(camera.quaternion);
    RIGHT.set(1, 0, 0).applyQuaternion(camera.quaternion);
    const side = Math.sign(onScreen.copy(feed.anchor).project(camera).x) || 1;
    u.uGreenDir.value.copy(toSubject).addScaledVector(UP, -0.6).addScaledVector(RIGHT, -side * 0.75).normalize();
  });

  return <mesh ref={ref} geometry={geometry} material={material} renderOrder={-100} frustumCulled={false} />;
}
