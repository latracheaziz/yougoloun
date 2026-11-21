import { Color, DoubleSide, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, type Material, type Texture } from 'three';
import { token, type Token } from '../palette';

/**
 * Glossy "3D icon" materials in the brand palette — clear-coated plastic that picks up the studio
 * environment (see Lights.tsx). Low tier falls back to MeshStandardMaterial.
 * Cached by key and shared by every object of that colour.
 */

const cache = new Map<string, Material>();

export function glossy(name: Token | 'white', cheap = false, emissive = 0, opts: { gradient?: boolean } = {}): MeshStandardMaterial {
  const key = `${name}-${cheap}-${emissive}-${opts.gradient ? 'g' : ''}`;
  let m = cache.get(key) as MeshStandardMaterial | undefined;
  if (!m) {
    const color = opts.gradient ? new Color(1, 1, 1) : name === 'white' ? new Color('#F4F7FB') : token(name);
    const base = {
      color,
      vertexColors: !!opts.gradient,
      roughness: name === 'white' ? 0.3 : 0.2,
      metalness: 0,
      envMapIntensity: 1.0,
      emissive: color.clone().multiplyScalar(emissive),
      side: DoubleSide,
    };
    m = cheap ? new MeshStandardMaterial(base) : new MeshPhysicalMaterial({ ...base, clearcoat: 1, clearcoatRoughness: 0.04, specularIntensity: 0.6 });
    cache.set(key, m);
  }
  return m;
}

/** Glowing line material (orbit rings). */
export function glow(name: Token): MeshBasicMaterial {
  const key = `glow-${name}`;
  let m = cache.get(key) as MeshBasicMaterial | undefined;
  if (!m) {
    m = new MeshBasicMaterial({ color: token(name).multiplyScalar(2.2), transparent: true, depthWrite: false, toneMapped: true });
    cache.set(key, m);
  }
  return m;
}

/** Phone screen: the image, slightly lit so it reads as a display. */
export function screen(texture: Texture): MeshBasicMaterial {
  return new MeshBasicMaterial({ map: texture, toneMapped: false, color: new Color(1.05, 1.05, 1.05) });
}
