varying vec3 vDir;

void main() {
  vDir = position; // the dome is centred on the camera
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = clip.xyww; // pin to the far plane
}
