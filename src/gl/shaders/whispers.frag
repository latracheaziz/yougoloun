// A word from the atlas inside a square point sprite (cells are 4:1, so only the middle band is used).
uniform sampler2D uAtlas;
uniform vec2 uGrid;      // columns, rows
uniform vec3 uColor;
uniform float uOpacity;

varying vec2 vCell;
varying float vAlpha;

void main() {
  const float BAND = 0.125; // half-height of a 4:1 word band inside a square sprite
  vec2 pc = gl_PointCoord;
  if (abs(pc.y - 0.5) > BAND) discard;
  float localY = (pc.y - (0.5 - BAND)) / (2.0 * BAND); // 0 at the top of the word
  vec2 uv = vec2((vCell.x + pc.x) / uGrid.x, 1.0 - (vCell.y + localY) / uGrid.y);
  float a = texture2D(uAtlas, uv).a;
  gl_FragColor = vec4(uColor * a * vAlpha * uOpacity, 1.0);
}
