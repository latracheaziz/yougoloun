import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Euler, MathUtils, Matrix4, MeshBasicMaterial, Object3D, Quaternion, Raycaster, TorusGeometry, Vector2, Vector3, type Group, type Mesh } from 'three';
import { ARCH_ANGLES, ORB, PLAZA } from './layout';
import { Camera, Chart, Growth, Target } from '../props/objects';
import { token, type Token } from '../palette';
import { world } from '../state';
import { pick } from '@/interaction/hold';
import { setCursorOverride } from '@/interaction/Cursor';
import { journey } from '@/scroll/journey';
import { useApp } from '@/store/app';

/**
 * THE CORNERSTONES AS PLANETS (after Cosmic's "everything revolves around your spark").
 * Each object pops onto its plinth as its cornerstone is revealed, then lifts off into its own tilted
 * orbit round the orb (the voice), drawing an orbit line in its colour. When the cornerstones meet,
 * the orbits merge into one shared ring. Hover → the cursor offers "View"; click → the camera flies to
 * that planet and its card opens (Cornerstones.tsx); the orbits slow right down while one is in focus.
 */

const { damp, lerp, smoothstep } = MathUtils;
const OBJECTS = [Chart, Target, Camera, Growth];
const COLORS: Token[] = ['blue', 'green', 'blueLight', 'greenLight'];
const RADIUS = [2.4, 2.85, 3.3, 3.75];
const TILT: [number, number][] = [[0.42, 0.18], [-0.3, 0.38], [0.55, -0.3], [-0.2, -0.45]];
const SPEED = [0.36, 0.3, 0.25, 0.21];
const MERGED = { radius: 3.0, tilt: [0.3, 0.1] as [number, number] };
const easeBack = (x: number) => (x <= 0 ? 0 : 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2));
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Plinth tops (world), where each planet waits before lift-off. */
const PLINTHS = ARCH_ANGLES.map(
  (a) => new Vector3(PLAZA.center.x + Math.cos(a) * (PLAZA.archRadius - 2.1), 2.0, PLAZA.center.z + Math.sin(a) * (PLAZA.archRadius - 2.1)),
);
/** Live world positions (the Director's fly-to reads them). */
export const planets = PLINTHS.map((p) => p.clone());

const tiltM = new Matrix4();
const tiltE = new Euler();
const local = new Vector3();
const orbitPos = new Vector3();
const ndc = new Vector2();
const raycaster = new Raycaster();
const facer = new Object3D();
/** The torus lies in XY; this turns it into the XZ orbit plane before the tilt. */
const torusToXZ = new Quaternion().setFromEuler(new Euler(Math.PI / 2, 0, 0));

export function Planets() {
  const groups = useRef<(Group | null)[]>([]);
  const rings = useRef<(Mesh | null)[]>([]);
  const ringGeo = useMemo(() => RADIUS.map((r) => new TorusGeometry(r, 0.012, 8, 220)), []);
  const ringMat = useMemo(() => COLORS.map((c) => new MeshBasicMaterial({ color: token(c).multiplyScalar(1.5), transparent: true, opacity: 0, depthWrite: false })), []);
  useEffect(() => () => (ringGeo.forEach((g) => g.dispose()), ringMat.forEach((m) => m.dispose())), [ringGeo, ringMat]);

  const state = useMemo(() => ({ time: 0, hovered: -1, hoverScale: [1, 1, 1, 1], lift: [0, 0, 0, 0] }), []);

  useFrame(({ clock, camera, size }, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const reduced = useApp.getState().reducedMotion;
    const { focus, setFocus } = useApp.getState();
    const t = reduced ? 0 : clock.elapsedTime;
    state.time += dt * (reduced ? 0 : 1 - world.focusW * 0.94);
    const meet = easeInOut(world.meet);

    for (let i = 0; i < 4; i++) {
      const r = world.reveal[i];
      const lift = easeInOut(smoothstep(r, 0.45, 1));
      state.lift[i] = lift;
      // orbit (own tilt/radius → shared ring when the cornerstones meet)
      const radius = lerp(RADIUS[i], MERGED.radius, meet);
      const theta = lerp(i * 1.7 + state.time * SPEED[i], i * (Math.PI / 2) + state.time * 0.22, meet);
      tiltE.set(lerp(TILT[i][0], MERGED.tilt[0], meet), 0, lerp(TILT[i][1], MERGED.tilt[1], meet));
      tiltM.makeRotationFromEuler(tiltE);
      local.set(Math.cos(theta) * radius, 0, Math.sin(theta) * radius).applyMatrix4(tiltM);
      orbitPos.copy(ORB.center).add(local);

      const g = groups.current[i];
      if (g) {
        const bob = Math.sin(t * 1.1 + i) * 0.06;
        g.position.copy(PLINTHS[i]).setY(PLINTHS[i].y + bob).lerp(orbitPos, lift);
        g.position.y += Math.sin(lift * Math.PI) * 1.1; // an arc, not a straight line
        state.hoverScale[i] = damp(state.hoverScale[i], state.hovered === i || focus === i ? 1.18 : 1, 8, dt);
        g.scale.setScalar(Math.max(easeBack(Math.min(1, r * 2.2)) * lerp(1.25, 1.2, lift) * state.hoverScale[i], 1e-4));
        g.visible = r > 0.001;
        g.rotation.set(0, t * 0.5 + i, 0);
        if (world.focusIndex === i && world.focusW > 0.001) {
          // the planet in focus turns to face the camera
          facer.position.copy(g.position);
          facer.lookAt(camera.position);
          g.quaternion.slerp(facer.quaternion, world.focusW);
        }
        planets[i].copy(g.position);
      }
      const ring = rings.current[i];
      if (ring) {
        ring.position.copy(ORB.center);
        ring.quaternion.setFromRotationMatrix(tiltM).multiply(torusToXZ);
        ring.scale.setScalar(radius / RADIUS[i]);
        ringMat[i].opacity = lift * lerp(0.55, 0.85, meet) * (focus === null || focus === i ? 1 : 0.35);
        ring.visible = lift > 0.01;
      }
    }

    // picking — only in the cornerstones chapter, once a planet is in orbit
    const inChapter = world.G >= 2 && world.G < 3;
    const castAt = (x: number, y: number) => {
      const targets = groups.current.filter((g, i): g is Group => !!g && state.lift[i] > 0.6);
      if (!targets.length) return -1;
      ndc.set((x / size.width) * 2 - 1, -(y / size.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(targets, true)[0];
      if (!hit) return -1;
      let o: typeof hit.object | null = hit.object;
      while (o && !groups.current.includes(o as Group)) o = o.parent;
      return groups.current.indexOf(o as Group);
    };
    let hovered = inChapter ? castAt(pick.x, pick.y) : -1;
    if (hovered !== state.hovered) {
      state.hovered = hovered;
      setCursorOverride(hovered >= 0 ? 'view' : null);
    }
    if (pick.pending) {
      const p = pick.pending;
      pick.pending = null;
      if (inChapter) {
        // the hover raycast already ran at the pointer's position; a touch tap has no hover → cast now
        if (hovered < 0 && (p.x !== pick.x || p.y !== pick.y)) hovered = castAt(p.x, p.y);
        if (hovered >= 0) setFocus(hovered);
        else if (focus !== null) setFocus(null);
      }
    }
    // leaving the chapter or scrolling closes the card
    if (focus !== null && (!inChapter || Math.abs(journey.velocity) > 3)) setFocus(null);
    world.focusW = damp(world.focusW, focus === null ? 0 : 1, 3.2, dt);
    world.focusIndex = focus ?? world.focusIndex;
  });

  return (
    <group>
      {OBJECTS.map((Obj, i) => (
        <group key={i} ref={(g) => void (groups.current[i] = g)} visible={false}>
          <Obj cheap={false} />
        </group>
      ))}
      {ringGeo.map((g, i) => (
        <mesh key={i} ref={(m) => void (rings.current[i] = m)} geometry={g} material={ringMat[i]} visible={false} />
      ))}
    </group>
  );
}
