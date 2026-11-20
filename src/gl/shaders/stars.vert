uniform float uTime;
uniform float uPixelRatio;

attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;

varying vec3 vColor;
varying float vTwinkle;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float speed = 0.4 + aPhase * 1.6;
  vTwinkle = 0.62 + 0.38 * sin(uTime * speed + aPhase * 43.0);
  vColor = aColor;
  gl_PointSize = aSize * uPixelRatio * (0.85 + 0.3 * vTwinkle);
}
