uniform vec3 uColor;
uniform float uOpacity;

varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.0, d) * vAlpha * uOpacity;
  gl_FragColor = vec4(uColor * a, 1.0);
}
