import React, { useEffect, useRef } from 'react';
import type { InspireEffect } from '../../../edt/inspireConfig';

/**
 * The light over the show's background, in WebGL: sun-caustics rippling as
 * if the screen were under a metre of Caribbean, a slow sun flare with light
 * leaks, or drifting bokeh — always with a few motes of light rising.
 *
 * `resolution` and `fps` come from the show's quality level (useShowQuality),
 * which lowers both before it turns the light off on a TV that struggles.
 *
 * It draws only light (black is "no change") and the canvas is blended with
 * `screen`, so it brightens the photograph and never covers it. It renders
 * at a fraction of the screen's resolution and at most 30 frames a second —
 * soft light does not need more — and stops while the tab is hidden.
 */

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform float uIntensity;
uniform int uMode;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// Light focused by a moving water surface: iterated sine warps.
float caustic(vec2 uv, float t) {
  vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
  vec2 i = p;
  float c = 1.0;
  float strength = 0.005;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / strength), p.y / (cos(i.y + tt) / strength)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}

// Specks of light drifting upwards, each twinkling on its own beat.
float motes(vec2 uv, float aspect, float t, float scale, float speed, float size) {
  vec2 g = uv * vec2(aspect, 1.0) * scale + vec2(0.0, -t * speed);
  vec2 cell = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash(cell);
  vec2 offset = (vec2(hash(cell + 1.3), hash(cell + 2.7)) - 0.5) * 0.7;
  float d = length(f - offset);
  float twinkle = 0.55 + 0.45 * sin(t * (1.0 + h * 2.0) + h * 40.0);
  return smoothstep(size * (0.4 + h), 0.0, d) * step(0.72, h) * twinkle;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  float t = uTime;
  vec3 col = vec3(0.0);
  vec3 warm = vec3(1.0, 0.93, 0.78);

  if (uMode == 0) {
    float c = caustic(vec2(uv.x * aspect, uv.y) * 0.55 + vec2(t * 0.01, 0.0), t * 0.32);
    float fall = smoothstep(-0.15, 1.0, uv.y);
    col += warm * c * 0.42 * fall;
  } else if (uMode == 1) {
    vec2 sun = vec2(0.78 + 0.05 * sin(t * 0.05), 0.82 + 0.03 * cos(t * 0.07));
    vec2 d = (uv - sun) * vec2(aspect, 1.0);
    float r = length(d);
    float glow = exp(-r * 3.2) * 0.65 + exp(-r * 12.0) * 0.5;
    float angle = atan(d.y, d.x);
    float rays = noise(vec2(angle * 6.0, t * 0.15)) * exp(-r * 1.6) * 0.35;
    float leak = smoothstep(0.55, 0.0, length((uv - vec2(0.05 + 0.04 * sin(t * 0.09), 0.2)) * vec2(aspect * 0.7, 1.4))) * 0.25;
    col += vec3(1.0, 0.78, 0.45) * (glow + rays) + vec3(1.0, 0.55, 0.3) * leak;
  } else if (uMode == 2) {
    for (int layer = 0; layer < 3; layer++) {
      float fl = float(layer);
      vec2 g = uv * vec2(aspect, 1.0) * (2.2 + fl * 1.3) + vec2(t * (0.02 + fl * 0.01), -t * (0.03 + fl * 0.015));
      vec2 cell = floor(g);
      vec2 f = fract(g) - 0.5;
      float h = hash(cell + fl * 7.0);
      vec2 o = (vec2(hash(cell + 3.1), hash(cell + 5.9)) - 0.5) * 0.5;
      float d = length(f - o);
      float disc = smoothstep(0.32, 0.26, d) * step(0.55, h);
      vec3 tint = mix(vec3(1.0, 0.85, 0.6), vec3(0.6, 0.9, 1.0), hash(cell + 9.0));
      col += tint * disc * (0.12 + 0.08 * sin(t * 0.6 + h * 20.0));
    }
  }

  if (uMode != 3) {
    col += warm * motes(uv, aspect, t, 9.0, 0.06, 0.05) * 0.8;
    col += warm * motes(uv + 0.37, aspect, t, 16.0, 0.09, 0.04) * 0.5;
  }

  gl_FragColor = vec4(col * uIntensity, 1.0);
}
`;

const MODES: Record<InspireEffect, number> = { caustics: 0, sunglow: 1, bokeh: 2, none: 3 };

const InspireEffects: React.FC<{ effect: InspireEffect; intensity: number; resolution?: number; fps?: number; className?: string }> = ({
  effect,
  intensity,
  resolution = 0.6,
  fps = 30,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || effect === 'none') return undefined;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' });
    if (!gl) return undefined;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('[inspire] shader:', gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    };
    const vs = compile(gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vs || !fs) return undefined;
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'uRes');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uIntensity = gl.getUniformLocation(program, 'uIntensity');
    const uMode = gl.getUniformLocation(program, 'uMode');
    gl.uniform1i(uMode, MODES[effect]);
    gl.uniform1f(uIntensity, intensity);

    // A fraction of the real resolution: the light is soft, the TV is big.
    const resize = () => {
      const scale = Math.min(resolution, 1 / Math.max(1, window.devicePixelRatio * 0.9));
      canvas.width = Math.max(2, Math.round(canvas.clientWidth * scale));
      canvas.height = Math.max(2, Math.round(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    let frame = 0;
    let last = 0;
    const start = performance.now();
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (document.hidden || now - last < 1000 / fps - 2) return;
      last = now;
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [effect, intensity, resolution, fps]);

  if (effect === 'none') return null;
  return <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} style={{ mixBlendMode: 'screen' }} aria-hidden="true" />;
};

export default InspireEffects;
