uniform float uIntensity;

varying vec3 vColor;
varying float vTwinkle;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = pow(smoothstep(0.5, 0.0, d), 2.4);
  gl_FragColor = vec4(vColor * a * vTwinkle * uIntensity, 1.0);
}
