// Desert terrain: baked long shadows at golden hour, hemisphere ambient, sand grain,
// aerial-perspective fog that melts into the sky horizon (with sun in-scatter).
uniform sampler2D uNoise;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uAmbientSky;
uniform vec3 uAmbientGround;
uniform vec3 uFogColor;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform float uNight;
uniform float uFogDensity;
uniform float uHaze;

varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vWorld;
varying float vShadow;

void main() {
  float grain = texture2D(uNoise, vWorld.xz * 0.21).g;
  float ripple = texture2D(uNoise, vWorld.xz * vec2(0.035, 0.09)).r;
  vec3 N = normalize(normalize(vNormal) + vec3(grain - 0.5, 0.0, ripple - 0.5) * 0.07);

  float ndl = max(dot(N, uLightDir), 0.0);
  float shadow = mix(vShadow, 1.0, uNight);
  vec3 hemi = mix(uAmbientGround, uAmbientSky, N.y * 0.5 + 0.5);
  vec3 albedo = vColor * (0.93 + 0.14 * grain);
  vec3 color = albedo * (hemi + uLightColor * ndl * shadow);

  vec3 toFrag = vWorld - cameraPosition;
  float dist = length(toFrag);
  vec3 V = toFrag / dist;
  float fog = 1.0 - exp(-pow(dist * uFogDensity * uHaze, 1.45));
  fog *= mix(0.72, 1.0, exp(-max(vWorld.y, 0.0) * 0.006));
  vec3 fogColor = uFogColor + uSunColor * pow(max(dot(V, uSunDir), 0.0), 6.0) * 0.6 * (1.0 - uNight);
  color = mix(color, fogColor, clamp(fog, 0.0, 1.0));

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
