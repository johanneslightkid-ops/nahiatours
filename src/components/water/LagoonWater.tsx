import React, { useCallback, useRef } from 'react';
import ShaderCanvas, { FrameContext } from './ShaderCanvas';
import { useMediaQuery } from '../../lib/useMediaQuery';

/**
 * The shoreline at El Cortecito, seen from above.
 *
 * Dry sand on one side, the swash running up and back across it, and the
 * shallow Bávaro lagoon on the other: refracted sand ripples, caustic light
 * nets on the bottom, palm fronds throwing shade, and a few fish whose
 * shadows slide over the sand. Touch the water and it rings; move through it
 * and the fish scatter.
 *
 * Everything is one fragment shader. The fish and the ripple rings are
 * simulated here in JavaScript — a handful of floats a frame — and handed to
 * the shader as uniforms.
 */

const MAX_RIPPLES = 10;
const FISH = 4;

const FRAGMENT = `
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_pointer;
uniform vec4 u_ripples[${MAX_RIPPLES}];
uniform vec4 u_fish[${FISH}];
uniform vec3 u_shore;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 w = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

// Signed distance into the water: negative on the beach, positive offshore.
float shoreline(vec2 p, float t) {
  vec2 dir = u_shore.xy;
  vec2 perp = vec2(-dir.y, dir.x);
  float along = dot(p, perp);
  float wobble = 0.045 * sin(along * 2.6 + 0.8) + 0.02 * sin(along * 6.1 + 2.3)
               + 0.03 * (fbm(vec2(along * 3.0, 4.0)) - 0.5);
  // The swash: each set of waves runs up the sand and slides back.
  float swash = 0.028 * sin(t * 0.75) + 0.012 * sin(t * 1.63 + 1.1);
  return dot(p, dir) - u_shore.z + wobble + swash;
}

float waves(vec2 p, float t) {
  float h = 0.0;
  h += sin(dot(p, vec2(0.80, 0.60)) * 9.0 - t * 1.30) * 0.50;
  h += sin(dot(p, vec2(-0.45, 0.89)) * 14.0 - t * 1.85) * 0.28;
  h += sin(dot(p, vec2(0.96, -0.28)) * 23.0 - t * 2.60) * 0.14;
  h += (noise(p * 9.0 + vec2(t * 0.35, -t * 0.22)) - 0.5) * 0.9;
  h += (noise(p * 21.0 - vec2(t * 0.5, t * 0.4)) - 0.5) * 0.35;
  return h * 0.010;
}

float ripples(vec2 p, float t) {
  float h = 0.0;
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec4 r = u_ripples[i];
    float age = t - r.z;
    if (r.w <= 0.0 || age < 0.0 || age > 4.5) continue;
    float d = length(p - r.xy);
    float front = age * 0.30;
    float band = d - front;
    float env = exp(-age * 1.05) * exp(-band * band * 260.0);
    // The inner trailing rings decay faster than the leading one.
    float trail = exp(-age * 1.8) * smoothstep(0.0, -0.15, band) * exp(band * 6.0);
    h += (sin(band * 85.0) * env + sin(band * 60.0) * trail * 0.5) * r.w;
  }
  return h * 0.0055;
}

float height(vec2 p, float t) {
  return waves(p, t) + ripples(p, t);
}

vec3 sand(vec2 q) {
  float n = fbm(q * 3.0);
  vec3 dry = mix(vec3(0.957, 0.898, 0.776), vec3(0.918, 0.835, 0.682), n);
  // Ripple marks the current leaves on the bottom.
  float marks = sin((q.x * 0.6 + q.y) * 58.0 + fbm(q * 2.5) * 9.0);
  dry *= 1.0 + marks * 0.025;
  dry += (hash(q * 900.0) - 0.5) * 0.05;
  return dry;
}

vec2 fishLocal(vec2 p, vec4 f) {
  vec2 d = p - f.xy;
  vec2 dir = f.zw;
  return vec2(dot(d, dir), dot(d, vec2(-dir.y, dir.x)));
}

// 1 inside a little fish silhouette, soft at the edge.
float fishShape(vec2 l, float t, float seed) {
  float wiggle = sin(t * 9.0 + seed * 6.0 - l.x * 45.0) * 0.006 * smoothstep(0.03, -0.06, l.x);
  l.y += wiggle;
  float body = length(l / vec2(0.048, 0.016));
  float tail = 0.0;
  if (l.x < -0.036 && l.x > -0.078) {
    float spread = (-l.x - 0.036) * 0.75;
    tail = 1.0 - smoothstep(spread - 0.004, spread + 0.004, abs(l.y));
  }
  return max(1.0 - smoothstep(0.85, 1.05, body), tail);
}

// Palm fronds overhead, swaying, throwing soft dappled shade on the sand.
float palmShade(vec2 p, float t, float aspect) {
  vec2 c = vec2(-aspect * 0.5 - 0.08, 0.62);
  vec2 v = p - c;
  float r = length(v);
  float ang = atan(v.y, v.x);
  float shade = 0.0;
  for (int k = 0; k < 6; k++) {
    float fk = float(k);
    float a = -1.55 + fk * 0.36 + sin(t * 0.6 + fk * 1.7) * 0.035;
    float da = ang - a - r * 0.18 * sin(fk * 2.0);
    float width = 0.16 * smoothstep(0.0, 0.25, r) * (1.0 - smoothstep(0.7, 1.15, r));
    float spine = 1.0 - smoothstep(width * 0.55, width, abs(da));
    float leaflets = smoothstep(-0.5, 0.8, sin(r * 70.0 + sign(da) * 2.0));
    shade = max(shade, spine * mix(1.0, leaflets, smoothstep(0.02, 0.06, abs(da))));
  }
  // High fronds throw soft shade that fades with distance from the trunk.
  return shade * (1.0 - smoothstep(0.45, 1.05, length(v))) * mix(0.55, 1.0, smoothstep(0.8, 1.4, aspect));
}

float caustic(vec2 p, float t) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float f1 = 8.0;
  float f2 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash2(i + g);
      o = 0.5 + 0.42 * sin(t * 0.8 + 6.2831 * o);
      float d = length(g + o - f);
      if (d < f1) { f2 = f1; f1 = d; }
      else if (d < f2) { f2 = d; }
    }
  }
  return f2 - f1;
}

void main() {
  float aspect = u_res.x / u_res.y;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float t = u_time;

  float s = shoreline(p, t);
  float water = smoothstep(-0.004, 0.006, s);
  float depth = clamp(s * 1.25, 0.0, 1.0);
  depth = depth * (0.75 + 0.5 * fbm(p * 1.4 + 3.0));

  // Surface normal from the height field.
  float e = 1.5 / u_res.y;
  float h0 = height(p, t);
  float hx = height(p + vec2(e, 0.0), t);
  float hy = height(p + vec2(0.0, e), t);
  vec3 n = normalize(vec3(-(hx - h0) / e, -(hy - h0) / e, 1.0));
  n = normalize(mix(vec3(0.0, 0.0, 1.0), n, water));

  // Bottom, seen through the surface.
  vec2 q = p + n.xy * (0.02 + depth * 0.09);
  vec3 bottom = sand(q);

  // Light nets on the bottom, strongest in the shallows.
  float c1 = caustic(q * 7.5 + n.xy * 1.5, t);
  float c2 = caustic(q * 11.0 - n.xy * 2.0 + 3.7, t * 1.2);
  float caust = pow(1.0 - smoothstep(0.0, 0.14, c1), 2.0) * 0.6
              + pow(1.0 - smoothstep(0.0, 0.10, c2), 2.0) * 0.4;
  bottom += vec3(1.0, 0.98, 0.9) * caust * (0.55 - depth * 0.3) * water;

  // Fish shadows on the bottom, and the fish themselves a little above.
  float fishShadow = 0.0;
  float fishBody = 0.0;
  for (int i = 0; i < ${FISH}; i++) {
    vec4 f = u_fish[i];
    float seed = float(i) * 1.37;
    vec2 off = vec2(0.03, -0.035) * (0.4 + depth);
    fishShadow = max(fishShadow, fishShape(fishLocal(q - off, f), t, seed));
    fishBody = max(fishBody, fishShape(fishLocal(q, f), t, seed));
  }
  bottom *= 1.0 - fishShadow * 0.32 * water;

  // Water: the reds go first, then the greens — Caribbean turquoise.
  vec3 absorb = vec3(2.4, 0.62, 0.42);
  vec3 trans = exp(-absorb * (depth * 1.6 + 0.08));
  vec3 scatter = mix(vec3(0.38, 0.86, 0.80), vec3(0.03, 0.43, 0.52), smoothstep(0.1, 1.0, depth));
  vec3 under = bottom * trans + scatter * (1.0 - trans) * 0.95;
  under = mix(under, vec3(0.05, 0.36, 0.38), fishBody * 0.55 * water);

  // Surface light: sun glints and a breath of sky.
  vec3 L = normalize(vec3(-0.45, 0.55, 0.9));
  vec3 R = reflect(-L, n);
  float spec = pow(max(R.z, 0.0), 160.0);
  float sky = 1.0 - n.z;
  vec3 col = under + vec3(1.0, 0.98, 0.92) * spec * 1.4 * water;
  col = mix(col, vec3(0.75, 0.93, 1.0), clamp(sky * 6.0, 0.0, 0.35) * water);

  // The beach: dry sand, darkened where the last wave reached.
  vec3 beach = sand(p);
  float wet = smoothstep(-0.09, 0.0, s);
  beach *= 1.0 - wet * 0.16;
  beach = mix(beach, beach * vec3(0.9, 0.93, 0.92), wet * 0.6);
  float lastReach = shoreline(p, t - 1.8) + 0.03;
  beach *= 1.0 - smoothstep(0.006, 0.0, abs(lastReach)) * 0.05 * (1.0 - water);

  col = mix(beach, col, water);

  // Foam lace where the swash breaks on the sand.
  float lace = fbm(p * 26.0 + vec2(t * 0.6, -t * 0.4));
  float edge = 1.0 - smoothstep(0.0, 0.022, abs(s - 0.004));
  float trail = smoothstep(0.07, 0.0, s) * smoothstep(-0.002, 0.012, s);
  float foam = clamp(edge * smoothstep(0.32, 0.6, lace) + trail * smoothstep(0.58, 0.72, lace) * 0.8, 0.0, 1.0);
  col = mix(col, vec3(1.0, 0.995, 0.97), foam * 0.88);

  // Shade from the palms overhead, mostly over the sand.
  float shade = palmShade(p, t, aspect);
  col *= 1.0 - shade * mix(0.17, 0.09, water);

  // The pointer is a little sun on the water.
  if (u_pointer.z > 0.5) {
    vec2 pp = vec2((u_pointer.x - 0.5) * aspect, u_pointer.y - 0.5);
    float glow = exp(-length(p - pp) * 9.0) * water;
    col += vec3(0.9, 1.0, 0.95) * glow * 0.08;
  }

  // Soft vignette, warm at the top where the sun is.
  float vig = 1.0 - 0.18 * pow(length(p * vec2(0.75, 1.0)), 2.0);
  col *= vig;
  col += vec3(0.04, 0.03, 0.0) * smoothstep(0.1, 0.5, p.y);

  gl_FragColor = vec4(col, 1.0);
}
`;

interface Ripple {
  x: number;
  y: number;
  start: number;
  strength: number;
}

interface Fish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  wander: number;
}

interface LagoonWaterProps {
  className?: string;
  /** Element that counts as touching the water. */
  pointerTarget?: React.RefObject<HTMLElement>;
}

const LagoonWater: React.FC<LagoonWaterProps> = ({ className = '', pointerTarget }) => {
  // On a portrait screen the beach is at the top and the lagoon below it; on
  // a wide one the beach holds the copy on the left and the water opens up to
  // the right.
  const portrait = useMediaQuery('(max-aspect-ratio: 1/1)');
  const coarse = useMediaQuery('(pointer: coarse)');

  const shoreRef = useRef({ dx: 0.94, dy: -0.34, offset: 0.06 });
  shoreRef.current = portrait
    ? { dx: 0.22, dy: -0.975, offset: 0.13 }
    : { dx: 0.94, dy: -0.34, offset: 0.06 };

  const ripples = useRef<Ripple[]>([]);
  const fish = useRef<Fish[]>([]);
  const clock = useRef(0);
  const aspectRef = useRef(1.6);
  const lastSpawn = useRef({ x: 0, y: 0, at: 0 });
  const nextDrop = useRef(1.2);
  const uniformBuffer = useRef({
    ripples: new Float32Array(MAX_RIPPLES * 4),
    fish: new Float32Array(FISH * 4),
  });

  const shoreDistance = (x: number, y: number) => {
    const s = shoreRef.current;
    return x * s.dx + y * s.dy - s.offset;
  };

  const spawn = (x: number, y: number, strength: number) => {
    if (shoreDistance(x, y) < -0.01) return;
    ripples.current.push({ x, y, start: clock.current, strength });
    if (ripples.current.length > MAX_RIPPLES) ripples.current.shift();
  };

  const toWater = (x: number, y: number) => ({
    x: (x - 0.5) * aspectRef.current,
    y: y - 0.5,
  });

  const handleMove = useCallback((x: number, y: number) => {
    const p = toWater(x, y);
    const last = lastSpawn.current;
    const moved = Math.hypot(p.x - last.x, p.y - last.y);
    if (moved > 0.045 && clock.current - last.at > 0.09) {
      spawn(p.x, p.y, 0.32);
      lastSpawn.current = { x: p.x, y: p.y, at: clock.current };
    }
  }, []);

  const handleDown = useCallback((x: number, y: number) => {
    const p = toWater(x, y);
    spawn(p.x, p.y, 1);
    lastSpawn.current = { x: p.x, y: p.y, at: clock.current };
  }, []);

  const onFrame = useCallback(({ gl, u, time, delta, width, height, pointer }: FrameContext) => {
    clock.current = time;
    const aspect = width / height;
    aspectRef.current = aspect;
    const shore = shoreRef.current;

    // Seed the fish offshore the first time we know the shape of the water.
    if (fish.current.length === 0) {
      for (let i = 0; i < FISH; i++) {
        const along = (i / FISH - 0.5) * 0.8;
        const out = 0.25 + (i % 2) * 0.12;
        const x = shore.dx * (shore.offset + out) - shore.dy * along;
        const y = shore.dy * (shore.offset + out) + shore.dx * along;
        const heading = Math.random() * Math.PI * 2;
        fish.current.push({ x, y, vx: Math.cos(heading) * 0.05, vy: Math.sin(heading) * 0.05, heading, wander: Math.random() * 10 });
      }
    }

    // A fish, now and then, nips at the surface.
    if (time > nextDrop.current) {
      nextDrop.current = time + 1.4 + Math.random() * 2.2;
      const f = fish.current[Math.floor(Math.random() * fish.current.length)];
      if (f) spawn(f.x + Math.cos(f.heading) * 0.04, f.y + Math.sin(f.heading) * 0.04, 0.22);
    }

    const pp = pointer.active ? toWater(pointer.x, pointer.y) : null;
    const halfW = aspect / 2 - 0.04;
    for (const f of fish.current) {
      f.wander += delta * (0.6 + Math.random() * 0.4);
      let ax = Math.cos(f.wander * 0.9 + f.heading) * 0.04;
      let ay = Math.sin(f.wander * 1.3) * 0.04;

      // Stay in the water and on the screen.
      const s = shoreDistance(f.x, f.y);
      if (s < 0.12) {
        ax += shore.dx * (0.12 - s) * 4;
        ay += shore.dy * (0.12 - s) * 4;
      }
      if (f.x < -halfW) ax += 0.3;
      if (f.x > halfW) ax -= 0.3;
      if (f.y < -0.46) ay += 0.3;
      if (f.y > 0.46) ay -= 0.3;

      // Scatter from a hand in the water.
      let speedCap = 0.07;
      if (pp) {
        const dx = f.x - pp.x;
        const dy = f.y - pp.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.2 && d > 1e-4) {
          const push = (0.2 - d) * 9;
          ax += (dx / d) * push;
          ay += (dy / d) * push;
          speedCap = 0.32;
        }
      }

      f.vx += ax * delta;
      f.vy += ay * delta;
      const speed = Math.hypot(f.vx, f.vy);
      const cap = speed > speedCap ? speedCap / speed : 1;
      const floor = speed < 0.025 ? 0.025 / Math.max(speed, 1e-4) : 1;
      f.vx *= cap * floor;
      f.vy *= cap * floor;
      f.x += f.vx * delta;
      f.y += f.vy * delta;

      // Turn smoothly toward where it is going.
      const target = Math.atan2(f.vy, f.vx);
      let diff = target - f.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      f.heading += diff * Math.min(1, delta * 5);
    }

    const buf = uniformBuffer.current;
    buf.ripples.fill(0);
    ripples.current.forEach((r, i) => {
      buf.ripples.set([r.x, r.y, r.start, r.strength], i * 4);
    });
    fish.current.forEach((f, i) => {
      buf.fish.set([f.x, f.y, Math.cos(f.heading), Math.sin(f.heading)], i * 4);
    });

    gl.uniform4fv(u('u_ripples[0]'), buf.ripples);
    gl.uniform4fv(u('u_fish[0]'), buf.fish);
    gl.uniform3f(u('u_shore'), shore.dx, shore.dy, shore.offset);
  }, []);

  return (
    <ShaderCanvas
      fragment={FRAGMENT}
      className={className}
      quality={coarse ? 0.42 : 0.62}
      maxDpr={coarse ? 1.25 : 1.5}
      onFrame={onFrame}
      onPointerMove={handleMove}
      onPointerDown={handleDown}
      pointerTarget={pointerTarget}
    />
  );
};

export default LagoonWater;
