import { useLoader } from '@react-three/fiber';
import { ImageBitmapLoader, Texture } from 'three';

/**
 * Textures decoded OFF the main thread. three's TextureLoader decodes an <img> on the main thread the
 * moment it's uploaded (measured: most of a 750 ms freeze at start-up); createImageBitmap decodes in
 * the background. Bitmaps can't be flipped at upload, so they're decoded flipped (`imageOrientation`)
 * and the texture keeps flipY = false — same orientation as TextureLoader's.
 */
const configure = (loader: ImageBitmapLoader) => loader.setOptions({ imageOrientation: 'flipY', premultiplyAlpha: 'none' });

function toTexture(bitmap: ImageBitmap) {
  const t = new Texture(bitmap);
  t.flipY = false;
  t.needsUpdate = true;
  return t;
}

/** Suspense hook: one or several textures (like drei's useTexture). */
export function useBitmapTexture<T extends string | string[]>(url: T): T extends string[] ? Texture[] : Texture {
  const bitmaps = useLoader(ImageBitmapLoader, url as never, configure as never) as unknown as ImageBitmap | ImageBitmap[];
  const out = Array.isArray(bitmaps) ? bitmaps.map(cached) : cached(bitmaps);
  return out as never;
}
const textures = new WeakMap<ImageBitmap, Texture>();
function cached(b: ImageBitmap) {
  let t = textures.get(b);
  if (!t) {
    t = toTexture(b);
    textures.set(b, t);
  }
  return t;
}

/** Imperative: a texture now, its image when decoded. */
const shared = new ImageBitmapLoader();
configure(shared);
export function loadBitmapTexture(url: string) {
  const t = new Texture();
  t.flipY = false;
  shared.load(url, (bitmap) => {
    t.image = bitmap;
    t.needsUpdate = true;
  });
  return t;
}
