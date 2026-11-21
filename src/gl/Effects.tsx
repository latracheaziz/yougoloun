import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useApp } from '@/store/app';
import { qualityPresets } from '@/config/quality';

/**
 * MSAA → bloom (only real highlights) → vignette → ACES tone mapping.
 * Film grain is a CSS overlay instead (it also covers the HTML layer).
 */
export function Effects() {
  const tier = useApp((s) => s.tier);
  const { bloomLevels, msaa } = qualityPresets[tier];

  return (
    <EffectComposer multisampling={msaa} enableNormalPass={false}>
      <Bloom mipmapBlur levels={bloomLevels} luminanceThreshold={0.95} luminanceSmoothing={0.15} intensity={0.45} radius={0.6} />
      <Vignette offset={0.34} darkness={0.42} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
