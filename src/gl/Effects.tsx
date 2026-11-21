import { useMemo } from 'react';
import { Vector2 } from 'three';
import { Bloom, ChromaticAberration, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useApp } from '@/store/app';
import { qualityPresets } from '@/config/quality';

/**
 * Bloom → (subtle) chromatic aberration → vignette → ACES tone mapping.
 * Film grain is a CSS overlay instead (it also covers the HTML layer).
 */
export function Effects() {
  const tier = useApp((s) => s.tier);
  const { chromaticAberration, bloomLevels } = qualityPresets[tier];
  const caOffset = useMemo(() => (chromaticAberration ? new Vector2(0.0006, 0.0004) : new Vector2(0, 0)), [chromaticAberration]);

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom mipmapBlur levels={bloomLevels} luminanceThreshold={0.82} luminanceSmoothing={0.3} intensity={0.85} radius={0.72} />
      <ChromaticAberration offset={caOffset} radialModulation modulationOffset={0.35} />
      <Vignette offset={0.34} darkness={0.42} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
