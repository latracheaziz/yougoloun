// Sky sphere that follows the camera: the fragment only needs the view direction.
varying vec3 vDir;

void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
