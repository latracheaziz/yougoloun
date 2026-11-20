import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Vector3 } from 'three';
import { space } from './space/state';
import { spinToFace } from './geo';
import { bindPointer, pointer } from './pointer';
import { journey } from '@/scroll/journey';
import { useApp } from '@/store/app';

const { damp, lerp, smoothstep } = MathUtils;

/** Longitude centred on the visible disc in the hero (the Red Sea / Arabia side of the planet). */
const HERO_LON = 30;

const earthTarget = new Vector3();
const camTarget = new Vector3();
const sunTarget = new Vector3();
const smoothPointer = { x: 0, y: 0 };

/**
 * Drives the camera and the space world from the scroll journey.
 * Phase 1: hero framing (responsive + RTL-mirrored), mouse parallax, idle spin.
 * Phase 2 extends this with the full Earth → Gulf → dive → Hail path.
 */
export function Director() {
  useEffect(() => bindPointer(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const { camera, size, clock } = state;
    const reduced = useApp.getState().reducedMotion;
    const side = useApp.getState().dir === 'rtl' ? -1 : 1;
    const aspect = size.width / size.height;
    // 0 = portrait phone layout (planet rising at the bottom), 1 = landscape (planet beside the text)
    const land = smoothstep(aspect, 0.75, 1.35);
    const pHome = journey.p[0];

    // Planet placement — opposite the text, mirrored in Arabic
    earthTarget.set(lerp(0, 1.08 * side, land), lerp(-1.6, -0.3, land), 0);
    space.earthPosition.x = damp(space.earthPosition.x, earthTarget.x, 2.6, dt);
    space.earthPosition.y = damp(space.earthPosition.y, earthTarget.y, 2.6, dt);

    // Camera — gentle dolly as the hero scrolls away, plus pointer parallax
    smoothPointer.x = damp(smoothPointer.x, reduced ? 0 : pointer.x, 3, dt);
    smoothPointer.y = damp(smoothPointer.y, reduced ? 0 : pointer.y, 3, dt);
    camTarget.set(smoothPointer.x * 0.09, smoothPointer.y * 0.06, lerp(4.4, 3.6, land) - pHome * 0.22);
    camera.position.x = damp(camera.position.x, camTarget.x, 4, dt);
    camera.position.y = damp(camera.position.y, camTarget.y, 4, dt);
    camera.position.z = damp(camera.position.z, camTarget.z, 3, dt);
    camera.lookAt(0, 0, 0);

    // Globe orientation — keep HERO_LON on the visible disc wherever the planet sits on screen
    const azimuth = Math.atan2(camera.position.x - space.earthPosition.x, camera.position.z - space.earthPosition.z);
    const idle = reduced ? 0 : clock.elapsedTime * 0.006;
    space.spin = damp(space.spin, spinToFace(HERO_LON) + azimuth + idle + pHome * 0.12, 2.2, dt);
    space.tilt = damp(space.tilt, 0.42, 2, dt);
    space.roll = damp(space.roll, -0.16 * side, 2, dt);

    // Sun behind the planet, on the text side: lit crescent + flare frame the headline
    sunTarget.set(-0.78 * side, 0.58, -0.5).normalize();
    space.sunDirection.lerp(sunTarget, 1 - Math.exp(-2 * dt)).normalize();

    space.cloudOffset = (space.cloudOffset + dt * (reduced ? 0 : 0.0015)) % 1;
  });

  return null;
}
