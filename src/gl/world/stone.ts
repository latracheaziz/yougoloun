import { Color, MeshStandardMaterial, NoColorSpace, RepeatWrapping, TextureLoader, type Texture } from 'three';

/**
 * Stone for the architecture, from real scanned surfaces (Poly Haven, CC0; `npm run world-assets`).
 *
 * The scans are sampled TRIPLANAR in world space — no UVs, so extrusions, lathes and long boxes never
 * stretch — and only their DETAIL is used: relief (normal map, whiteout-blended), roughness, ambient
 * occlusion and tonal variation. The colour is art-directed from our palette, so the world stays in the
 * brand's register (warm Hail sandstone, white limestone, cream travertine) whatever the scan's hue.
 * A second, larger-scale sample of the tone breaks up visible tiling.
 */

export type Scan = 'sandstone' | 'plaster' | 'paving';

interface ScanMaps {
  diff: Texture;
  nor: Texture;
  arm: Texture;
}

const loader = new TextureLoader();
const scans = new Map<Scan, ScanMaps>();
function scan(name: Scan): ScanMaps {
  let s = scans.get(name);
  if (!s) {
    const load = (suffix: string) => {
      const t = loader.load(`/media/world/tex/${name}-${suffix}.webp`);
      t.wrapS = t.wrapT = RepeatWrapping;
      t.colorSpace = NoColorSpace; // detail only: luminance / normals / ARM, read as data
      t.anisotropy = 8;
      return t;
    };
    s = { diff: load('diff'), nor: load('nor'), arm: load('arm') };
    scans.set(name, s);
  }
  return s;
}

const GLSL = /* glsl */ `
uniform sampler2D uDiff;
uniform sampler2D uNor;
uniform sampler2D uArm;
uniform float uScale;
uniform float uMeanLum;
uniform float uDetail;
uniform float uNormalScale;
varying vec3 vStPos;
varying vec3 vStNrm;

vec3 triW(vec3 n) {
  vec3 w = pow(abs(n), vec3(4.0));
  return w / (w.x + w.y + w.z);
}
vec4 triSample(sampler2D t, vec3 p, vec3 w, float k) {
  return texture2D(t, p.zy * k) * w.x + texture2D(t, p.xz * k) * w.y + texture2D(t, p.xy * k) * w.z;
}
float lumOf(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
`;

interface StoneOptions {
  scan: Scan;
  /** Art-directed base colour. */
  color: string;
  /** Texture repeats per metre. */
  scale?: number;
  /** 0..1 — how much of the scan's tonal variation shows. */
  detail?: number;
  normalScale?: number;
  roughness?: number;
}

const cache = new Map<string, MeshStandardMaterial>();

export function stone({ scan: name, color, scale = 0.45, detail = 0.85, normalScale = 1, roughness = 0.85 }: StoneOptions) {
  const key = `${name}-${color}-${scale}-${detail}-${normalScale}-${roughness}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const maps = scan(name);
  const m = new MeshStandardMaterial({ color: new Color(color), roughness, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uDiff: { value: maps.diff },
      uNor: { value: maps.nor },
      uArm: { value: maps.arm },
      uScale: { value: scale },
      uMeanLum: { value: MEAN_LUM[name] },
      uDetail: { value: detail },
      uNormalScale: { value: normalScale },
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vStPos;\nvarying vec3 vStNrm;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vStPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vStNrm = normalize(mat3(modelMatrix) * objectNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 stN = normalize(vStNrm);
        vec3 stW = triW(stN);
        vec3 stDiff = triSample(uDiff, vStPos, stW, uScale).rgb;
        vec3 stDiffBig = triSample(uDiff, vStPos + 17.3, stW, uScale * 0.23).rgb;
        vec4 stArm = triSample(uArm, vStPos, stW, uScale);
        float stTone = lumOf(stDiff) / uMeanLum * 0.65 + lumOf(stDiffBig) / uMeanLum * 0.35;
        diffuseColor.rgb *= mix(1.0, clamp(stTone, 0.55, 1.45), uDetail);
        diffuseColor.rgb *= mix(1.0, stArm.r, 0.45); // cavities`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(mix(roughnessFactor, stArm.g, 0.6), 0.3, 1.0);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          // whiteout-blended triplanar normal mapping (world space), then into view space
          vec3 p = vStPos * uScale;
          vec3 tx = texture2D(uNor, p.zy).xyz * 2.0 - 1.0;
          vec3 ty = texture2D(uNor, p.xz).xyz * 2.0 - 1.0;
          vec3 tz = texture2D(uNor, p.xy).xyz * 2.0 - 1.0;
          tx.xy *= uNormalScale; ty.xy *= uNormalScale; tz.xy *= uNormalScale;
          tx = vec3(tx.xy + stN.zy, abs(tx.z) * stN.x);
          ty = vec3(ty.xy + stN.xz, abs(ty.z) * stN.y);
          tz = vec3(tz.xy + stN.xy, abs(tz.z) * stN.z);
          vec3 wn = normalize(tx.zyx * stW.x + ty.xzy * stW.y + tz.xyz * stW.z);
          normal = normalize(mat3(viewMatrix) * wn);
        }`,
      );
  };
  m.customProgramCacheKey = () => 'stone-triplanar';
  cache.set(key, m);
  return m;
}

/** Mean luminance of each scan's diffuse map (0..1) — measured, so tone variation centres on 1. */
const MEAN_LUM: Record<Scan, number> = { sandstone: 0.502, plaster: 0.441, paving: 0.358 };

/** Walls, parapets, arches, island slabs — smooth rendered plaster in warm Hail sand. */
export const wallStone = () => stone({ scan: 'plaster', color: '#E4C9A6', scale: 0.3, detail: 0.75, normalScale: 0.75, roughness: 0.88 });
/** Frames, cornices, plinths, pool rims, planters — white limestone. */
export const trimStone = () => stone({ scan: 'plaster', color: '#F1ECE4', scale: 0.55, detail: 0.5, normalScale: 0.6, roughness: 0.8 });
/** Floors — cream travertine paving. */
export const floorStone = () => stone({ scan: 'paving', color: '#DACBB4', scale: 0.32, detail: 0.7, normalScale: 0.9, roughness: 0.78 });
