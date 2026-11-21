import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Euler,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { CYPRESS } from './layout';
import { trimStone } from './stone';
import { useApp } from '@/store/app';
import { qualityPresets } from '@/config/quality';

/**
 * Italian cypress trees in stone planters. Each crown is a few hundred alpha-cut foliage cards
 * (a painted spray of scale-leaves) filling a flame-shaped volume. The cards get soft radial
 * normals from the tree's axis, so the crown is lit as one volume (not as flat cards), darker
 * inside and towards the base; a slow wind sways the tops. One instanced draw call for all trees.
 */

const H = 4.2; // crown height at scale 1 (m)
const R = 0.62; // max crown radius
const CROWN_BASE = 0.62; // crown starts this high above the planter base
const crownRadius = (t: number) => R * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.75) * (1 - 0.45 * t) + 0.02;

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A spray of cypress foliage painted once: dense dark-green scale-leaves, ragged outline, alpha. */
let leafTex: CanvasTexture | null = null;
function foliageTexture() {
  if (leafTex) return leafTex;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const rand = rng(31);
  const greens = ['#22401F', '#2B4D27', '#33592C', '#3D6633', '#4A7539', '#577F40'];
  // twigs radiating from the lower centre, each made of overlapping little scales
  for (let b = 0; b < 26; b++) {
    const a = -Math.PI / 2 + (rand() - 0.5) * 2.4;
    const len = S * (0.22 + rand() * 0.24);
    let x = S / 2 + (rand() - 0.5) * 30;
    let y = S * 0.62 + (rand() - 0.5) * 30;
    const steps = 22;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const w = (1 - t) * 9 + 3;
      for (let k = 0; k < 3; k++) {
        const ox = (rand() - 0.5) * w * 2;
        const oy = (rand() - 0.5) * w * 2;
        const shade = Math.min(greens.length - 1, Math.floor(rand() * 3 + t * 3.2));
        ctx.fillStyle = greens[shade];
        ctx.beginPath();
        ctx.ellipse(x + ox, y + oy, 2.2 + rand() * 3.2, 1.4 + rand() * 1.8, a + (rand() - 0.5) * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      x += (Math.cos(a) * len) / steps + (rand() - 0.5) * 2;
      y += (Math.sin(a) * len) / steps + (rand() - 0.5) * 2;
    }
  }
  // keep it inside a soft round silhouette so card corners never show
  ctx.globalCompositeOperation = 'destination-in';
  const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.5);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  leafTex = new CanvasTexture(c);
  leafTex.colorSpace = SRGBColorSpace;
  leafTex.anisotropy = 4;
  return leafTex;
}

function foliageMaterial(uniforms: { uTime: { value: number } }) {
  const m = new MeshStandardMaterial({
    map: foliageTexture(),
    alphaTest: 0.42,
    alphaToCoverage: true,
    side: DoubleSide,
    roughness: 0.78,
    metalness: 0,
    envMapIntensity: 0.7,
  });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec4 aAxis;   // tree base x, z · crown centre y · crown height
        uniform float uTime;`,
      )
      .replace(
        '#include <defaultnormal_vertex>',
        `#include <defaultnormal_vertex>
        vec3 ipos = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec3 radial = vec3(ipos.x - aAxis.x, (ipos.y - aAxis.y) * 0.35, ipos.z - aAxis.z);
        transformedNormal = normalize(normalMatrix * normalize(radial + vec3(0.0, 0.3 * length(radial.xz), 0.0) + 1e-4));`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          vec3 base = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          float hgt = clamp((base.y - (aAxis.y - aAxis.w * 0.5)) / aAxis.w, 0.0, 1.0);
          float sway = sin(uTime * 0.9 + aAxis.x * 0.7 + aAxis.z * 0.3) * 0.6 + sin(uTime * 2.3 + base.y * 1.7) * 0.15;
          // into the instance's local frame: the sway is added in world space after instanceMatrix
          vec3 wind = vec3(sway, 0.0, sway * 0.4) * hgt * hgt * 0.07;
          transformed += (inverse(mat3(instanceMatrix)) * wind);
        }`,
      );
    // keep the radial normal on both faces (no flip for back faces)
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_begin>',
      `#include <normal_fragment_begin>
      normal = normalize(vNormal);`,
    );
  };
  m.customProgramCacheKey = () => 'cypress-foliage';
  return m;
}

export function Cypresses() {
  const tier = useApp((s) => s.tier);
  const perTree = Math.round(170 + 150 * qualityPresets[tier].particles);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const material = useMemo(() => foliageMaterial(uniforms), [uniforms]);
  const card = useMemo(() => new PlaneGeometry(1, 1), []);
  const trunk = useMemo(() => new CylinderGeometry(0.06, 0.09, 0.9, 10), []);
  const bark = useMemo(() => new MeshStandardMaterial({ color: '#4E4238', roughness: 1 }), []);
  const planter = useMemo(() => new CylinderGeometry(0.46, 0.36, 0.56, 40), []);
  const soil = useMemo(() => new CylinderGeometry(0.41, 0.41, 0.02, 32), []);
  const soilMat = useMemo(() => new MeshStandardMaterial({ color: '#5B4A3B', roughness: 1 }), []);

  const foliage = useMemo(() => {
    const n = CYPRESS.length * perTree;
    const mesh = new InstancedMesh(card, material, n);
    const axis = new Float32Array(n * 4);
    const rand = rng(77);
    const m = new Matrix4();
    const q = new Quaternion();
    const e = new Euler(0, 0, 0, 'YXZ');
    const p = new Vector3();
    const s = new Vector3();
    const col = new Color();
    let k = 0;
    for (const [x, z, sc] of CYPRESS) {
      const h = H * sc;
      const base = CROWN_BASE * sc;
      for (let i = 0; i < perTree; i++) {
        // more cards where the crown is wide
        let t = 0;
        for (let tries = 0; tries < 6; tries++) {
          t = rand();
          if (rand() < crownRadius(t) / R) break;
        }
        const r = crownRadius(t) * sc;
        const depth = Math.pow(rand(), 0.45); // 0 = axis, 1 = surface
        const a = rand() * Math.PI * 2;
        p.set(x + Math.cos(a) * r * depth * 0.88, base + t * h, z + Math.sin(a) * r * depth * 0.88);
        e.set((rand() - 0.5) * 1.4, a + (rand() - 0.5) * 1.6, (rand() - 0.5) * 0.8);
        q.setFromEuler(e);
        const size = (0.46 + rand() * 0.32) * sc * (0.75 + 0.25 * Math.min(1, r / (R * sc) + 0.3));
        s.set(size, size * 1.15, size);
        m.compose(p, q, s);
        mesh.setMatrixAt(k, m);
        // occlusion: dark inside and low, a little lighter and warmer at the outer tips
        const ao = 0.42 + 0.58 * depth * (0.7 + 0.3 * t);
        col.setRGB(ao * (0.96 + rand() * 0.08), ao * (0.98 + rand() * 0.06), ao * (0.9 + rand() * 0.08));
        mesh.setColorAt(k, col);
        axis.set([x, base + h * 0.42, z, h], k * 4);
        k++;
      }
    }
    mesh.geometry = card.clone();
    mesh.geometry.setAttribute('aAxis', new InstancedBufferAttribute(axis, 4));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
  }, [card, material, perTree]);

  useEffect(() => () => foliage.geometry.dispose(), [foliage]);
  useEffect(
    () => () => (material.dispose(), card.dispose(), trunk.dispose(), bark.dispose(), planter.dispose(), soil.dispose(), soilMat.dispose()),
    [material, card, trunk, bark, planter, soil, soilMat],
  );

  const t0 = useRef(0);
  useFrame((_, delta) => {
    if (!useApp.getState().reducedMotion) t0.current += Math.min(delta, 0.05);
    uniforms.uTime.value = t0.current;
  });

  const potMat = trimStone();
  return (
    <group>
      <primitive object={foliage} />
      {CYPRESS.map(([x, z, s], i) => (
        <group key={i} position={[x, 0, z]} scale={s}>
          <mesh geometry={planter} material={potMat} position-y={0.28} castShadow receiveShadow />
          <mesh geometry={soil} material={soilMat} position-y={0.55} receiveShadow />
          <mesh geometry={trunk} material={bark} position-y={0.9} castShadow />
        </group>
      ))}
    </group>
  );
}
