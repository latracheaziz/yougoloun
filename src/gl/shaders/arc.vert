attribute float aSeed;

varying float vT;
varying float vSeed;

void main() {
  vT = uv.x; // 0 at the city → 1 at Hail
  vSeed = aSeed;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
