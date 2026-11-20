// Sun peeking over the limb: hot core, soft glow, starburst rays, anamorphic streak, faint ghost ring.
uniform vec3 uColor;
uniform vec3 uCore;
uniform float uIntensity;
uniform float uTime;

varying vec2 vUv;

void main() {
  vec2 p = vUv - 0.5;
  float r = length(p);
  float a = atan(p.y, p.x);

  float core = exp(-r * r * 1400.0) * 5.0;
  float glow = exp(-r * 10.0) * 0.85;
  float halo = exp(-pow((r - 0.3) * 30.0, 2.0)) * 0.045;
  float shimmer = 0.85 + 0.15 * sin(uTime * 0.7 + a * 3.0);
  float rays = (pow(abs(sin(a * 7.0 + 0.6)), 28.0) * exp(-r * 7.5) * 0.55
             + pow(abs(sin(a * 13.0 + 1.9)), 48.0) * exp(-r * 9.0) * 0.35) * shimmer;
  float streak = exp(-abs(p.y) * 260.0) * exp(-abs(p.x) * 9.0) * 0.8;

  vec3 color = uColor * (glow + halo + rays) + uCore * (core + streak);
  float edgeFade = smoothstep(0.5, 0.4, max(abs(p.x), abs(p.y)));

  gl_FragColor = vec4(color * uIntensity * edgeFade, 1.0);
}
