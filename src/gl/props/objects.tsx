import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh, Texture } from 'three';
import { geo } from './geometry';
import { glossy, screen } from './materials';
import type { Token } from '../palette';

/**
 * The cast of the social-media world — glossy 3D icons in the brand palette, built from code.
 * Each object is centred on its own origin, about 1 unit across; the World places and animates it.
 */

type Props = { cheap: boolean };
const PI = Math.PI;

/** The logo: two speech bubbles (blue front, green behind) and a mic with a live waveform. */
export function LogoMark({ cheap }: Props) {
  const waves = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    waves.current?.children.forEach((bar, i) => {
      bar.scale.y = 0.45 + 0.55 * Math.abs(Math.sin(t * (2.2 + (i % 3) * 0.7) + i * 1.3));
    });
  });
  const white = glossy('white', cheap);
  const front = 0.12 + 0.13 + 0.09;
  return (
    <group>
      <mesh geometry={geo.bubbleGreen()} material={glossy('green', cheap, 0, { gradient: true })} position={[0.3, -0.16, -0.2]} />
      <mesh geometry={geo.bubbleBlue()} material={glossy('blue', cheap, 0, { gradient: true })} position={[-0.12, 0.08, 0.12]} />
      <group position={[-0.12, 0.13, front]}>
        <mesh geometry={geo.micHead()} material={white} position={[0, 0.06, 0]} />
        <mesh geometry={geo.micArc()} material={white} position={[0, 0.0, 0]} rotation={[0, 0, PI]} />
        <mesh geometry={geo.cylinder(0.016, 0.1)} material={white} position={[0, -0.19, 0]} />
        <mesh geometry={geo.micWave(0.05)} material={white} position={[0, -0.245, 0]} rotation={[0, 0, PI / 2]} scale={[1, 2.6, 1]} />
        <group ref={waves}>
          {[-0.36, -0.3, -0.24, 0.24, 0.3, 0.36].map((x, i) => (
            <mesh key={x} geometry={geo.micWave(i % 3 === 1 ? 0.22 : 0.14)} material={white} position={[x, 0.02, 0]} />
          ))}
        </group>
      </group>
    </group>
  );
}

export function Heart({ cheap, color = 'blue' }: Props & { color?: Token }) {
  // the blue heart wears the brand gradient, the others a solid brand colour
  if (color === 'blue') return <mesh geometry={geo.heartGradient()} material={glossy('blue', cheap, 0, { gradient: true })} />;
  return <mesh geometry={geo.heart()} material={glossy(color, cheap)} />;
}

export function Comment({ cheap }: Props) {
  const dot = glossy('blue', cheap);
  return (
    <group>
      <mesh geometry={geo.comment()} material={glossy('white', cheap)} />
      {[-0.11, 0, 0.11].map((x) => (
        <mesh key={x} geometry={geo.sphere(0.035)} material={dot} position={[x, 0.02, 0.1]} />
      ))}
    </group>
  );
}

export function PlayButton({ cheap }: Props) {
  return (
    <group>
      <mesh geometry={geo.camBody()} material={glossy('green', cheap)} scale={[0.82, 0.86, 0.5]} />
      <mesh geometry={geo.play()} material={glossy('white', cheap)} position={[0.02, 0, 0.1]} />
    </group>
  );
}

export function Megaphone({ cheap }: Props) {
  return (
    <group rotation={[0, 0, -PI / 2.4]}>
      <mesh geometry={geo.megaphone()} material={glossy('white', cheap)} />
      <mesh geometry={geo.cylinder(0.075, 0.08)} material={glossy('blue', cheap)} position={[0, -0.34, 0]} />
      <mesh geometry={geo.cylinder(0.035, 0.22)} material={glossy('navy', cheap)} position={[0.12, -0.18, 0]} rotation={[0, 0, 0.35]} />
    </group>
  );
}

export function Bell({ cheap }: Props) {
  return (
    <group>
      <mesh geometry={geo.bell()} material={glossy('green', cheap)} />
      <mesh geometry={geo.sphere(0.06)} material={glossy('greenDeep', cheap)} position={[0, -0.28, 0]} />
      <mesh geometry={geo.sphere(0.07)} material={glossy('blue', cheap)} position={[0.2, 0.22, 0.05]} />
    </group>
  );
}

export function Hash({ cheap }: Props) {
  const m = glossy('blueLight', cheap);
  return (
    <group scale={0.8}>
      <mesh geometry={geo.hashBar()} material={m} position={[0, 0.13, 0]} />
      <mesh geometry={geo.hashBar()} material={m} position={[0, -0.13, 0]} />
      <mesh geometry={geo.hashBar()} material={m} position={[-0.13, 0, 0.02]} rotation={[0, 0, PI / 2 - 0.2]} />
      <mesh geometry={geo.hashBar()} material={m} position={[0.13, 0, 0.02]} rotation={[0, 0, PI / 2 - 0.2]} />
    </group>
  );
}

/** Performance — rising bar chart with a growth arrow. */
export function Chart({ cheap }: Props) {
  return (
    <group>
      {[0.3, 0.5, 0.75, 1].map((h, i) => (
        <mesh key={h} geometry={geo.bar(h)} material={glossy(i % 2 ? 'blueDeep' : 'blue', cheap)} position={[-0.3 + i * 0.2, -0.5 + h / 2, 0]} />
      ))}
      <mesh geometry={geo.arrow()} material={glossy('green', cheap)} position={[0.36, 0.42, 0.14]} rotation={[0, 0, -0.75]} scale={0.55} />
    </group>
  );
}

/** Strategy — a target with a dart. */
export function Target({ cheap }: Props) {
  return (
    <group>
      <mesh geometry={geo.torus(0.42, 0.06)} material={glossy('green', cheap)} />
      <mesh geometry={geo.torus(0.27, 0.06)} material={glossy('white', cheap)} />
      <mesh geometry={geo.torus(0.12, 0.06)} material={glossy('green', cheap)} />
      <mesh geometry={geo.sphere(0.06)} material={glossy('greenDeep', cheap)} />
      <group position={[0.1, 0.1, 0.22]} rotation={[0.6, -0.5, 0]}>
        <mesh geometry={geo.cylinder(0.018, 0.42)} material={glossy('navy', cheap)} rotation={[PI / 2, 0, 0]} />
        <mesh geometry={geo.arrow()} material={glossy('blue', cheap)} position={[0, 0, 0.22]} rotation={[PI / 2, 0, 0]} scale={0.22} />
      </group>
    </group>
  );
}

/** Production — a camera. */
export function Camera({ cheap }: Props) {
  return (
    <group>
      <mesh geometry={geo.camBody()} material={glossy('navy', cheap)} />
      <mesh geometry={geo.camTop()} material={glossy('navy', cheap)} position={[-0.18, 0.3, 0]} />
      <mesh geometry={geo.cylinder(0.2, 0.16)} material={glossy('blueLight', cheap)} position={[0.04, -0.02, 0.22]} rotation={[PI / 2, 0, 0]} />
      <mesh geometry={geo.cylinder(0.13, 0.06)} material={glossy('blueDeep', cheap)} position={[0.04, -0.02, 0.32]} rotation={[PI / 2, 0, 0]} />
      <mesh geometry={geo.sphere(0.04)} material={glossy('green', cheap, 0.6)} position={[0.28, 0.16, 0.18]} />
    </group>
  );
}

/** Growth — a big upward arrow on rising steps. */
export function Growth({ cheap }: Props) {
  return (
    <group>
      <mesh geometry={geo.arrow()} material={glossy('greenLight', cheap)} position={[0.1, 0.1, 0.1]} rotation={[0, 0, -0.45]} scale={1.05} />
      {[0.18, 0.32, 0.46].map((h, i) => (
        <mesh key={h} geometry={geo.bar(h)} material={glossy('white', cheap)} position={[-0.34 + i * 0.2, -0.5 + h / 2, -0.12]} />
      ))}
    </group>
  );
}

/** A phone showing one of the agency's visuals. */
export function Phone({ cheap, texture }: Props & { texture: Texture }) {
  const mat = useMemo(() => screen(texture), [texture]);
  const body = useRef<Mesh>(null);
  return (
    <group>
      <mesh ref={body} geometry={geo.phoneBody()} material={glossy('navy', cheap)} />
      <mesh geometry={geo.phoneScreen()} material={mat} position={[0, 0, 0.0365]} />
      <mesh geometry={geo.notch()} material={glossy('navy', cheap)} position={[0, 0.57, 0.04]} />
    </group>
  );
}
