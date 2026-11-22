import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { MathUtils, Vector3, type DirectionalLight, type Object3D } from 'three';
import { HORIZON, SKY_HDR, SkyDome, SUN_DIR } from './Sky';
import { CloudSea } from './CloudSea';
import { Architecture, plazaRibbonVisible } from './Architecture';
import { LoopCurve, Ribbon } from './Ribbon';
import { Voice } from './Voice';
import { ORB, PORTAL_WINDOW_Y } from './layout';
import { world } from '../state';
import { useApp } from '@/store/app';
import { qualityPresets } from '@/config/quality';

/** Sun + sky light. The shadow frustum follows what the camera looks at. */
function Sun() {
  const light = useRef<DirectionalLight>(null);
  const target = useRef<Object3D>(null);
  const tier = useApp((s) => s.tier);
  const tmp = useMemo(() => new Vector3(), []);
  const frame = useRef(0);
  useFrame(({ camera }) => {
    const l = light.current;
    if (!l || !target.current) return;
    // focus ≈ 9 m in front of the camera, on the ground
    camera.getWorldDirection(tmp);
    tmp.multiplyScalar(9).add(camera.position);
    tmp.y = 0;
    target.current.position.copy(tmp);
    l.position.copy(tmp).addScaledVector(SUN_DIR, 30);
    l.target = target.current;
    // the shadow pass re-draws every caster: refresh it at 30 Hz (invisible in motion, half the cost)
    l.shadow.autoUpdate = false;
    if (frame.current++ % 2 === 0) l.shadow.needsUpdate = true;
  });
  return (
    <>
      {/* cool sky fill from above, warm stone bounce from below; the sun does the modelling */}
      <hemisphereLight args={['#BFDDF3', '#D8CDBE', 0.34]} />
      <directionalLight
        ref={light}
        intensity={3.4}
        color="#FFF3E4"
        castShadow={!NO.has('shadows')}
        shadow-mapSize={[qualityPresets[tier].shadowMap, qualityPresets[tier].shadowMap]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.035}
        shadow-radius={3}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={80}
      />
      <object3D ref={target} />
    </>
  );
}

/** Dev-only profiling: /en?no=clouds,arch,plants,trees,voice,ribbon,sky,shadows,env switches layers off. */
const NO = new Set(import.meta.env.DEV ? (new URLSearchParams(window.location.search).get('no') ?? '').split(',') : []);

/** The hero ribbon steps aside as the camera flies through the portal (it would fill the lens). */
const heroRibbonVisible = () => 1 - MathUtils.smoothstep(world.G, 0.8, 1.02);

/**
 * THE WORLD — a sunlit place of conversation floating over a sea of clouds, in the brand palette:
 * the logo's speech bubbles as glazed portals on a mirror pool, a walkway of arch frames holding the
 * agency's creatives, a plaza of four arches (the cornerstones) around a blue→green orb.
 * The brand ribbon circles the portal; a second one wraps the orb when the cornerstones meet.
 */
export function World() {
  const heroRibbon = useMemo(() => new LoopCurve(new Vector3(0, PORTAL_WINDOW_Y - 0.1, -0.4), 3.9, 2.1, 0.5, 0.3), []);
  const orbRibbon = useMemo(() => new LoopCurve(ORB.center.clone(), 2.6, 2.6, 0.55, 0.5), []);
  useFrame((_, delta) => {
    if (!useApp.getState().reducedMotion) world.ribbon += Math.min(delta, 0.05); // + scroll boost (Director)
  });
  return (
    <>
      <fog attach="fog" args={[HORIZON, 50, 210]} />
      {!NO.has('sky') && <SkyDome />}
      {!NO.has('sun') && <Sun />}
      {/* the same photographed sky lights the world (reflections, ambient) */}
      {!NO.has('env') && <Environment files={SKY_HDR} environmentIntensity={0.55} />}
      {!NO.has('clouds') && <CloudSea />}
      {!NO.has('arch') && <Architecture />}
      {!NO.has('voice') && <Voice />}
      {!NO.has('ribbon') && <Ribbon curve={heroRibbon} width={0.46} repeats={6} visible={heroRibbonVisible} />}
      {!NO.has('ribbon') && <Ribbon curve={orbRibbon} width={0.38} repeats={4} visible={plazaRibbonVisible} />}
    </>
  );
}
