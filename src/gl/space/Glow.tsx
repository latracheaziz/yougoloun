import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial, type Color, type Points, type Vector3 } from 'three';
import glowVert from '../shaders/glow.vert?raw';
import glowFrag from '../shaders/glow.frag?raw';

/** A single soft glowing point. `intensity()` is read every frame. */
export function Glow({
  position,
  color,
  size,
  intensity,
  renderOrder = 6,
}: {
  position: Vector3;
  color: Color;
  size: number;
  intensity: () => number;
  renderOrder?: number;
}) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array([position.x, position.y, position.z]), 3));
    return g;
  }, [position]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: glowVert,
        fragmentShader: glowFrag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uColor: { value: color }, uIntensity: { value: 0 }, uSize: { value: size }, uPixelRatio: { value: 1 } },
      }),
    [color, size],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  const ref = useRef<Points>(null);
  useFrame(({ viewport }) => {
    const v = intensity();
    material.uniforms.uIntensity.value = v;
    material.uniforms.uPixelRatio.value = viewport.dpr;
    if (ref.current) ref.current.visible = v > 0.002;
  });

  return <points ref={ref} geometry={geometry} material={material} renderOrder={renderOrder} frustumCulled={false} />;
}
