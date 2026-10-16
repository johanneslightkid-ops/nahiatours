import React, { useCallback, useRef } from 'react';
import ShaderCanvas, { FrameContext } from './ShaderCanvas';
import { useMediaQuery } from '../../lib/useMediaQuery';

/**
 * The open Caribbean at the end of the day, looking east from the beach.
 *
 * A real (if small) ocean: a sum of travelling waves seen in perspective,
 * reflecting a sky that is computed for every reflected ray, with Fresnel,
 * a glitter path under the sun and haze toward the horizon. The pointer holds
 * the sun — move it and the evening follows, from gold to flamboyán red as the
 * sun nears the water.
 */

const FRAGMENT = `
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_sun;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 w = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), w.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), w.x), w.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.1 + 3.1;
    a *= 0.5;
  }
  return v;
}

vec3 sunDirection() {
  return normalize(vec3(u_sun.x, u_sun.y, 1.0));
}

vec3 skyColor(vec3 d, vec3 sunDir, float lowSun) {
  float y = max(d.y, 0.0);
  vec3 zenith = mix(vec3(0.16, 0.36, 0.66), vec3(0.20, 0.17, 0.45), lowSun);
  vec3 horizon = mix(vec3(1.0, 0.86, 0.62), vec3(1.0, 0.52, 0.36), lowSun);
  vec3 col = mix(horizon, zenith, pow(y, 0.45));
  float s = max(dot(d, sunDir), 0.0);
  vec3 sunCol = mix(vec3(1.0, 0.92, 0.7), vec3(1.0, 0.62, 0.32), lowSun);
  col += sunCol * (pow(s, 6.0) * 0.35 + pow(s, 48.0) * 0.6);
  col += vec3(1.0, 0.97, 0.88) * smoothstep(0.9993, 0.9997, s) * 2.0;

  // Trade-wind cloud streaks, lit from below by the sun.
  if (d.y > 0.0) {
    vec2 uv = d.xz / (d.y + 0.08);
    float c = fbm(uv * vec2(0.9, 2.4) + vec2(u_time * 0.012, 0.0));
    c = smoothstep(0.52, 0.82, c) * smoothstep(0.0, 0.08, d.y) * (1.0 - smoothstep(0.35, 0.7, d.y));
    vec3 cloudCol = mix(vec3(1.0, 0.78, 0.62), vec3(0.98, 0.55, 0.55), lowSun) * (0.75 + 0.5 * pow(s, 4.0));
    col = mix(col, cloudCol, c * 0.75);
  }
  return col;
}

// Travelling waves in world space; returns the height gradient.
vec2 waveGradient(vec2 x, float t, float detail) {
  vec2 g = vec2(0.0);
  float amp = 0.22;
  float freq = 0.28;
  float ang = 0.3;
  for (int i = 0; i < 7; i++) {
    vec2 dir = vec2(cos(ang), sin(ang));
    float phase = dot(dir, x) * freq + t * sqrt(9.8 * freq) * 0.55;
    g += dir * amp * freq * cos(phase);
    amp *= mix(0.62, 0.58, detail);
    freq *= 1.72;
    ang += 1.9;
  }
  return g;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float t = u_time;
  float horizonY = -0.06;
  vec3 sunDir = sunDirection();
  float lowSun = 1.0 - smoothstep(0.02, 0.32, u_sun.y);

  vec3 d = normalize(vec3(p.x, p.y - horizonY, 1.55));
  vec3 col;

  if (d.y > 0.0) {
    col = skyColor(d, sunDir, lowSun);
  } else {
    float camH = 2.2;
    float dist = camH / -d.y;
    vec2 world = d.xz * dist + vec2(0.0, t * 0.6);
    float detail = exp(-dist * 0.03);
    vec2 g = waveGradient(world, t, detail) * (0.35 + 0.65 * detail);
    vec3 n = normalize(vec3(-g.x, 1.0, -g.y));

    vec3 r = reflect(d, n);
    r.y = abs(r.y);
    vec3 refl = skyColor(r, sunDir, lowSun);
    float fresnel = 0.03 + 0.97 * pow(1.0 - max(dot(-d, n), 0.0), 5.0);

    vec3 deep = mix(vec3(0.02, 0.24, 0.32), vec3(0.08, 0.14, 0.24), lowSun);
    // Light through the backs of the waves: Caribbean turquoise.
    float sss = pow(max(dot(d, -sunDir) * -1.0, 0.0), 2.0) * max(g.x + g.y, 0.0) * 1.6;
    vec3 body = deep + vec3(0.05, 0.42, 0.40) * (sss + 0.12) * (1.0 - lowSun * 0.6);

    col = mix(body, refl, fresnel);

    vec3 sunCol = mix(vec3(1.0, 0.95, 0.8), vec3(1.0, 0.66, 0.38), lowSun);
    float glitter = pow(max(dot(r, sunDir), 0.0), 900.0) * 18.0 + pow(max(dot(r, sunDir), 0.0), 90.0) * 0.6;
    col += sunCol * glitter * (0.4 + 0.6 * detail);

    vec3 haze = skyColor(vec3(d.x, 0.0, d.z), sunDir, lowSun);
    col = mix(col, haze, 1.0 - exp(-dist * 0.018));
  }

  // A gentle grade: deepen the top so white copy holds, and a vignette.
  col *= 1.0 - 0.28 * smoothstep(0.05, 0.5, p.y);
  col *= 1.0 - 0.2 * pow(length(p * vec2(0.6, 1.0)), 2.0);
  col = pow(col, vec3(0.95));
  gl_FragColor = vec4(col, 1.0);
}
`;

const CaribbeanSea: React.FC<{ className?: string; pointerTarget?: React.RefObject<HTMLElement> }> = ({
  className = '',
  pointerTarget,
}) => {
  const coarse = useMediaQuery('(pointer: coarse)');
  const sun = useRef({ x: 0.4, y: 0.1 });

  // A ray through screen point p is (p.x, p.y - horizon, 1.55), so the sun
  // sits under the pointer when its direction is that ray divided by 1.55.
  const onFrame = useCallback(({ gl, u, delta, time, pointer, width, height }: FrameContext) => {
    const aspect = width / height;
    let gx: number;
    let gy: number;
    if (pointer.active) {
      gx = ((pointer.x - 0.5) * aspect) / 1.55;
      gy = Math.min(0.32, Math.max(0.0, (pointer.y - 0.5 + 0.06) / 1.55));
    } else {
      // Left alone it rests off to the side, clear of the headline, and
      // drifts a little through the evening.
      gx = ((0.3 + Math.sin(time * 0.05) * 0.08) * aspect) / 1.55;
      gy = 0.07 + Math.sin(time * 0.07) * 0.03;
    }
    const k = Math.min(1, delta * 2.2);
    sun.current.x += (gx - sun.current.x) * k;
    sun.current.y += (gy - sun.current.y) * k;
    gl.uniform2f(u('u_sun'), sun.current.x, sun.current.y);
  }, []);

  return (
    <ShaderCanvas
      fragment={FRAGMENT}
      className={className}
      quality={coarse ? 0.45 : 0.6}
      maxDpr={coarse ? 1.25 : 1.5}
      onFrame={onFrame}
      pointerTarget={pointerTarget}
    />
  );
};

export default CaribbeanSea;
