varying float vA;

void main() {
  vA = uv.x; // 0..1 around the ring
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
