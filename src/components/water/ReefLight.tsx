import React, { useCallback, useRef } from 'react';
import ShaderCanvas, { FrameContext } from './ShaderCanvas';
import { useMediaQuery } from '../../lib/useMediaQuery';

/**
 * Under the surface, over the reef: sunlight comes down in moving shafts,
 * the surface shimmers overhead, and fine particles hang in the water. The
 * shafts lean toward the pointer, as if you were moving the sun.
 */

const FRAGMENT = `
uniform vec2 u_res;
uniform float u_time;
uniform float u_light;

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

float motes(vec2 p, float t, float scale, float speed) {
  vec2 q = p * scale + vec2(sin(t * 0.1) * 0.5, t * speed);
  vec2 cell = floor(q);
  vec2 f = fract(q) - 0.5;
  vec2 o = vec2(hash(cell), hash(cell + 7.1)) - 0.5;
  float d = length(f - o * 0.7);
  return smoothstep(0.06, 0.0, d) * step(0.55, hash(cell + 3.3));
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float t = u_time;

  // Depth gradient: bright turquoise near the surface, blue-green below.
  float y = p.y + 0.5;
  vec3 col = mix(vec3(0.01, 0.17, 0.25), vec3(0.06, 0.55, 0.60), smoothstep(-0.1, 1.05, y));

  // Light shafts fanning from a sun above the surface.
  vec2 src = vec2(u_light, 0.95);
  vec2 v = p - src;
  float ang = atan(v.x, -v.y);
  float r1 = noise(vec2(ang * 9.0, t * 0.18));
  float r2 = noise(vec2(ang * 23.0 - t * 0.25, 4.0));
  float rays = pow(r1 * 0.65 + r2 * 0.35, 3.0) * 2.2;
  rays *= smoothstep(1.7, 0.1, length(v)) * smoothstep(-0.6, 0.5, p.y + 0.2);
  col += vec3(0.55, 0.95, 0.88) * rays * 0.32;

  // The underside of the surface, a moving shimmer at the top.
  float surf = noise(vec2(p.x * 7.0 + t * 0.4, t * 0.3)) * noise(vec2(p.x * 15.0 - t * 0.6, 2.0));
  col += vec3(0.7, 1.0, 0.95) * surf * smoothstep(0.32, 0.5, p.y) * 0.8;

  // Marine snow, in two depths.
  col += vec3(0.8, 1.0, 0.95) * motes(p, t, 18.0, 0.05) * 0.18;
  col += vec3(0.8, 1.0, 0.95) * motes(p + 3.0, t, 34.0, 0.03) * 0.12;

  col *= 1.0 - 0.25 * pow(length(p * vec2(0.7, 1.0)), 2.0);
  gl_FragColor = vec4(col, 1.0);
}
`;

const ReefLight: React.FC<{ className?: string; pointerTarget?: React.RefObject<HTMLElement> }> = ({
  className = '',
  pointerTarget,
}) => {
  const coarse = useMediaQuery('(pointer: coarse)');
  const light = useRef(0);
  const goal = useRef(0);

  const handleMove = useCallback((x: number) => {
    goal.current = (x - 0.5) * 0.9;
  }, []);

  const onFrame = useCallback(({ gl, u, delta, time, pointer }: FrameContext) => {
    if (!pointer.active) goal.current = Math.sin(time * 0.08) * 0.35;
    light.current += (goal.current - light.current) * Math.min(1, delta * 1.6);
    gl.uniform1f(u('u_light'), light.current);
  }, []);

  return (
    <ShaderCanvas
      fragment={FRAGMENT}
      className={className}
      quality={coarse ? 0.4 : 0.5}
      maxDpr={coarse ? 1.25 : 1.5}
      onFrame={onFrame}
      onPointerMove={handleMove}
      pointerTarget={pointerTarget}
    />
  );
};

export default ReefLight;
