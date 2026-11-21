// Bright brand sky behind the stars: navy base, a brand-blue nebula glowing around the Earth,
// a brand-green cloud below it, soft fbm wisps everywhere. Outputs linear HDR.
uniform vec3 uBase;
uniform vec3 uBlue;
uniform vec3 uGreen;
uniform vec3 uBlueDir;
uniform vec3 uGreenDir;
uniform float uIntensity;

varying vec3 vDir;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 d = normalize(vDir);
  float n = fbm(d * 3.2);
  float wisps = smoothstep(0.38, 0.8, n);

  float blue = max(dot(d, uBlueDir), 0.0);
  float green = max(dot(d, uGreenDir), 0.0);
  float blueCore = pow(blue, 4.0);
  float blueWide = pow(blue, 1.6);
  float greenCore = pow(green, 5.0);

  vec3 color = uBase;
  color += uBlue * (blueWide * 0.35 + blueCore * 0.6) * (0.65 + 0.7 * wisps);
  color += uGreen * greenCore * (0.5 + 0.9 * wisps);
  color += uBlue * wisps * 0.12;

  gl_FragColor = vec4(color * uIntensity, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
