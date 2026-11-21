import { Environment, Lightformer } from '@react-three/drei';
import { token } from '../palette';

/**
 * A photo-studio light rig rendered once into an environment map (no HDR download): a big soft
 * key from above, brand-blue and brand-green panels on the sides, a rim ring behind.
 * That reflection is what makes the clear-coated objects read as real.
 */
export function Lights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 6]} intensity={2.4} />
      <directionalLight position={[-5, -2, 2]} intensity={0.9} color={token('blueLight')} />
      <pointLight position={[2, -2.5, 2]} intensity={6} distance={9} color={token('green')} />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#0d2a55']} />
        <Lightformer form="rect" intensity={3.2} position={[0, 5, 2]} rotation-x={Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={2.2} color={token('blueLight')} position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1.8} color={token('greenLight')} position={[5, -1, 1]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="ring" intensity={2.5} position={[0, 0, -6]} scale={5} />
        <Lightformer form="rect" intensity={1.2} position={[0, -4, 3]} rotation-x={-Math.PI / 2} scale={[8, 2, 1]} />
      </Environment>
    </>
  );
}
