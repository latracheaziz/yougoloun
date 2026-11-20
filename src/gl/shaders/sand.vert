// Wind-blown sand: drifting west → east, wrapping inside a box around the pin.
uniform float uTime;
uniform float uPixelRatio;

attribute float aSpeed;
attribute float aSize;

varying float vAlpha;

void main() {
  vec3 p = position;
  p.x = mod(p.x + uTime * aSpeed * 9.0 + 200.0, 400.0) - 200.0;
  p.y += sin(uTime * 0.9 + position.x * 0.05) * 0.9 + sin(uTime * 2.3 + position.z) * 0.25;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (55.0 / max(-mv.z, 1.0));
  vAlpha = smoothstep(300.0, 50.0, -mv.z) * smoothstep(1.0, 8.0, -mv.z);
}
