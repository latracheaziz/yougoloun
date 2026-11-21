import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, InstancedMesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, Vector3 } from 'three';
import { feed } from '../state';
import { geo } from './geometry';
import { token } from '../palette';
import { LOGO_ABOUT, phoneFan } from './formation';

const COUNT = 34;
const COLORS = ['white', 'blueLight', 'greenLight', 'white', 'blue'] as const;

/**
 * "They say" — small comment bubbles rise from the phones and fly into the logo: word of mouth
 * turning into the brand. One instanced draw call; visible during the About formation.
 */
export function Chatter({ cheap }: { cheap: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  const material = useMemo(() => {
    const base = { color: new Color(1, 1, 1), roughness: 0.25, metalness: 0, envMapIntensity: 1.1 };
    return cheap ? new MeshStandardMaterial(base) : new MeshPhysicalMaterial({ ...base, clearcoat: 1, clearcoatRoughness: 0.1 });
  }, [cheap]);
  useEffect(() => () => material.dispose(), [material]);

  const seeds = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        phone: i % 5,
        offset: (i * 0.618) % 1,
        speed: 0.12 + ((i * 37) % 10) * 0.008,
        bend: ((i * 53) % 21) / 10 - 1,
        size: 0.45 + ((i * 29) % 10) * 0.05,
      })),
    [],
  );

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const white = new Color('#F4F7FB');
    seeds.forEach((_, i) => {
      const name = COLORS[i % COLORS.length];
      m.setColorAt(i, name === 'white' ? white : token(name));
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [seeds, material]);

  const dummy = useMemo(() => new Object3D(), []);
  const a = useMemo(() => new Vector3(), []);
  const ctrl = useMemo(() => new Vector3(), []);
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const amount = feed.chatter * feed.w.about;
    m.visible = amount > 0.01;
    if (!m.visible) return;
    const t = clock.elapsedTime;
    const side = feed.side;
    seeds.forEach((s, i) => {
      const k = (t * s.speed + s.offset) % 1;
      phoneFan(s.phone, a);
      a.y += 0.7;
      ctrl.set((a.x + LOGO_ABOUT.x) / 2 + s.bend * 0.7, Math.max(a.y, LOGO_ABOUT.y) + 0.45, 0.5);
      // quadratic bezier: phone top → control → logo
      const u = 1 - k;
      dummy.position.set(
        (u * u * a.x + 2 * u * k * ctrl.x + k * k * LOGO_ABOUT.x) * side,
        u * u * a.y + 2 * u * k * ctrl.y + k * k * LOGO_ABOUT.y,
        u * u * a.z + 2 * u * k * ctrl.z + k * k * LOGO_ABOUT.z,
      );
      dummy.rotation.set(0.2, (s.bend * 0.6 + Math.sin(t + i) * 0.3) * side, Math.sin(t * 2 + i) * 0.15);
      dummy.scale.setScalar(Math.sin(k * Math.PI) * s.size * amount + 1e-4);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geo.miniBubble(), material, COUNT]} frustumCulled={false} />;
}
