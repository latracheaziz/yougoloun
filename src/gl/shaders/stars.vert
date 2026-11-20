uniform float uTime;
uniform float uPixelRatio;
uniform float uHorizonFade;

attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;

varying vec3 vColor;
varying float vTwinkle;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float speed = 0.4 + aPhase * 1.6;
  // in the Hail world the field is centred on the camera: hide what would be below the horizon
  float horizon = mix(1.0, smoothstep(0.0, 0.12, normalize(position).y), uHorizonFade);
  vTwinkle = (0.62 + 0.38 * sin(uTime * speed + aPhase * 43.0)) * horizon;
  vColor = aColor;
  gl_PointSize = aSize * uPixelRatio * (0.85 + 0.3 * vTwinkle);
}
