// Fresnel atmosphere halo, rendered on the back faces of a slightly larger sphere (additive).
uniform vec3 uSunDirection;
uniform vec3 uDay;
uniform vec3 uTwilight;
uniform vec3 uNight;
uniform float uIntensity;
uniform float uFalloff;

varying vec3 vNormalW;
varying vec3 vPosW;

void main() {
  vec3 viewDir = normalize(vPosW - cameraPosition);
  vec3 N = normalize(vNormalW);
  float sun = dot(N, uSunDirection);

  // deep blue at night → ember at the terminator → haze blue by day
  vec3 color = sun < 0.0
    ? mix(uNight, uTwilight, smoothstep(-0.16, 0.0, sun))
    : mix(uTwilight, uDay, smoothstep(0.0, 0.5, sun));

  // 0 at the outer silhouette → 1 towards the planet's limb
  float edge = smoothstep(0.0, uFalloff, dot(viewDir, N));
  float day = mix(0.14, 1.0, smoothstep(-0.35, 0.12, sun));
  float alpha = edge * edge * day;

  gl_FragColor = vec4(color * uIntensity, alpha);
  #include <colorspace_fragment>
}
