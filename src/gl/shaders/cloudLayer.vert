// Cloud layers stacked in front of the camera (the group follows the camera).
// The camera "falls" through them as uTravel grows: each layer keeps a fixed world size, so it
// swells and slides outwards as it approaches — a real fly-through, not a screen fade.
attribute vec4 aLayer; // lateral x, lateral y, depth, size
attribute float aSeed;

uniform float uTravel;

varying vec2 vUv;
varying float vSeed;
varying float vFade;

void main() {
  float z = aLayer.z - uTravel; // distance ahead of the camera
  vFade = smoothstep(0.5, 4.0, z) * (1.0 - smoothstep(18.0, 30.0, z));
  vec3 p = vec3(position.xy * aLayer.w + aLayer.xy, -max(z, 0.05));
  vUv = uv;
  vSeed = aSeed;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
