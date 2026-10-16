import React, { useEffect, useRef, useState } from 'react';

/**
 * One full-screen fragment shader, drawn into a canvas that fills its parent.
 *
 * Every piece of moving water on this site is one of these. The canvas costs
 * a GL context and a full-screen fragment pass per frame, so it is careful
 * about when it actually draws:
 *
 *   • only while on screen (IntersectionObserver) and while the tab is visible;
 *   • at a fraction of the device's pixel ratio — water is soft, and nobody
 *     can tell a 0.5x lagoon from a 2x one, but the GPU can;
 *   • once, and then never again, when the visitor prefers reduced motion;
 *   • not at all if WebGL is missing or the context is lost — the parent's
 *     CSS gradient stays visible underneath, so the page never shows a hole.
 *
 * No three.js: a triangle, a program and a uniform cache are all this needs,
 * and it keeps the home page's script budget for the page itself.
 */

export interface FrameContext {
  gl: WebGLRenderingContext;
  /** Cached uniform location lookup. */
  u: (name: string) => WebGLUniformLocation | null;
  /** Seconds since the canvas started drawing. */
  time: number;
  /** Seconds since the previous frame (clamped). */
  delta: number;
  /** Drawing-buffer size in device pixels. */
  width: number;
  height: number;
  /** Pointer in canvas space, 0..1 with y up; null when it has never moved. */
  pointer: { x: number; y: number; active: boolean };
}

interface ShaderCanvasProps {
  fragment: string;
  className?: string;
  style?: React.CSSProperties;
  /** Fraction of the device pixel ratio to render at. */
  quality?: number;
  /** Hard ceiling on the effective pixel ratio. */
  maxDpr?: number;
  /** Set extra uniforms; runs before every draw. */
  onFrame?: (ctx: FrameContext) => void;
  /**
   * Element whose pointer movement counts as touching the water. Defaults to
   * the canvas's parent, because the canvas itself sits behind the copy and
   * never receives events.
   */
  pointerTarget?: React.RefObject<HTMLElement>;
  onPointerDown?: (x: number, y: number) => void;
  onPointerMove?: (x: number, y: number) => void;
  /**
   * Frame-rate ceiling. Water read at 30 frames a second is still water, and
   * on a phone it halves what the GPU and the battery spend on it.
   */
  maxFps?: number;
}

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * A phone with 2 GB of memory or less gets a still frame of the water rather
 * than a running one: the page stays responsive, and the picture is the same.
 */
const isLowEndDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return (memory !== undefined && memory <= 2) || (navigator.hardwareConcurrency || 8) <= 2;
};

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[water] shader failed to compile:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const ShaderCanvas: React.FC<ShaderCanvasProps> = ({
  fragment,
  className = '',
  style,
  quality = 0.6,
  maxDpr = 1.5,
  onFrame,
  pointerTarget,
  onPointerDown,
  onPointerMove,
  maxFps,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  // The latest callbacks, read by the render loop without restarting it.
  const frameRef = useRef(onFrame);
  const downRef = useRef(onPointerDown);
  const moveRef = useRef(onPointerMove);
  frameRef.current = onFrame;
  downRef.current = onPointerDown;
  moveRef.current = onPointerMove;

  const fpsCap = maxFps ?? (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches ? 30 : 60);

  // Compiling a shader blocks the main thread — tens of milliseconds on a
  // phone. Wait for an idle moment so it never sits in front of first paint.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const idle = window.requestIdleCallback;
    if (idle) {
      const handle = idle(() => setArmed(true), { timeout: 1200 });
      return () => window.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(() => setArmed(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !armed) return;

    const gl = (canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'low-power',
    }) || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

    if (!gl) {
      setFailed(true);
      return;
    }

    // Phones that only offer mediump in fragment shaders still get water —
    // just with the precision they have.
    const high = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    const precision = high && high.precision > 0 ? 'highp' : 'mediump';

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, `precision ${precision} float;\n${fragment}`);
    const program = gl.createProgram();
    if (!vs || !fs || !program) {
      setFailed(true);
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[water] program failed to link:', gl.getProgramInfoLog(program));
      setFailed(true);
      return;
    }
    gl.useProgram(program);

    // One oversized triangle covers the viewport with no diagonal seam.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const locations = new Map<string, WebGLUniformLocation | null>();
    const u = (name: string) => {
      if (!locations.has(name)) locations.set(name, gl.getUniformLocation(program, name));
      return locations.get(name) ?? null;
    };

    const pointer = { x: 0.5, y: 0.5, active: false };
    const reduced = prefersReducedMotion() || isLowEndDevice();

    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr) * quality;
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (w !== width || h !== height) {
        width = w;
        height = h;
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    let raf = 0;
    let visible = true;
    let onScreen = false;
    let start = 0;
    let last = 0;
    let lost = false;

    const draw = (now: number) => {
      if (lost) return;
      if (!start) start = now;
      const time = (now - start) / 1000;
      const delta = Math.min(0.07, last ? (now - last) / 1000 : 0.016);
      last = now;

      resize();
      gl.uniform2f(u('u_res'), width, height);
      gl.uniform1f(u('u_time'), time);
      gl.uniform3f(u('u_pointer'), pointer.x, pointer.y, pointer.active ? 1 : 0);
      frameRef.current?.({ gl, u, time, delta, width, height, pointer });
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const minGap = 1000 / fpsCap - 2;
    let lastDraw = 0;
    const loop = (now: number) => {
      if (now - lastDraw >= minGap) {
        lastDraw = now;
        draw(now);
      }
      raf = requestAnimationFrame(loop);
    };

    const sync = () => {
      const shouldRun = visible && onScreen && !reduced && !lost;
      if (shouldRun && !raf) {
        last = 0;
        raf = requestAnimationFrame(loop);
      } else if (!shouldRun && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    // Reduced motion (or a low-end phone): one still frame of water, a few
    // seconds into the animation so the swell has some shape.
    if (reduced) {
      start = performance.now() - 6000;
      draw(performance.now());
    } else {
      // A first frame right away, so there is no flash of the fallback.
      draw(performance.now());
    }
    setReady(true);

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { rootMargin: '80px' }
    );
    io.observe(canvas);

    const onVisibility = () => {
      visible = document.visibilityState === 'visible';
      sync();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const ro = new ResizeObserver(() => {
      if (!raf) draw(performance.now());
    });
    ro.observe(canvas);

    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      sync();
      setFailed(true);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    // Pointer: listen on the section, not the canvas, which sits behind the
    // copy. Coordinates are normalised to the canvas with y up, like the GL.
    const target = pointerTarget?.current ?? canvas.parentElement;
    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) / rect.width,
        y: 1 - (event.clientY - rect.top) / rect.height,
      };
    };
    const handleMove = (event: PointerEvent) => {
      const p = toCanvas(event);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.active = true;
      moveRef.current?.(p.x, p.y);
    };
    const handleDown = (event: PointerEvent) => {
      const p = toCanvas(event);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.active = true;
      downRef.current?.(p.x, p.y);
      if (!raf) draw(performance.now());
    };
    const handleLeave = () => {
      pointer.active = false;
    };
    target?.addEventListener('pointermove', handleMove, { passive: true });
    target?.addEventListener('pointerdown', handleDown, { passive: true });
    target?.addEventListener('pointerleave', handleLeave, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      target?.removeEventListener('pointermove', handleMove);
      target?.removeEventListener('pointerdown', handleDown);
      target?.removeEventListener('pointerleave', handleLeave);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [fragment, quality, maxDpr, pointerTarget, armed, fpsCap]);

  if (failed) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`water-canvas ${ready ? 'is-ready' : ''} ${className}`}
      style={style}
    />
  );
};

export default ShaderCanvas;
