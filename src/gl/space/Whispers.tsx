import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, ShaderMaterial, Vector2, Vector3, type Points } from 'three';
import whispersVert from '../shaders/whispers.vert?raw';
import whispersFrag from '../shaders/whispers.frag?raw';
import { token } from '../palette';
import { space } from '../state';
import { ARCS } from './arcData';
import { whispers as WORDS } from '@content/index';
import { useApp } from '@/store/app';

const COLS = 4;
const ROWS = 8;
const CELL_W = 256;
const CELL_H = 64;

/** Draws every word once into a 4×8 atlas (after web fonts are ready, so Arabic uses the site's face). */
async function buildAtlas() {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = COLS * CELL_W;
  canvas.height = ROWS * CELL_H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  WORDS.slice(0, COLS * ROWS).forEach((word, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    ctx.font = `500 30px "IBM Plex Sans Arabic", "IBM Plex Sans", system-ui, sans-serif`;
    ctx.fillText(word, col * CELL_W + CELL_W / 2, row * CELL_H + CELL_H / 2, CELL_W - 12);
  });
  const texture = new CanvasTexture(canvas);
  texture.generateMipmaps = true;
  return texture;
}

/** "They say" — tiny words in many languages travelling along the arcs, converging on Hail. */
export function Whispers() {
  const mobile = useApp((s) => s.mobile);
  const count = mobile ? 10 : 16;
  const [atlas, setAtlas] = useState<CanvasTexture | null>(null);

  useEffect(() => {
    let alive = true;
    let tex: CanvasTexture | undefined;
    buildAtlas().then((t) => {
      tex = t;
      if (alive) setAtlas(t);
      else t.dispose();
    });
    return () => {
      alive = false;
      tex?.dispose();
    };
  }, []);

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        arc: i % ARCS.length,
        word: (i * 7) % Math.min(WORDS.length, COLS * ROWS),
        speed: 0.05 + ((i * 37) % 11) * 0.006,
        phase: ((i * 0.618) % 1 + 1) % 1,
      })),
    [count],
  );

  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aAlpha', new BufferAttribute(new Float32Array(count), 1));
    const cells = new Float32Array(count * 2);
    particles.forEach((p, i) => cells.set([p.word % COLS, Math.floor(p.word / COLS)], i * 2));
    g.setAttribute('aCell', new BufferAttribute(cells, 2));
    return g;
  }, [count, particles]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: whispersVert,
        fragmentShader: whispersFrag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uAtlas: { value: null },
          uGrid: { value: new Vector2(COLS, ROWS) },
          uColor: { value: token('sand') },
          uOpacity: { value: 0 },
          uSize: { value: mobile ? 74 : 92 },
          uPixelRatio: { value: 1 },
        },
      }),
    [mobile],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  const ref = useRef<Points>(null);
  const tmp = useMemo(() => new Vector3(), []);

  useFrame(({ clock, viewport }) => {
    const points = ref.current;
    if (!points) return;
    material.uniforms.uAtlas.value = atlas;
    material.uniforms.uOpacity.value = space.whispers;
    material.uniforms.uPixelRatio.value = viewport.dpr;
    points.visible = !!atlas && space.whispers > 0.002;
    if (!points.visible) return;

    const pos = geometry.attributes.position as BufferAttribute;
    const alpha = geometry.attributes.aAlpha as BufferAttribute;
    const t = clock.elapsedTime;
    particles.forEach((p, i) => {
      const u = (t * p.speed + p.phase) % 1;
      ARCS[p.arc].getPointAt(u, tmp);
      tmp.multiplyScalar(1.012);
      pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
      // fade in from the city, fade out before reaching Hail so words never pile up there
      alpha.setX(i, Math.sin(Math.PI * Math.min(1, u / 0.85)) ** 1.5 * (u < 0.85 ? 1 : 0));
    });
    pos.needsUpdate = true;
    alpha.needsUpdate = true;
  });

  return <points ref={ref} geometry={geometry} material={material} renderOrder={5} frustumCulled={false} />;
}
