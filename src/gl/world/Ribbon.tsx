import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, CanvasTexture, Curve, DoubleSide, MeshPhysicalMaterial, RepeatWrapping, SRGBColorSpace, Vector3, type Mesh } from 'three';
import { brand } from '@/config/palette';
import { useContent } from '@/i18n/LangContext';
import { world } from '../state';

/**
 * The brand ribbon (after Ghalia's): a satin band in the blue→green gradient with the name printed
 * on it — "YOUGOLOUN ✦ يقولون ✦ …" — sliding along a loop around the subject.
 */

/** Canvas texture: gradient band + the name in white, tileable along u. */
function useRibbonTexture() {
  const t = useContent();
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 128;
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.wrapS = RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const draw = () => {
      if (cancelled) return;
      const canvas = texture.image as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      const { width: W, height: H } = canvas;
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, brand.blueDeep);
      g.addColorStop(0.5, brand.green);
      g.addColorStop(1, brand.blueDeep);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(0, 10, W, 2);
      ctx.fillRect(0, H - 12, W, 2);
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      const parts = [t.brand.name, t.brand.nameAlt];
      // two runs of "NAME ✦ اسم ✦" fill the band (it repeats seamlessly along u)
      let x = 40;
      const step = W / 4;
      for (let i = 0; i < 4; i++) {
        const word = parts[i % 2];
        const arabic = /[؀-ۿ]/.test(word);
        ctx.font = arabic ? '600 64px Alexandria, "IBM Plex Sans Arabic", sans-serif' : '600 58px "Clash Display", "IBM Plex Sans", sans-serif';
        ctx.direction = arabic ? 'rtl' : 'ltr';
        ctx.textAlign = 'center';
        ctx.fillText(word, x + step / 2 - 40, H / 2 + 2);
        ctx.font = '40px sans-serif';
        ctx.direction = 'ltr';
        ctx.fillText('✦', x + step - 40, H / 2);
        x += step;
      }
      texture.needsUpdate = true;
    };
    draw();
    document.fonts.ready.then(draw);
    return () => {
      cancelled = true;
    };
  }, [texture, t.brand.name, t.brand.nameAlt]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** A flat band along a closed curve, with a gentle twist. UV: u along the length (repeating), v across. */
function ribbonGeometry(curve: Curve<Vector3>, width: number, segments: number, twist: number, repeats: number) {
  const pos = new Float32Array((segments + 1) * 2 * 3);
  const uv = new Float32Array((segments + 1) * 2 * 2);
  const index: number[] = [];
  const up = new Vector3(0, 1, 0);
  const p = new Vector3();
  const tan = new Vector3();
  const side = new Vector3();
  const normal = new Vector3();
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    curve.getPointAt(u % 1, p);
    curve.getTangentAt(u % 1, tan);
    side.crossVectors(tan, up).normalize();
    normal.crossVectors(side, tan).normalize();
    const a = Math.sin(u * Math.PI * 2 * 2) * twist;
    const dir = side.clone().multiplyScalar(Math.sin(a)).add(normal.clone().multiplyScalar(Math.cos(a)));
    for (let k = 0; k < 2; k++) {
      const s = (k - 0.5) * width;
      pos.set([p.x + dir.x * s, p.y + dir.y * s, p.z + dir.z * s], (i * 2 + k) * 3);
      uv.set([-u * repeats, k], (i * 2 + k) * 2);
    }
    if (i < segments) {
      const a0 = i * 2;
      index.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** An elliptical loop with a wave, tilted — `center`, radii and tilt set the composition. */
export class LoopCurve extends Curve<Vector3> {
  constructor(
    private center: Vector3,
    private rx: number,
    private rz: number,
    private wave: number,
    private tilt: number,
  ) {
    super();
  }
  getPoint(t: number, target = new Vector3()) {
    const a = t * Math.PI * 2;
    const x = Math.cos(a) * this.rx;
    const z = Math.sin(a) * this.rz;
    const y = Math.sin(a * 2) * this.wave + x * Math.sin(this.tilt) * 0.35;
    return target.set(this.center.x + x, this.center.y + y, this.center.z + z);
  }
}

export function Ribbon({ curve, width = 0.42, repeats = 5, visible = () => 1 }: { curve: Curve<Vector3>; width?: number; repeats?: number; visible?: () => number }) {
  const texture = useRibbonTexture();
  const geometry = useMemo(() => ribbonGeometry(curve, width, 480, 0.5, repeats), [curve, width, repeats]);
  const material = useMemo(
    () =>
      new MeshPhysicalMaterial({
        map: texture,
        side: DoubleSide,
        roughness: 0.35,
        metalness: 0,
        clearcoat: 0.6,
        clearcoatRoughness: 0.2,
        sheen: 0.4,
        envMapIntensity: 0.9,
        transparent: true,
      }),
    [texture],
  );
  // wherever the band shows its print mirrored on screen (seen from behind, or the far side of the
  // loop), flip u — decided by the handedness of the uv mapping in screen space, so it always reads
  useMemo(() => {
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `vec2 rUv = vMapUv;
        vec2 rDu = vec2(dFdx(rUv.x), dFdy(rUv.x));
        vec2 rDv = vec2(dFdx(rUv.y), dFdy(rUv.y));
        if (rDu.x * rDv.y - rDu.y * rDv.x < 0.0) rUv.x = -rUv.x;
        vec4 sampledDiffuseColor = texture2D(map, rUv);
        diffuseColor *= sampledDiffuseColor;`,
      );
    };
    material.customProgramCacheKey = () => 'ribbon-readable';
  }, [material]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  const ref = useRef<Mesh>(null);
  useFrame(() => {
    texture.offset.x = -world.ribbon * 0.06;
    const v = visible();
    material.opacity = v;
    if (ref.current) ref.current.visible = v > 0.01;
  });
  return <mesh ref={ref} geometry={geometry} material={material} castShadow />;
}
