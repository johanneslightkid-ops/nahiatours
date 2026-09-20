import React, { useEffect, useRef } from 'react';

/**
 * The sea, in WebGL.
 *
 * A single full-quad fragment shader: three layers of drifting sine swell, the
 * light broken into caustics on top of them, graded between the same pigments
 * the rest of the palette uses. Raw WebGL, no library — this is one quad and
 * forty lines of GLSL, and pulling in three.js for it would cost more than the
 * whole rest of the page.
 *
 * WHAT KEEPS IT CHEAP. A shader is only as expensive as the pixels it runs
 * over, so the work here is all in bounding those:
 *
 *   • RESOLUTION IS PINNED to a third of CSS pixels and never follows
 *     devicePixelRatio. On a 3x phone screen, honouring the ratio would mean
 *     nine times the fragments for an effect whose whole subject is blur. The
 *     canvas is then scaled up by CSS, which softens it further — which is
 *     what a painting of water wants anyway.
 *   • IT PAUSES WHEN IT IS NOT VISIBLE. An IntersectionObserver stops the rAF
 *     loop the moment the hero scrolls away, and `visibilitychange` stops it
 *     when the tab goes to the background. A shader running behind a tab
 *     nobody is looking at is pure battery.
 *   • IT IS CAPPED AT 30fps. Water does not need 60, and halving the frame
 *     rate halves the GPU time.
 *   • IT NEVER MOUNTS ON A PHONE. The caller only renders this component on
 *     the `full` motion budget — see useMotionBudget().
 *
 * If the context cannot be created (no WebGL, blocklisted driver, too many
 * live contexts) the component renders an empty canvas and the painted SVG
 * behind it is what the visitor sees. There is no error state, because the
 * fallback is the design.
 */

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2  u_res;
uniform float u_time;

// The palette, straight out of tailwind.config.cjs.
const vec3 DEEP    = vec3(0.055, 0.231, 0.322); // #0E3B52
const vec3 SEA     = vec3(0.122, 0.384, 0.522); // #1F6285
const vec3 LAGOON  = vec3(0.184, 0.714, 0.643); // #2FB6A4
const vec3 SHALLOW = vec3(0.561, 0.863, 0.816); // #8FDCD0
const vec3 SUN     = vec3(1.000, 0.807, 0.478); // #FFCE7A

// Three swells at different speeds and angles. Cheap, and enough: the eye
// reads any two crossing sines as water.
float swell(vec2 p, float t) {
  float a = sin(p.x * 3.1 + t * 0.55) * 0.5;
  float b = sin(p.x * 6.3 - p.y * 2.2 + t * 0.9) * 0.28;
  float c = sin(p.x * 11.0 + p.y * 4.0 - t * 1.4) * 0.14;
  return a + b + c;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;

  // Depth: dark at the horizon, shallow at the near edge.
  float depth = smoothstep(0.0, 1.0, uv.y);

  float s = swell(uv, u_time);

  vec3 water = mix(DEEP, SEA, smoothstep(0.0, 0.45, depth));
  water = mix(water, LAGOON, smoothstep(0.35, 0.8, depth));
  water = mix(water, SHALLOW, smoothstep(0.75, 1.0, depth));

  // The swell lifts and drops the value, which is what reads as volume.
  water += s * 0.07;

  // Caustics: two crossed high-frequency waves, sharpened by pow(), and only
  // where the water is shallow enough for light to reach the sand.
  float c1 = sin(uv.x * 26.0 + u_time * 1.1 + s * 3.0);
  float c2 = sin(uv.y * 19.0 - u_time * 0.8 + s * 2.0);
  float caustic = pow(max(c1 * c2, 0.0), 6.0);
  water += SUN * caustic * 0.42 * smoothstep(0.25, 1.0, depth);

  // A band of glare where the sun sits, breaking up on the swell.
  float glare = smoothstep(0.42, 0.0, abs(uv.x - 0.68 - s * 0.05));
  water += SUN * glare * 0.16 * (0.5 + 0.5 * sin(uv.y * 40.0 + u_time));

  // Foam at the very near edge.
  float foam = smoothstep(0.93, 1.0, depth + s * 0.03);
  water = mix(water, vec3(0.992, 0.973, 0.933), foam * 0.7);

  // Fade to nothing at the top so it dissolves into the painted horizon
  // rather than ending on a line.
  float alpha = smoothstep(0.0, 0.22, depth);
  gl_FragColor = vec4(water, alpha);
}
`;

/** A third of CSS pixels. The subject is blur; resolution is wasted on it. */
const RESOLUTION_SCALE = 1 / 3;
/** Water does not need 60fps, and half the frames is half the GPU time. */
const FRAME_MS = 1000 / 30;

const compile = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[SeaCanvas] shader failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const SeaCanvas: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      // The scene is redrawn every frame, so there is nothing to preserve —
      // and saying so lets the driver skip a buffer copy.
      preserveDrawingBuffer: false,
      powerPreference: 'low-power',
    });
    if (!gl) return;

    const vert = compile(gl, gl.VERTEX_SHADER, VERT);
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[SeaCanvas] link failed:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    // One quad covering clip space.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'u_res');
    const uTime = gl.getUniformLocation(program, 'u_time');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const resize = () => {
      const width = Math.max(1, Math.round(canvas.clientWidth * RESOLUTION_SCALE));
      const height = Math.max(1, Math.round(canvas.clientHeight * RESOLUTION_SCALE));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();

    let raf = 0;
    let running = false;
    let last = 0;
    const start = performance.now();

    const frame = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (now - last < FRAME_MS) return;
      last = now;
      resize();
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const play = () => {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const pause = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // Only while it is on screen…
    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting && !document.hidden ? play() : pause()),
      { threshold: 0.01 }
    );
    observer.observe(canvas);

    // …and only while the tab is in front.
    const onVisibility = () => (document.hidden ? pause() : undefined);
    document.addEventListener('visibilitychange', onVisibility);

    // A lost context is normal on mobile GPUs under memory pressure. Stop
    // rather than spin on a dead context; the painting behind stays.
    const onLost = (event: Event) => {
      event.preventDefault();
      pause();
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      pause();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      // Frees the context immediately rather than at the next GC, which
      // matters because a browser only allows a handful at once.
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
};

export default SeaCanvas;
