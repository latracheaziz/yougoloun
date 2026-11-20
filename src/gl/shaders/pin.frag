// The location pin: glossy ember with a hot rim, lit by the Hail light.
uniform vec3 uColor;
uniform vec3 uRim;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uAmbient;
uniform float uGlow;

varying vec3 vNormalW;
varying vec3 vPosW;

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vPosW);
  float ndl = max(dot(N, uLightDir), 0.0);
  vec3 H = normalize(uLightDir + V);
  float spec = pow(max(dot(N, H), 0.0), 60.0);
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.5);
  vec3 color = uColor * (uAmbient * 1.4 + uLightColor * ndl)
             + uLightColor * spec * 0.8
             + uRim * fresnel * (0.8 + uGlow * 2.0)
             + uColor * uGlow * 0.6;
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
