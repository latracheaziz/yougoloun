import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, ShaderMaterial, TubeGeometry, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import arcVert from '../shaders/arc.vert?raw';
import arcFrag from '../shaders/arc.frag?raw';
import { token } from '../palette';
import { space } from '../state';
import { ARCS } from './arcData';
import { useApp } from '@/store/app';

/** Glowing great-circle arcs from GCC & MENA cities to Hail — one merged draw call. */
export function Arcs() {
  const mobile = useApp((s) => s.mobile);

  const geometry = useMemo(() => {
    const parts: BufferGeometry[] = ARCS.map((curve, i) => {
      const tube = new TubeGeometry(curve, 72, mobile ? 0.0042 : 0.0026, 5, false);
      const seeds = new Float32Array(tube.attributes.position.count).fill(i / ARCS.length);
      tube.setAttribute('aSeed', new BufferAttribute(seeds, 1));
      tube.deleteAttribute('normal');
      return tube;
    });
    const merged = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
    return merged;
  }, [mobile]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: arcVert,
        fragmentShader: arcFrag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uDraw: { value: 0 },
          uOpacity: { value: 0 },
          uTime: { value: 0 },
          uColor: { value: token('ember') },
          uHot: { value: token('glow') },
        },
      }),
    [],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock }) => {
    material.uniforms.uDraw.value = space.arcs.draw;
    material.uniforms.uOpacity.value = space.arcs.opacity;
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return <mesh geometry={geometry} material={material} renderOrder={4} frustumCulled={false} visible />;
}
