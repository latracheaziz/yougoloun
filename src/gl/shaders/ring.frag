// Orbital ring: draws itself on, then a comet with a long tail keeps circling.
uniform float uReveal;
uniform float uOpacity;
uniform float uTime;
uniform float uSpeed;
uniform float uPhase;
uniform vec3 uColor;

varying float vA;

void main() {
  if (vA > uReveal) discard;

  float headAt = fract(uTime * uSpeed + uPhase);
  float behind = fract(headAt - vA);                       // 0 at the head, grows along the tail
  float tail = exp(-behind * 7.0);
  float head = exp(-pow(min(behind, 1.0 - behind) * 90.0, 2.0));
  float edge = exp(-pow((uReveal - vA) * 60.0, 2.0)) * step(uReveal, 0.999); // drawing tip

  vec3 color = uColor * (0.2 + 1.3 * tail + 3.2 * head + 2.4 * edge);
  gl_FragColor = vec4(color * uOpacity, 1.0);
}
