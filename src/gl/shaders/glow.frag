// Soft glowing point (beacons, sparks). HDR core so bloom picks it up.
uniform vec3 uColor;
uniform float uIntensity;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float core = exp(-d * d * 40.0) * 3.0;
  float halo = exp(-d * 4.5) * 0.7;
  float a = (core + halo) * (1.0 - smoothstep(0.85, 1.0, d));
  gl_FragColor = vec4(uColor * a * uIntensity, 1.0);
}
