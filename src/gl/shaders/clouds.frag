// Cloud shell: lit white by day, ember-tinted at the terminator, a faint ghost at night.
uniform sampler2D uClouds;
uniform vec3 uSunDirection;
uniform vec3 uTwilight;
uniform float uCloudOffset;
uniform float uOpacity;

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;

void main() {
  float c = texture2D(uClouds, vUv + vec2(uCloudOffset, 0.0)).r;
  c = smoothstep(0.1, 0.85, c);

  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vPosW);
  float sun = dot(N, uSunDirection);
  float lit = smoothstep(-0.03, 0.35, sun);

  vec3 dayColor = mix(uTwilight * 1.15, vec3(1.0), smoothstep(0.0, 0.26, sun)) * (0.3 + 0.8 * max(sun, 0.0));
  vec3 color = mix(vec3(0.012, 0.018, 0.035), dayColor, lit);

  float alpha = c * mix(0.2, 0.95, lit) * uOpacity;
  alpha *= smoothstep(0.0, 0.28, dot(N, V)); // soften towards the limb

  gl_FragColor = vec4(color, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
