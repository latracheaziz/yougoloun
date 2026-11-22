import { useEffect, useMemo, useRef, type ComponentType } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { MathUtils, SRGBColorSpace, type Group } from 'three';
import { Bell, Camera, Chart, Comment, Growth, Hash, Heart, LogoMark, Megaphone, Phone, PlayButton, Target } from '../props/objects';
import { StageCanvas } from './Studio';
import { useApp } from '@/store/app';
import { brandImages } from '@/config/light';

/**
 * A glossy 3D object for the current item (a service, a process step), morphing to the next one:
 * the outgoing object shrinks and spins away, the incoming one pops in with a little overshoot and
 * settles into a slow float. Drag (mouse) spins it with inertia; `tilt` (−1..1) leans it with the
 * cursor's movement. Lazy chunk: three.js only loads when a stage is near.
 */

export type ObjKey = 'logo' | 'chart' | 'target' | 'camera' | 'growth' | 'megaphone' | 'bell' | 'hash' | 'heart' | 'comment' | 'play' | 'phone';

function ScreenPhone({ cheap }: { cheap: boolean }) {
  const tex = useTexture(brandImages.social);
  useMemo(() => void (tex.colorSpace = SRGBColorSpace), [tex]);
  return <Phone cheap={cheap} texture={tex} />;
}

const OBJECTS: Record<ObjKey, ComponentType<{ cheap: boolean }>> = {
  logo: LogoMark,
  chart: Chart,
  target: Target,
  camera: Camera,
  growth: Growth,
  megaphone: Megaphone,
  bell: Bell,
  hash: Hash,
  heart: Heart,
  comment: Comment,
  play: PlayButton,
  phone: ScreenPhone,
};

const { damp } = MathUtils;
const easeBack = (x: number) => 1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2);

function Objects({ keys, index, tilt, scale }: { keys: ObjKey[]; index: number; tilt: { current: number }; scale: number }) {
  const groups = useRef<(Group | null)[]>([]);
  const st = useMemo(() => keys.map(() => ({ s: 0, spin: 0, since: 99 })), [keys]);
  const drag = useRef({ on: false, x: 0, v: 0, yaw: 0 });
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      drag.current.on = true;
      drag.current.x = e.clientX;
    };
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d.on) return;
      d.v = (e.clientX - d.x) * 0.012;
      d.yaw += d.v;
      d.x = e.clientX;
    };
    const up = () => (drag.current.on = false);
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [gl]);

  const last = useRef(-1);
  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const reduced = useApp.getState().reducedMotion;
    const t = reduced ? 0 : clock.elapsedTime;
    if (index !== last.current) {
      if (index >= 0) st[index].since = 0;
      last.current = index;
    }
    const d = drag.current;
    if (!d.on) {
      d.v *= Math.exp(-3 * dt);
      d.yaw += d.v;
      d.yaw = damp(d.yaw, 0, 0.6, dt);
    }
    st.forEach((o, i) => {
      const g = groups.current[i];
      if (!g) return;
      o.since += dt;
      const on = i === index;
      if (on) o.s = reduced ? 1 : Math.min(1, o.since / 0.55);
      else o.s = Math.max(0, o.s - dt * 4.5);
      const k = on ? easeBack(o.s) : o.s * o.s;
      g.visible = k > 0.005;
      if (!g.visible) return;
      g.scale.setScalar(Math.max(k, 1e-4) * scale);
      // spin in, then a slow float; the outgoing one spins away
      o.spin = on ? (1 - o.s) * -2.4 : o.spin + dt * 7;
      g.rotation.set(Math.sin(t * 0.7 + i) * 0.12 + tilt.current * 0.12, o.spin + Math.sin(t * 0.45 + i) * 0.35 + d.yaw, tilt.current * -0.25);
      g.position.y = Math.sin(t * 1.1 + i) * 0.06;
    });
  });

  return (
    <>
      {keys.map((key, i) => {
        const Obj = OBJECTS[key];
        return (
          <group key={`${key}-${i}`} ref={(g) => void (groups.current[i] = g)} visible={false}>
            <Obj cheap={false} />
          </group>
        );
      })}
    </>
  );
}

export default function ObjectStage({
  keys,
  index,
  active,
  tilt = { current: 0 },
  scale = 1.35,
  className,
}: {
  keys: ObjKey[];
  index: number;
  active: boolean;
  tilt?: { current: number };
  scale?: number;
  className?: string;
}) {
  return (
    <StageCanvas active={active} className={className}>
      <Objects keys={keys} index={index} tilt={tilt} scale={scale} />
    </StageCanvas>
  );
}
