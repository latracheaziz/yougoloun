// Sky over Hail: golden hour (low sun behind Aja) → night with the Milky Way arching overhead.
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform vec3 uGalaxyNormal;
uniform vec3 uGalaxyColor;
uniform float uNight;

varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  vec3 color = mix(uHorizon, uZenith, pow(smoothstep(-0.02, 0.55, y), 0.65));
  color = mix(color, uGround, smoothstep(0.0, -0.12, y));

  float s = max(dot(d, uSunDir), 0.0);
  float day = 1.0 - uNight;
  color += uSunColor * (pow(s, 8.0) * 0.45 + pow(s, 90.0) * 1.3) * day;
  color += uSunColor * smoothstep(0.99962, 0.99984, s) * 10.0 * day;      // sun disc
  color += uSunColor * exp(-abs(y) * 13.0) * pow(s, 2.0) * 0.4 * day;     // horizon glow

  // Milky Way: a soft, slightly mottled band along the galactic plane
  float g = dot(d, uGalaxyNormal);
  float mottle = 0.65 + 0.35 * sin(d.x * 23.0 + sin(d.z * 17.0) * 2.0) * sin(d.y * 19.0 + d.z * 7.0);
  float band = exp(-g * g * 34.0) * mottle + exp(-g * g * 260.0) * 0.6;
  color += uGalaxyColor * band * smoothstep(0.0, 0.2, y) * uNight;

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
