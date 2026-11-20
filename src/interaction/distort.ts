/**
 * Liquid hover distortion for images — ONE shared WebGL2 canvas, attached to the hovered image
 * only while it is hovered (no idle contexts, no work when nothing is hovered).
 * Ripple around the pointer + a slight RGB split proportional to pointer speed.
 */
const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uMouse;
uniform vec2 uRes;
uniform vec2 uImg;
uniform float uStrength;
uniform float uTime;
uniform float uSpeed;
in vec2 vUv;
out vec4 color;

vec2 cover(vec2 uv) {
  float ra = uRes.x / uRes.y;
  float ia = uImg.x / uImg.y;
  vec2 s = ra > ia ? vec2(1.0, ia / ra) : vec2(ra / ia, 1.0);
  return (uv - 0.5) * s / (1.0 + 0.05 * uStrength) + 0.5;
}

void main() {
  vec2 d = vUv - uMouse;
  d.x *= uRes.x / uRes.y;
  float dist = length(d);
  float wave = sin(dist * 26.0 - uTime * 3.6) * exp(-dist * 4.5) * 0.02 * uStrength;
  vec2 offset = normalize(d + 1e-5) * wave;
  offset += vec2(sin(vUv.y * 9.0 + uTime * 0.9), cos(vUv.x * 7.0 + uTime * 1.2)) * 0.004 * uStrength;
  vec2 uv = cover(vUv + offset);
  float shift = (0.002 + 0.01 * uSpeed) * uStrength;
  color = vec4(texture(uTex, uv + vec2(shift, 0.0)).r, texture(uTex, uv).g, texture(uTex, uv - vec2(shift, 0.0)).b, 1.0);
}`;

let canvas: HTMLCanvasElement | null = null;
let gl: WebGL2RenderingContext | null = null;
let program: WebGLProgram | null = null;
let texture: WebGLTexture | null = null;
let uniforms: Record<string, WebGLUniformLocation | null> = {};
let raf = 0;
let host: HTMLElement | null = null;
let image: HTMLImageElement | null = null;
const state = { strength: 0, target: 0, mx: 0.5, my: 0.5, tx: 0.5, ty: 0.5, speed: 0, t0: performance.now() };

function init() {
  if (gl) return true;
  canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
  gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false });
  if (!gl) return false;
  const shader = (type: number, src: string) => {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    return s;
  };
  program = gl.createProgram()!;
  gl.attachShader(program, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl = null;
    return false;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  for (const name of ['uTex', 'uMouse', 'uRes', 'uImg', 'uStrength', 'uTime', 'uSpeed']) uniforms[name] = gl.getUniformLocation(program, name);
  texture = gl.createTexture();
  return true;
}

function frame() {
  if (!gl || !canvas || !host || !image) return;
  state.strength += (state.target - state.strength) * 0.08;
  const px = state.mx;
  const py = state.my;
  state.mx += (state.tx - state.mx) * 0.12;
  state.my += (state.ty - state.my) * 0.12;
  state.speed += (Math.min(1, Math.hypot(state.mx - px, state.my - py) * 40) - state.speed) * 0.1;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(host.clientWidth * dpr);
  const h = Math.round(host.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  gl.viewport(0, 0, w, h);
  gl.uniform2f(uniforms.uMouse, state.mx, state.my);
  gl.uniform2f(uniforms.uRes, w, h);
  gl.uniform2f(uniforms.uImg, image.naturalWidth, image.naturalHeight);
  gl.uniform1f(uniforms.uStrength, state.strength);
  gl.uniform1f(uniforms.uSpeed, state.speed);
  gl.uniform1f(uniforms.uTime, (performance.now() - state.t0) / 1000);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  if (state.target === 0 && state.strength < 0.01) {
    canvas.remove();
    host = null;
    image = null;
    raf = 0;
    return;
  }
  raf = requestAnimationFrame(frame);
}

/** Start distorting `img` (rendered inside `wrapper`, which must be position:relative). */
export function distortEnter(wrapper: HTMLElement, img: HTMLImageElement) {
  if (!img.complete || !init() || !gl || !canvas) return;
  if (host !== wrapper) {
    host = wrapper;
    image = img;
    state.strength = 0;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    wrapper.appendChild(canvas);
  }
  state.target = 1;
  if (!raf) raf = requestAnimationFrame(frame);
}

export function distortMove(e: PointerEvent, wrapper: HTMLElement) {
  const r = wrapper.getBoundingClientRect();
  state.tx = (e.clientX - r.left) / r.width;
  state.ty = 1 - (e.clientY - r.top) / r.height;
}

export function distortLeave() {
  state.target = 0;
}
