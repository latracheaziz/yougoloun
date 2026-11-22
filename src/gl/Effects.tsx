import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bloom, BrightnessContrast, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { dive } from './state';
import { useApp } from '@/store/app';
import { qualityPresets } from '@/config/quality';

const AO_INTENSITY = 2.4;

/**
 * Ambient occlusion → MSAA → bloom (only real highlights) → Khronos PBR Neutral tone mapping (keeps
 * the brand blue/green true, unlike ACES' hue shifts) → a touch of contrast → vignette.
 * AO grounds the architecture (corners, joints, objects on plinths); it fades out in the dive,
 * where it would only darken the cloud layers. Film grain is a CSS overlay (it also covers the HTML).
 */
export function Effects() {
  const tier = useApp((s) => s.tier);
  const { bloomLevels, msaa, ao } = qualityPresets[tier];
  // n8ao ships no types: only the live configuration is touched
  const aoPass = useRef<{ configuration: { intensity: number } } | null>(null);

  useFrame(() => {
    const pass = aoPass.current;
    if (pass) pass.configuration.intensity = AO_INTENSITY * (1 - dive.clouds);
  });

  return (
    <EffectComposer multisampling={msaa} enableNormalPass={false}>
      {ao ? (
        <N8AO ref={aoPass} aoRadius={1.1} distanceFalloff={0.6} intensity={AO_INTENSITY} quality="low" halfRes depthAwareUpsampling color="#1A2740" />
      ) : (
        <></>
      )}
      <Bloom mipmapBlur levels={bloomLevels} luminanceThreshold={0.95} luminanceSmoothing={0.15} intensity={0.4} radius={0.6} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <BrightnessContrast brightness={0} contrast={0.07} />
      <Vignette offset={0.38} darkness={0.3} />
    </EffectComposer>
  );
}
