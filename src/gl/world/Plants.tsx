import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Vector3, type Mesh, type Object3D } from 'three';
import { PLANTS, type PlantKind } from './layout';

/**
 * Real plants (Poly Haven scans, CC0, optimised by `npm run world-assets`): desert quiver trees and
 * shrubs, placed from `PLANTS` in layout.ts. Each model is normalised to a target height in metres.
 */
const URL: Record<PlantKind, string> = {
  quiver: '/media/world/models/quiver_tree_01.glb',
  shrub: '/media/world/models/shrub_01.glb',
  bush: '/media/world/models/shrub_03.glb',
};

function useNormalised(kind: PlantKind) {
  const { scene } = useGLTF(URL[kind]);
  return useMemo(() => {
    scene.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) {
        // shrubs are small on screen: their shadow isn't worth drawing them twice
        m.castShadow = kind === 'quiver';
        m.receiveShadow = true;
      }
    });
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    return { scene, height: size.y, base: box.min.y };
  }, [scene]);
}

function Plant({ src, x, z, height, rotY }: { src: { scene: Object3D; height: number; base: number }; x: number; z: number; height: number; rotY: number }) {
  const clone = useMemo(() => src.scene.clone(true), [src]);
  const s = height / src.height;
  return <primitive object={clone} position={[x, -src.base * s, z]} scale={s} rotation-y={rotY} />;
}

export function Plants() {
  const models = { quiver: useNormalised('quiver'), shrub: useNormalised('shrub'), bush: useNormalised('bush') };
  return (
    <group>
      {PLANTS.map(([kind, x, z, h, r], i) => (
        <Plant key={i} src={models[kind]} x={x} z={z} height={h} rotY={r} />
      ))}
    </group>
  );
}

Object.values(URL).forEach((u) => useGLTF.preload(u));
