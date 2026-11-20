import { Color, Vector3 } from 'three';
import { token } from '../palette';
import { hail } from '../state';

/**
 * Golden hour → night colours for the Hail world, derived from the design tokens.
 * Called every frame by the Director with hail.night (0..1).
 */
let stops: ReturnType<typeof buildStops> | null = null;

function buildStops() {
  const glow = token('glow');
  const ember = token('ember');
  const deep = token('deep');
  const haze = token('haze');
  const sand = token('sand');
  const granite = token('granite');
  return {
    golden: {
      zenith: deep.clone().lerp(haze, 0.22).multiplyScalar(1.6),
      horizon: glow.clone().lerp(ember, 0.38).multiplyScalar(0.95),
      ground: sand.clone().lerp(ember, 0.45).multiplyScalar(0.55),
      sun: glow.clone().lerp(ember, 0.25).multiplyScalar(1.7),
      light: glow.clone().lerp(ember, 0.22).multiplyScalar(2.9),
      ambientSky: haze.clone().lerp(glow, 0.35).lerp(deep, 0.3).multiplyScalar(0.5),
      ambientGround: sand.clone().lerp(ember, 0.4).multiplyScalar(0.42),
    },
    night: {
      zenith: deep.clone().multiplyScalar(0.18),
      horizon: deep.clone().lerp(haze, 0.08).multiplyScalar(0.75),
      ground: deep.clone().multiplyScalar(0.3),
      sun: haze.clone().multiplyScalar(0.18),
      light: haze.clone().lerp(sand, 0.3).multiplyScalar(0.42),
      ambientSky: deep.clone().lerp(haze, 0.18).multiplyScalar(0.6),
      ambientGround: granite.clone().lerp(deep, 0.6).multiplyScalar(0.32),
    },
  };
}

const SUN_GOLDEN = new Vector3(-0.78, 0.15, -0.6).normalize();
const SUN_SET = new Vector3(-0.78, -0.22, -0.6).normalize();
const MOON = new Vector3(0.42, 0.62, 0.3).normalize();
const tmp = new Color();

export function updateHailPalette(night: number) {
  stops ??= buildStops();
  const { golden: g, night: n } = stops;
  const mix = (out: Color, a: Color, b: Color) => out.copy(tmp.copy(a).lerp(b, night));
  mix(hail.skyZenith, g.zenith, n.zenith);
  mix(hail.skyHorizon, g.horizon, n.horizon);
  mix(hail.skyGround, g.ground, n.ground);
  mix(hail.sunColor, g.sun, n.sun);
  mix(hail.lightColor, g.light, n.light);
  mix(hail.ambientSky, g.ambientSky, n.ambientSky);
  mix(hail.ambientGround, g.ambientGround, n.ambientGround);
  hail.sunDirection.copy(SUN_GOLDEN).lerp(SUN_SET, night).normalize();
  hail.lightDirection.copy(SUN_GOLDEN).lerp(MOON, Math.min(1, night * 1.2)).normalize();
}

/** Direction of the golden-hour sun (used to bake the terrain shadows). */
export const HAIL_SUN = SUN_GOLDEN;
