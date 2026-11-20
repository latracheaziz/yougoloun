// Full-screen pass drawn over the scene (before postprocessing):
//  • cover   — a noise-dissolved cloud whiteout that hides the globe → terrain swap (no visible cut)
//  • streaks — radial speed lines during the dive
// Output is premultiplied: streaks add light, the cover occludes.
uniform sampler2D uNoise;
uniform float uCover;
uniform float uStreaks;
uniform float uTime;
uniform float uAspect;
uniform vec3 uColor;

varying vec2 vUv;

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  float r = length(p);
  vec2 nuv = vUv * vec2(uAspect, 1.0);

  float n = texture2D(uNoise, nuv * 0.55 + vec2(uTime * 0.012, uTime * 0.007)).r * 0.65
          + texture2D(uNoise, nuv * 1.7 - uTime * 0.016).g * 0.35;
  // closes in from the edges, opens from the centre
  float edge = uCover * 1.4 - 0.22 - r * 0.18;
  float cover = smoothstep(n - 0.09, n + 0.09, edge);
  vec3 coverColor = uColor * (0.82 + 0.3 * n);

  float ang = atan(p.y, p.x) / 6.2831853 + 0.5;
  float s = texture2D(uNoise, vec2(ang * 6.0, r * 0.3 - uTime * 0.85)).r;
  float streak = pow(smoothstep(0.52, 0.95, s), 5.0) * smoothstep(0.1, 0.62, r) * uStreaks;

  vec3 color = coverColor * cover + vec3(1.0, 0.95, 0.88) * streak * 1.4 * (1.0 - cover);
  gl_FragColor = vec4(color, cover);
}
