// Earth surface: day albedo + relief, warm city lights on the night side, ocean glint,
// cloud shadows, golden-hour terminator and limb haze. Outputs linear HDR (bloom picks up > 1).
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform sampler2D uNormalMap;
uniform sampler2D uOcean;
uniform sampler2D uClouds;
uniform vec3 uSunDirection;
uniform vec3 uAtmosphereDay;
uniform vec3 uAtmosphereTwilight;
uniform vec3 uAtmosphereNight;
uniform vec3 uCityLights;
uniform float uNightLights;
uniform float uCloudOffset;
uniform float uNormalStrength;

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vEastW;
varying vec3 vPosW;

void main() {
  vec3 N0 = normalize(vNormalW);
  vec3 T = normalize(vEastW - N0 * dot(vEastW, N0));
  vec3 B = cross(N0, T);
  vec3 tn = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
  tn.xy *= uNormalStrength;
  vec3 N = normalize(T * tn.x + B * tn.y + N0 * tn.z);

  vec3 V = normalize(cameraPosition - vPosW);
  float sunGeo = dot(N0, uSunDirection);
  float sunDetail = dot(N, uSunDirection);
  float dayMix = smoothstep(-0.06, 0.2, sunGeo);

  // Day side
  vec3 day = texture2D(uDay, vUv).rgb;
  vec3 dayColor = day * (0.015 + 1.12 * max(sunDetail, 0.0));

  // Night side: drop the map's blue base, keep warm city lights
  vec3 nightTex = texture2D(uNight, vUv).rgb;
  float lum = dot(nightTex, vec3(0.2126, 0.7152, 0.0722));
  float cities = smoothstep(0.06, 0.55, lum);
  vec3 nightColor = nightTex * 0.06 + uCityLights * pow(cities, 1.5) * 3.4 * uNightLights;

  vec3 color = mix(nightColor, dayColor, dayMix);

  // Cloud shadows
  float cloudShadow = texture2D(uClouds, vUv + vec2(uCloudOffset + 0.0015, 0.001)).r;
  color *= 1.0 - 0.45 * cloudShadow * dayMix;

  // Atmosphere tint: deep blue at night → ember at the terminator → haze blue by day
  vec3 atmosphere = sunGeo < 0.0
    ? mix(uAtmosphereNight, uAtmosphereTwilight, smoothstep(-0.14, 0.0, sunGeo))
    : mix(uAtmosphereTwilight, uAtmosphereDay, smoothstep(0.0, 0.45, sunGeo));

  // Ocean glint
  float ocean = texture2D(uOcean, vUv).r;
  vec3 R = reflect(-uSunDirection, N0);
  float rv = max(dot(R, V), 0.0);
  float fresnel = pow(1.0 - max(dot(N0, V), 0.0), 2.0);
  vec3 glintColor = mix(vec3(1.0, 0.94, 0.82), atmosphere, fresnel);
  color += (pow(rv, 48.0) * 1.5 + pow(rv, 6.0) * 0.06) * ocean * glintColor * smoothstep(-0.05, 0.2, sunGeo);

  // Golden-hour band along the terminator
  float band = smoothstep(-0.1, 0.0, sunGeo) * (1.0 - smoothstep(0.0, 0.2, sunGeo));
  color += uAtmosphereTwilight * band * 0.06;

  // Limb haze (faint on the night side, strong where the sun grazes)
  float limb = pow(1.0 - max(dot(N0, V), 0.0), 3.0);
  color = mix(color, atmosphere * 1.4, limb * mix(0.12, 0.9, smoothstep(-0.08, 0.3, sunGeo)));

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
