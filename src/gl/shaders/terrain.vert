attribute vec3 aColor;
attribute float aShadow;

varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vWorld;
varying float vShadow;

void main() {
  vColor = aColor;
  vShadow = aShadow;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
