// Cumulus layer: crisp puffy edges, sun-lit from the west (screen-left during the dive),
// shaded underneath, a silver lining where the cloud thins out.
uniform sampler2D uNoise;
uniform vec3 uLit;
uniform vec3 uShade;
uniform float uOpacity;
uniform float uTime;

varying vec2 vUv;
varying float vSeed;
varying float vFade;

void main() {
  vec2 q = vUv * 0.75 + vec2(vSeed * 13.1, vSeed * 7.3) + vec2(uTime * 0.003, 0.0);
  float n = texture2D(uNoise, q).r;
  float n2 = texture2D(uNoise, q * 2.3 + 0.31).g;
  float n3 = texture2D(uNoise, q * 5.3 + 0.77).r;
  float d = n * 0.6 + n2 * 0.28 + n3 * 0.12;
  float radial = 1.0 - smoothstep(0.08, 0.5, length(vUv - 0.5));
  float density = smoothstep(0.52, 0.64, d * 0.62 + radial * 0.48);
  float a = density * vFade * uOpacity;
  if (a < 0.004) discard;

  float light = clamp(0.5 + (0.5 - vUv.x) * 0.7 + (vUv.y - 0.5) * 0.35 + (n3 - 0.5) * 0.8, 0.0, 1.0);
  vec3 color = mix(uShade, uLit, light);
  color += uLit * (1.0 - smoothstep(0.0, 0.4, density)) * 0.35; // silver lining
  gl_FragColor = vec4(color, a);
}
