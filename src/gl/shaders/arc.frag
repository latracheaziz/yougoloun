// City → Hail arcs: staggered draw-on, a hot head while drawing, and light pulses travelling to Hail.
uniform float uDraw;
uniform float uOpacity;
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uHot;

varying float vT;
varying float vSeed;

void main() {
  float local = clamp((uDraw - vSeed * 0.45) / 0.55, 0.0, 1.0);
  if (vT > local) discard;

  float drawing = step(0.001, local) * (1.0 - step(0.999, local));
  float head = exp(-pow((vT - local) * 28.0, 2.0)) * drawing;
  float pulseAt = fract(uTime * 0.24 + vSeed * 3.7);
  float pulse = exp(-pow((vT - pulseAt) * 16.0, 2.0));
  float base = 0.22 + 0.45 * vT; // brighter as it converges on Hail

  vec3 color = uColor * base + uHot * (pulse * 1.6 + head * 2.6);
  gl_FragColor = vec4(color * uOpacity, 1.0);
}
