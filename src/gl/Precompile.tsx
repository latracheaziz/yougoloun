import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { Material, Object3D, Texture, WebGLRenderer } from 'three';

/** Production GL settings for every canvas: no per-program error checks (they block on ANGLE). */
export function prodGl({ gl }: { gl: WebGLRenderer }) {
  gl.debug.checkShaderErrors = import.meta.env.DEV;
}

/**
 * Compile every shader of the scene in the background BEFORE the first frame is drawn.
 *
 * On Windows, WebGL compiles through Direct3D (ANGLE) and each material variant can block the main
 * thread for 100–500 ms the first time it's drawn — measured: a 2.3 s freeze when the 3D part
 * appeared. `compileAsync` uses KHR_parallel_shader_compile, so the page stays responsive while the
 * driver compiles; hidden objects (planets, burst particles…) are made visible for the pass so they
 * don't compile mid-scroll later. Keep the canvas's frameloop at 'never' until `onDone`.
 */
export function Precompile({ onDone }: { onDone: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let alive = true;
    const hidden: Object3D[] = [];
    scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
    });
    const restore = () => hidden.forEach((o) => (o.visible = false));
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    (async () => {
      await gl.compileAsync(scene, camera).catch(() => {});
      // upload textures one per frame, so the first real frame doesn't upload them all at once
      for (const tex of texturesOf(scene)) {
        if (!alive) return;
        if (tex.image) gl.initTexture(tex);
        await frame();
      }
    })().finally(() => {
      restore();
      if (alive) onDone();
    });
    return () => {
      alive = false;
    };
  }, [gl, scene, camera, onDone]);
  return null;
}

function texturesOf(scene: Object3D) {
  const set = new Set<Texture>();
  const add = (v: unknown) => {
    if (v && (v as Texture).isTexture) set.add(v as Texture);
  };
  scene.traverse((o) => {
    const mats = (o as { material?: Material | Material[] }).material;
    for (const m of Array.isArray(mats) ? mats : mats ? [mats] : []) {
      for (const v of Object.values(m)) add(v);
      const uniforms = (m as { uniforms?: Record<string, { value: unknown }> }).uniforms;
      if (uniforms) for (const u of Object.values(uniforms)) add(u.value);
    }
  });
  return [...set];
}
