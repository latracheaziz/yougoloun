uniform float uPixelRatio;
uniform float uSize;

attribute vec2 aCell;   // atlas column, row
attribute float aAlpha;

varying vec2 vCell;
varying float vAlpha;

void main() {
  vCell = aCell;
  vAlpha = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = uSize * uPixelRatio;
}
