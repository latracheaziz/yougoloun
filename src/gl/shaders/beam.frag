// Vertical light beam above the pin — fades upwards.
uniform vec3 uColor;
uniform float uIntensity;

varying vec2 vUv;

void main() {
  float a = pow(1.0 - vUv.y, 2.2) * uIntensity;
  gl_FragColor = vec4(uColor * a, 1.0);
}
