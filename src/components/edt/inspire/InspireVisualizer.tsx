import React, { useEffect, useRef } from 'react';
import type { InspireConfig } from '../../../edt/inspireConfig';

/**
 * The music, drawn over the background — spectrum bars, mirrored bars or a
 * waveform — from the Web Audio analyser the show's player feeds.
 *
 * Made for a mid-range TV: one 2D canvas at half the screen's resolution (at
 * most 960 pixels across — the shapes are soft and the TV scales them up),
 * plain rectangles and one line, no shadows or blur, a gradient made once,
 * at most 30 frames a second (20 when the show has stepped its quality
 * down), and nothing at all while the music is not playing: the loop stops
 * once the canvas has faded out.
 *
 * Bars are spaced logarithmically from 40 Hz to 14 kHz, as ears hear them,
 * fall back slowly rather than snapping to zero, and carry a small cap that
 * lingers on the peak — the look of a good hi-fi meter, in the brand's amber
 * and gold.
 */

interface Props {
  analyser: AnalyserNode | null;
  active: boolean;
  settings: InspireConfig['visualizer'];
  fps: number;
}

const BARS = 56;

const hexToRgb = (hex: string) => {
  const value = parseInt(hex.slice(1), 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
};

const InspireVisualizer: React.FC<Props> = ({ analyser, active, settings, fps }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shown = active && Boolean(analyser);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser || !shown) return undefined;
    const context = canvas.getContext('2d', { alpha: true, desynchronized: true } as CanvasRenderingContext2DSettings);
    if (!context) return undefined;

    const bins = new Uint8Array(analyser.frequencyBinCount);
    const wave = new Uint8Array(analyser.fftSize);
    const levels = new Float32Array(BARS);
    const peaks = new Float32Array(BARS);
    const peakHold = new Float32Array(BARS);

    // Which analyser bins each bar covers, log-spaced.
    const nyquist = analyser.context.sampleRate / 2;
    const ranges = Array.from({ length: BARS }, (_, bar) => {
      const low = 40 * Math.pow(14000 / 40, bar / BARS);
      const high = 40 * Math.pow(14000 / 40, (bar + 1) / BARS);
      const from = Math.min(bins.length - 1, Math.floor((low / nyquist) * bins.length));
      const to = Math.min(bins.length, Math.max(from + 1, Math.ceil((high / nyquist) * bins.length)));
      return [from, to] as const;
    });

    let width = 0;
    let height = 0;
    let fill: CanvasGradient | null = null;
    const resize = () => {
      const scale = Math.min(0.5, 960 / Math.max(1, canvas.clientWidth));
      width = Math.max(2, Math.round(canvas.clientWidth * scale));
      height = Math.max(2, Math.round(canvas.clientHeight * scale));
      canvas.width = width;
      canvas.height = height;
      fill = context.createLinearGradient(0, height, 0, 0);
      fill.addColorStop(0, `rgba(${hexToRgb(settings.colorFrom)}, 0.95)`);
      fill.addColorStop(1, `rgba(${hexToRgb(settings.colorTo)}, 0.95)`);
    };
    resize();
    window.addEventListener('resize', resize);

    const capColor = `rgba(${hexToRgb(settings.colorTo)}, 1)`;
    const lineColor = `rgba(${hexToRgb(settings.colorFrom)}, 1)`;
    const interval = 1000 / fps;
    let frame = 0;
    let last = 0;

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (document.hidden || now - last < interval - 2) return;
      last = now;
      context.clearRect(0, 0, width, height);

      if (settings.style === 'wave') {
        analyser.getByteTimeDomainData(wave);
        const step = Math.max(1, Math.floor(wave.length / 256));
        context.beginPath();
        for (let i = 0, x = 0; i < wave.length; i += step, x++) {
          const px = (i / (wave.length - 1)) * width;
          const py = height / 2 + ((wave[i] - 128) / 128) * (height * 0.46);
          if (x === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        context.lineJoin = 'round';
        context.strokeStyle = fill ?? lineColor;
        context.lineWidth = Math.max(1.5, height / 40);
        context.stroke();
        return;
      }

      analyser.getByteFrequencyData(bins);
      const mirror = settings.style === 'mirror';
      const count = mirror ? BARS / 2 : BARS;
      const slot = width / (mirror ? BARS : BARS);
      const bar = Math.max(1, slot * 0.62);
      for (let b = 0; b < count; b++) {
        // Mirrored, the lows sit in the middle and the highs reach outwards.
        const source = mirror ? b * 2 : b;
        const [from, to] = ranges[source];
        let sum = 0;
        for (let i = from; i < to; i++) sum += bins[i];
        // A gentle curve so quiet passages still move and loud ones do not pin.
        const value = Math.pow(sum / (to - from) / 255, 1.35);
        levels[b] = value > levels[b] ? value : levels[b] * 0.86 + value * 0.14;
        if (levels[b] >= peaks[b]) {
          peaks[b] = levels[b];
          peakHold[b] = 12;
        } else if (peakHold[b] > 0) peakHold[b] -= 1;
        else peaks[b] = Math.max(0, peaks[b] - 0.012);

        const h = levels[b] * height;
        const capY = peaks[b] * height;
        const xs = mirror ? [width / 2 + b * slot + (slot - bar) / 2, width / 2 - (b + 1) * slot + (slot - bar) / 2] : [b * slot + (slot - bar) / 2];
        for (const x of xs) {
          context.fillStyle = fill ?? lineColor;
          context.fillRect(x, height - h, bar, h);
          if (capY > 2) {
            context.fillStyle = capColor;
            context.fillRect(x, height - capY - 2, bar, Math.max(1, height / 90));
          }
        }
      }
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [analyser, shown, settings.style, settings.colorFrom, settings.colorTo, fps]);

  const place: React.CSSProperties =
    settings.position === 'top'
      ? { top: '9vh' }
      : settings.position === 'middle'
      ? { top: `${50 - settings.height * 50}vh` }
      : { bottom: '0' };

  return (
    <canvas
      ref={canvasRef}
      className="inspire-visualizer"
      style={{ ...place, width: '100%', height: `${settings.height * 100}vh`, opacity: shown ? settings.opacity : 0 }}
      aria-hidden="true"
    />
  );
};

export default InspireVisualizer;
