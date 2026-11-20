// Shared vertex shader for the globe, cloud shell and atmosphere.
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vEastW;
varying vec3 vPosW;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vPosW = worldPos.xyz;
  mat3 m = mat3(modelMatrix);
  vNormalW = normalize(m * normal);
  // East tangent of the sphere (d/dlon) — see src/gl/geo.ts for the longitude convention.
  vec3 east = vec3(position.z, 0.0, -position.x);
  vEastW = m * (length(east) > 1e-5 ? normalize(east) : vec3(0.0, 0.0, -1.0));
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
