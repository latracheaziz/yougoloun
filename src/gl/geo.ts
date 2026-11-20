import { MathUtils, Vector3 } from 'three';

const DEG = MathUtils.DEG2RAD;

/**
 * Lat/lon → point on a unit sphere, matching three.js SphereGeometry UVs
 * with an equirectangular texture (lon 0 → +X, lon +90° → −Z, north → +Y).
 */
export function latLonToVec3(lat: number, lon: number, radius = 1, out = new Vector3()) {
  const la = lat * DEG;
  const lo = lon * DEG;
  return out.set(Math.cos(la) * Math.cos(lo) * radius, Math.sin(la) * radius, -Math.cos(la) * Math.sin(lo) * radius);
}

/** Y-rotation that brings longitude `lon` to face +Z. */
export const spinToFace = (lon: number) => -Math.PI / 2 - lon * DEG;
