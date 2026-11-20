// Expanding sonar rings (Hail beacon on the globe, the pin's ground ring in Hail).
uniform vec3 uColor;
uniform float uIntensity;
uniform float uTime;

varying vec2 vUv;

void main() {
  float r = length(vUv - 0.5) * 2.0;
  float rings = 0.0;
  for (int i = 0; i < 3; i++) {
    float t = fract(uTime * 0.45 + float(i) / 3.0);
    rings += exp(-pow((r - t) * 22.0, 2.0)) * (1.0 - t);
  }
  float core = exp(-r * r * 60.0) * 1.5;
  float a = (rings * 1.4 + core) * (1.0 - smoothstep(0.9, 1.0, r));
  gl_FragColor = vec4(uColor * a * uIntensity, 1.0);
}
