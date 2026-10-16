import React, { useId } from 'react';

/**
 * El Cortecito's field book.
 *
 * Botanical leaves and the animals of the Hispaniolan coast — the cotorra,
 * the Hispaniolan emerald, frigatebirds over Bávaro, the flamingos of Oviedo,
 * the humpbacks that winter in Samaná, the reef below. Drawn as soft-shaded
 * naturalist plates rather than outlined stickers: gradients for volume, fine
 * pale lines for veins and scales, no black pen.
 *
 * The leaves are generated, not hand-traced: a monstera, a palm frond, a fern
 * and a banana leaf are each a small function of a few numbers, so they stay
 * botanically consistent and cost a few hundred bytes each.
 *
 * Every drawing is decorative (`aria-hidden`) and takes its size from the
 * caller's className. Gradient ids are made unique per instance, so the same
 * drawing can appear many times on one page.
 */

export const INK = '#0E3B36';

const C = {
  ink: '#0E3B36',
  leafDeep: '#1E6A3B',
  leaf: '#3E9B50',
  leafLight: '#A3DB93',
  fern: '#5DB85C',
  sand: '#F5EAD3',
  cream: '#FFFDF8',
  mango: '#F7B23B',
  mangoLight: '#FFD47E',
  coral: '#F2675C',
  coralLight: '#FFB1A6',
  coralDark: '#CF453E',
  lagoon: '#17B5AC',
  lagoonLight: '#93ECE1',
  lagoonDark: '#0A7C76',
  sky: '#4DB6E5',
  skyDark: '#197DB1',
  flamboyan: '#F2723C',
  orchid: '#9C6CD0',
  bark: '#8A5E3B',
  barkDark: '#5E3E26',
};

export interface IllustrationProps {
  className?: string;
  style?: React.CSSProperties;
}

const svgProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false as const,
};

/** A per-instance prefix for gradient ids. */
const useGid = () => useId().replace(/[^a-zA-Z0-9]/g, '');

const f = (n: number) => n.toFixed(1);
type Pt = [number, number];
const poly = (pts: Pt[]) => `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} Z`;

/* ══════════════════════════════════════════════════════════════════════════
   Leaf generators
   ══════════════════════════════════════════════════════════════════════════ */

/** Monstera deliciosa: heart-shaped, split to the midrib, with windows. */
const MONSTERA = (() => {
  const cx = 100;
  const cy = 104;
  const rx = 88;
  const ry = 95;
  const edge = (deg: number): Pt => {
    const a = (deg * Math.PI) / 180;
    // Slightly pointed tip, slightly fuller shoulders.
    const pinch = 1 - 0.07 * Math.max(0, Math.sin(a)) ** 6;
    return [cx + rx * Math.cos(a) * pinch, cy - ry * Math.sin(a) - (deg > 80 ? (deg - 80) * 0.6 : 0)];
  };
  const midrib = (e: Pt): Pt => [cx, Math.min(176, e[1] + 34)];
  const splits = [-50, -20, 10, 38, 63];

  const right: Pt[] = [];
  const holes: Pt[][] = [];
  const veins: string[] = [];
  for (let deg = -80; deg <= 90; deg += 3) {
    const split = splits.find((s) => Math.abs(s - deg) < 1.5);
    if (split !== undefined) {
      const a = edge(split - 2.6);
      const b = edge(split + 2.6);
      const mid = edge(split);
      const m = midrib(mid);
      const inner: Pt = [mid[0] + (m[0] - mid[0]) * 0.56, mid[1] + (m[1] - mid[1]) * 0.56];
      right.push(a, inner, b);
    } else {
      right.push(edge(deg));
    }
  }
  splits.forEach((s, i) => {
    const between = i === 0 ? s - 18 : (s + splits[i - 1]) / 2;
    const e = edge(between);
    const m = midrib(e);
    veins.push(`M${f(m[0])} ${f(m[1])} Q${f((m[0] + e[0]) / 2)} ${f((m[1] + e[1]) / 2 + 6)} ${f(e[0] - 6)} ${f(e[1] + 2)}`);
    // A window between the splits, lying along the vein.
    const c: Pt = [m[0] + (e[0] - m[0]) * 0.3, m[1] + (e[1] - m[1]) * 0.3];
    const ang = Math.atan2(e[1] - m[1], e[0] - m[0]);
    const hole: Pt[] = [];
    for (let k = 0; k < 14; k++) {
      const t = (k / 14) * Math.PI * 2;
      const lx = Math.cos(t) * 8.5;
      const ly = Math.sin(t) * 3.6;
      hole.push([c[0] + lx * Math.cos(ang) - ly * Math.sin(ang), c[1] + lx * Math.sin(ang) + ly * Math.cos(ang)]);
    }
    if (i > 0) holes.push(hole);
  });

  const mirror = (p: Pt): Pt => [2 * cx - p[0], p[1]];
  const outline: Pt[] = [[cx, 178], ...right, ...right.slice().reverse().map(mirror)];
  const allHoles = [...holes, ...holes.map((h) => h.map(mirror))];
  const shape = poly(outline) + allHoles.map(poly).join(' ');
  const allVeins = [...veins, ...veins.map((v) => v.replace(/(\d+\.\d) (\d+\.\d)/g, (_, x, y) => `${f(2 * cx - Number(x))} ${y}`))];
  return { shape, veins: allVeins };
})();

/** A pinnate frond: a curved rachis with lens-shaped leaflets either side. */
const frond = ({
  base,
  ctrl,
  tip,
  count,
  maxLen,
  width,
  angle,
  droop,
}: {
  base: Pt;
  ctrl: Pt;
  tip: Pt;
  count: number;
  maxLen: number;
  width: number;
  angle: number;
  droop: number;
}) => {
  const at = (t: number): Pt => [
    (1 - t) ** 2 * base[0] + 2 * (1 - t) * t * ctrl[0] + t * t * tip[0],
    (1 - t) ** 2 * base[1] + 2 * (1 - t) * t * ctrl[1] + t * t * tip[1],
  ];
  const tangent = (t: number): Pt => {
    const x = 2 * (1 - t) * (ctrl[0] - base[0]) + 2 * t * (tip[0] - ctrl[0]);
    const y = 2 * (1 - t) * (ctrl[1] - base[1]) + 2 * t * (tip[1] - ctrl[1]);
    const l = Math.hypot(x, y) || 1;
    return [x / l, y / l];
  };
  let leaflets = '';
  for (let i = 0; i < count; i++) {
    const t = 0.12 + (i / (count - 1)) * 0.86;
    const p = at(t);
    const [tx, ty] = tangent(t);
    const len = maxLen * Math.sin(Math.PI * Math.min(1, t * 1.05)) ** 0.55 * (1 - 0.35 * t) + 4;
    for (const side of [-1, 1]) {
      const a = side * angle;
      let dx = tx * Math.cos(a) - ty * Math.sin(a);
      let dy = tx * Math.sin(a) + ty * Math.cos(a);
      dy += droop;
      const l = Math.hypot(dx, dy);
      dx /= l;
      dy /= l;
      const end: Pt = [p[0] + dx * len, p[1] + dy * len];
      const mid: Pt = [p[0] + dx * len * 0.45, p[1] + dy * len * 0.45];
      const w = width * (0.6 + 0.4 * Math.sin(Math.PI * t));
      const nx = -dy * w;
      const ny = dx * w;
      leaflets += `M${f(p[0])} ${f(p[1])} Q${f(mid[0] + nx)} ${f(mid[1] + ny)} ${f(end[0])} ${f(end[1])} Q${f(mid[0] - nx)} ${f(mid[1] - ny)} ${f(p[0])} ${f(p[1])} Z `;
    }
  }
  const rachis = `M${f(base[0])} ${f(base[1])} Q${f(ctrl[0])} ${f(ctrl[1])} ${f(tip[0])} ${f(tip[1])}`;
  return { leaflets, rachis };
};

const PALM_FROND = frond({ base: [12, 190], ctrl: [70, 50], tip: [192, 26], count: 22, maxLen: 70, width: 4.6, angle: 0.95, droop: 0.35 });
const FERN = frond({ base: [100, 196], ctrl: [92, 100], tip: [118, 8], count: 18, maxLen: 44, width: 7, angle: 1.2, droop: 0.12 });

/** Banana leaf: long, with the wind-torn slits a real one always has. */
const BANANA = (() => {
  const segments: string[] = [];
  const top = 8;
  const bottom = 236;
  const halfWidth = (t: number) => 50 * Math.sin(Math.PI * Math.min(1, t * 1.02)) ** 0.5;
  const midX = (t: number) => 60 + Math.sin(t * Math.PI) * 6;
  const tears = [0, 0.13, 0.21, 0.36, 0.44, 0.58, 0.7, 0.79, 0.9, 1];
  for (const side of [-1, 1]) {
    const cuts = side < 0 ? tears : tears.map((t, i) => (i === 0 || i === tears.length - 1 ? t : t + 0.04));
    for (let i = 0; i < cuts.length - 1; i++) {
      const t0 = cuts[i] + (i === 0 ? 0 : 0.006);
      const t1 = cuts[i + 1] - 0.006;
      const pts: Pt[] = [];
      const yAt = (t: number) => bottom - t * (bottom - top);
      pts.push([midX(t0), yAt(t0)]);
      for (let k = 0; k <= 6; k++) {
        const t = t0 + ((t1 - t0) * k) / 6;
        // The lateral veins run up and out, so the slits slant.
        pts.push([midX(t) + side * halfWidth(t), yAt(t) - 9]);
      }
      pts.push([midX(t1), yAt(t1)]);
      segments.push(poly(pts));
    }
  }
  return { shape: segments.join(' '), midrib: `M${f(midX(0))} ${bottom} Q${f(midX(0.5) + 4)} ${(top + bottom) / 2} ${f(midX(1))} ${top}` };
})();

/* ══════════════════════════════════════════════════════════════════════════
   Leaves
   ══════════════════════════════════════════════════════════════════════════ */

export const MonsteraLeaf: React.FC<IllustrationProps & { tone?: 'deep' | 'fresh' }> = ({ className = '', style, tone = 'deep' }) => {
  const id = useGid();
  const [a, b] = tone === 'deep' ? ['#2F8A4A', '#14532F'] : ['#7CCB6E', '#2F8A4A'];
  return (
    <svg viewBox="0 0 200 230" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}m`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <path d="M100 178 C100 196 96 212 90 228" stroke={b} strokeWidth={5} />
      <path d={MONSTERA.shape} fill={`url(#${id}m)`} fillRule="evenodd" />
      <path d="M100 176 C101 120 100 70 100 14" stroke="#D9F2C9" strokeOpacity={0.55} strokeWidth={2.4} />
      {MONSTERA.veins.map((d, i) => (
        <path key={i} d={d} stroke="#D9F2C9" strokeOpacity={0.35} strokeWidth={1.4} />
      ))}
    </svg>
  );
};

export const PalmFrond: React.FC<IllustrationProps & { color?: 'jungle' | 'jungleLight' | 'deep' }> = ({
  className = '',
  style,
  color = 'jungle',
}) => {
  const id = useGid();
  const stops = color === 'jungleLight' ? ['#A3DB93', '#5DB85C'] : color === 'deep' ? ['#2F8A4A', '#123F27'] : ['#5DB85C', '#1E6A3B'];
  return (
    <svg viewBox="0 0 200 200" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}p`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={stops[1]} />
          <stop offset="1" stopColor={stops[0]} />
        </linearGradient>
      </defs>
      <path d={PALM_FROND.leaflets} fill={`url(#${id}p)`} />
      <path d={PALM_FROND.rachis} stroke={stops[1]} strokeWidth={3.2} />
    </svg>
  );
};

export const Fern: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useGid();
  return (
    <svg viewBox="0 0 200 200" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}f`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#2F8A4A" />
          <stop offset="1" stopColor="#A3DB93" />
        </linearGradient>
      </defs>
      <path d={FERN.leaflets} fill={`url(#${id}f)`} />
      <path d={FERN.rachis} stroke="#1E6A3B" strokeWidth={2.4} />
    </svg>
  );
};

export const BananaLeaf: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useGid();
  return (
    <svg viewBox="0 0 120 244" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6CC15F" />
          <stop offset="0.5" stopColor="#3E9B50" />
          <stop offset="1" stopColor="#7CCB6E" />
        </linearGradient>
      </defs>
      <path d={BANANA.shape} fill={`url(#${id}b)`} />
      <path d={BANANA.midrib} stroke="#E4F5C8" strokeOpacity={0.7} strokeWidth={3} />
    </svg>
  );
};

/** Heliconia — the lobster-claw flower of every Dominican garden. */
export const Heliconia: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useGid();
  const bracts = Array.from({ length: 6 }).map((_, i) => {
    const y = 34 + i * 25;
    const s = i % 2 === 0 ? 1 : -1;
    const x = 60;
    const len = 44 - i * 3;
    return `M${x} ${y + 14} C${x + s * 10} ${y + 17} ${x + s * (len - 8)} ${y + 8} ${x + s * len} ${y - 12} C${x + s * (len - 14)} ${y - 3} ${x + s * 14} ${y + 2} ${x} ${y} Z`;
  });
  return (
    <svg viewBox="0 0 120 200" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}h`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={C.coralDark} />
          <stop offset="1" stopColor={C.flamboyan} />
        </linearGradient>
      </defs>
      <path d="M60 196 C60 140 58 80 60 20" stroke={C.leafDeep} strokeWidth={4} />
      {bracts.map((d, i) => (
        <g key={i}>
          <path d={d} fill={`url(#${id}h)`} />
          <path d={d} fill="none" stroke={C.mangoLight} strokeWidth={2} strokeDasharray="0 400 40 400" />
        </g>
      ))}
    </svg>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   Flowers & beach things
   ══════════════════════════════════════════════════════════════════════════ */

export const Hibiscus: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useGid();
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} {...svgProps}>
      <defs>
        <radialGradient id={`${id}h`} cx="0.5" cy="0.5" r="0.55">
          <stop offset="0" stopColor="#9E1F3A" />
          <stop offset="0.28" stopColor={C.coralDark} />
          <stop offset="1" stopColor="#FF8C7E" />
        </radialGradient>
      </defs>
      {Array.from({ length: 5 }).map((_, i) => (
        <path
          key={i}
          d="M50 50 C34 44 26 22 40 10 C46 6 54 6 60 10 C74 22 66 44 50 50 Z"
          fill={`url(#${id}h)`}
          transform={`rotate(${i * 72 + 8} 50 50)`}
        />
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <path key={`v${i}`} d="M50 50 L50 18" stroke="#FFD3CC" strokeOpacity={0.35} strokeWidth={1} transform={`rotate(${i * 72 + 8} 50 50)`} />
      ))}
      <path d="M50 50 C56 40 62 30 72 22" stroke="#FFE7B0" strokeWidth={2.4} />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={`s${i}`} cx={66 + (i % 3) * 3} cy={22 + Math.floor(i / 2) * 3 - (i % 2) * 2} r={1.8} fill={C.mangoLight} />
      ))}
      <circle cx="73" cy="20" r="2.6" fill={C.coralDark} />
    </svg>
  );
};

export const Pineapple: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useGid();
  return (
    <svg viewBox="0 0 80 120" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.mangoLight} />
          <stop offset="1" stopColor="#D98612" />
        </linearGradient>
      </defs>
      {[-34, -14, 0, 14, 34].map((a, i) => (
        <path key={i} d="M40 52 C36 36 36 20 40 4 C44 20 44 36 40 52 Z" fill={i % 2 ? C.leaf : C.leafDeep} transform={`rotate(${a} 40 52)`} />
      ))}
      <ellipse cx="40" cy="82" rx="25" ry="33" fill={`url(#${id}p)`} />
      <g stroke="#A86410" strokeOpacity={0.45} strokeWidth={1.6}>
        <path d="M20 66 L56 104 M18 82 L44 112 M26 54 L62 92 M38 50 L64 78" />
        <path d="M60 66 L24 104 M62 82 L36 112 M54 54 L18 92 M42 50 L16 78" />
      </g>
    </svg>
  );
};

/** Coco loco: a green coconut with a straw and a hibiscus. */
export const Cocktail: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useGid();
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} {...svgProps}>
      <defs>
        <radialGradient id={`${id}c`} cx="0.35" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#8FD07A" />
          <stop offset="1" stopColor="#2F7A3E" />
        </radialGradient>
      </defs>
      <path d="M58 40 L76 6" stroke={C.coral} strokeWidth={4} />
      <circle cx="48" cy="62" r="32" fill={`url(#${id}c)`} />
      <ellipse cx="48" cy="38" rx="20" ry="7" fill={C.cream} />
      <ellipse cx="48" cy="38" rx="15" ry="4.5" fill="#EFE6CF" />
      <circle cx="30" cy="34" r="7" fill={C.coral} />
      <circle cx="30" cy="34" r="2.4" fill={C.mangoLight} />
    </svg>
  );
};

export const Sailboat: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useGid();
  return (
    <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={C.cream} />
          <stop offset="1" stopColor="#E9D8B6" />
        </linearGradient>
      </defs>
      <path d="M58 12 L58 84" stroke={C.barkDark} strokeWidth={3} />
      <path d="M60 14 C82 34 92 60 94 80 L60 80 Z" fill={`url(#${id}s)`} />
      <path d="M56 22 C42 40 32 62 30 80 L56 80 Z" fill={C.coralLight} />
      <path d="M20 86 L100 86 C96 98 86 104 72 104 L46 104 C32 104 24 98 20 86 Z" fill={C.bark} />
      <path d="M58 12 L72 18 L58 22 Z" fill={C.coral} />
      <path d="M6 110 C22 104 34 116 50 110 C66 104 78 116 94 110 C104 106 110 108 116 110" stroke={C.lagoon} strokeWidth={3.5} />
    </svg>
  );
};

/** Queen conch — the lambí of every Dominican seafood shack. */
export const Conch: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useGid();
  return (
    <svg viewBox="0 0 140 120" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}o`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FBF0DC" />
          <stop offset="1" stopColor="#D9B98C" />
        </linearGradient>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFD3C2" />
          <stop offset="1" stopColor={C.coral} />
        </linearGradient>
      </defs>
      <path d="M40 22 L44 8 L50 20 M58 16 L64 2 L68 16 M78 16 L86 4 L88 20" fill="#E9D8B6" stroke="#C9A56F" strokeWidth={1.5} />
      <path d="M20 40 C30 20 60 10 86 18 C104 24 116 40 120 60 C124 80 116 100 98 108 C80 116 56 110 44 96 C34 84 30 70 22 60 C14 52 12 46 20 40 Z" fill={`url(#${id}o)`} />
      <path d="M30 40 C46 30 64 28 82 34 M28 52 C46 44 62 44 76 48" stroke="#C9A56F" strokeOpacity={0.6} strokeWidth={1.6} />
      <path d="M70 50 C90 44 112 54 116 72 C118 90 104 104 86 104 C76 100 70 92 74 82 C78 74 76 62 70 50 Z" fill={`url(#${id}l)`} />
      <path d="M80 60 C94 60 104 72 102 86 C96 80 88 74 80 60 Z" fill={C.coralDark} fillOpacity={0.5} />
    </svg>
  );
};

export const Starfish: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useGid();
  const pts = Array.from({ length: 10 }).map((_, i) => {
    const r = i % 2 === 0 ? 46 : 19;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    return [50 + r * Math.cos(a), 52 + r * Math.sin(a)] as Pt;
  });
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i <= 10; i++) {
    const p = pts[i % 10];
    const prev = pts[i - 1];
    d += ` Q${f((prev[0] + p[0]) / 2 + (i % 2 ? 0 : 0))} ${f((prev[1] + p[1]) / 2)} ${f(p[0])} ${f(p[1])}`;
  }
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} {...svgProps}>
      <defs>
        <radialGradient id={`${id}s`} cx="0.5" cy="0.52" r="0.55">
          <stop offset="0" stopColor="#FFC27A" />
          <stop offset="1" stopColor={C.flamboyan} />
        </radialGradient>
      </defs>
      <path d={d} fill={`url(#${id}s)`} strokeLinejoin="round" stroke={C.flamboyan} strokeWidth={5} />
      {pts.filter((_, i) => i % 2 === 0).map(([x, y], i) => (
        <g key={i} fill="#FFE2B8">
          <circle cx={50 + (x - 50) * 0.35} cy={52 + (y - 52) * 0.35} r={2.2} />
          <circle cx={50 + (x - 50) * 0.6} cy={52 + (y - 52) * 0.6} r={1.8} />
          <circle cx={50 + (x - 50) * 0.8} cy={52 + (y - 52) * 0.8} r={1.3} />
        </g>
      ))}
    </svg>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   Birds
   ══════════════════════════════════════════════════════════════════════════ */

/** Hispaniolan amazon — the cotorra, national bird of the DR. */
export const Parrot: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useGid();
  return (
    <svg viewBox="0 0 100 150" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7DD36A" />
          <stop offset="1" stopColor="#2A8A44" />
        </linearGradient>
      </defs>
      <path d="M0 110 C30 104 70 114 100 106" stroke={C.bark} strokeWidth={7} />
      <path d="M52 96 L42 146 L56 146 L64 98 Z" fill="#2E7D8C" />
      <path d="M48 98 L46 140 L52 140 Z" fill={C.sky} fillOpacity={0.7} />
      <path d="M38 40 C26 52 24 82 36 100 C44 110 60 110 68 100 C76 86 74 58 64 44 C58 36 46 34 38 40 Z" fill={`url(#${id}g)`} />
      <ellipse cx="46" cy="88" rx="8" ry="5.5" fill={C.coralDark} fillOpacity={0.75} />
      <path d="M56 52 C70 58 74 82 66 102 C60 96 54 80 52 64 Z" fill="#23794A" />
      <path d="M60 86 C64 92 66 98 66 102 C61 98 58 92 57 86 Z" fill={C.skyDark} />
      <path d="M58 60 C64 64 66 72 64 78 M56 68 C60 72 62 78 61 84" stroke="#8FE07C" strokeOpacity={0.5} strokeWidth={1.2} />
      <circle cx="44" cy="34" r="16" fill="#5CC25A" />
      <path d="M30 30 C32 22 40 18 48 20 C42 22 36 26 34 32 Z" fill={C.cream} />
      <path d="M44 44 C48 48 54 48 58 44" stroke="#2A8A44" strokeOpacity={0.6} strokeWidth={1.4} />
      <path d="M30 31 C21 31 17 38 19 46 C23 42 27 40 32 40 Z" fill="#F1E3C6" />
      <path d="M22 44 C24 41 27 40 31 40" stroke="#C9B48E" strokeWidth={1.2} />
      <circle cx="40" cy="32" r="3.2" fill={C.cream} />
      <circle cx="40" cy="32" r="1.7" fill={C.ink} />
      <path d="M42 108 L40 114 M48 109 L48 115" stroke="#7A6A5A" strokeWidth={3} />
    </svg>
  );
};

/** Kept for the inner pages, which ask for a "toucan": here it is the cotorra. */
export const Toucan = Parrot;

/** Hispaniolan emerald hummingbird, hovering. Wings flutter via CSS. */
export const Hummingbird: React.FC<IllustrationProps & { flutter?: boolean }> = ({ className = '', style, flutter = true }) => {
  const id = useGid();
  return (
    <svg viewBox="0 0 120 80" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}e`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4FE0A0" />
          <stop offset="1" stopColor="#0E7A5A" />
        </linearGradient>
      </defs>
      <g className={flutter ? 'wing-flutter' : undefined} style={{ transformOrigin: '66px 38px' }}>
        <path d="M64 36 C66 18 80 8 96 10 C88 20 78 32 68 40 Z" fill="#BFF3E2" fillOpacity={0.7} />
        <path d="M58 36 C54 18 62 4 78 2 C76 14 70 28 64 38 Z" fill="#E6FFF6" fillOpacity={0.85} />
      </g>
      <path d="M100 52 L118 62 L112 52 L118 44 Z" fill="#0B5E46" />
      <path d="M40 40 C48 30 66 30 78 36 C88 40 96 46 104 56 C92 54 80 52 70 52 C58 54 46 50 40 40 Z" fill={`url(#${id}e)`} />
      <path d="M44 44 C50 50 60 50 66 48" stroke="#C4FFE6" strokeOpacity={0.5} strokeWidth={1.4} />
      <circle cx="40" cy="38" r="9" fill="#17A57A" />
      <path d="M33 41 C36 46 42 47 46 44" stroke="#2DF0B0" strokeWidth={2} />
      <path d="M32 37 L2 35 L32 40 Z" fill={C.ink} />
      <circle cx="38" cy="36" r="1.8" fill={C.ink} />
      <circle cx="37.4" cy="35.4" r="0.6" fill="#fff" />
    </svg>
  );
};

/** Magnificent frigatebird — the long-winged glider over every Bávaro beach. */
export const Frigatebird: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 50" className={className} style={style} {...svgProps}>
    <path
      d="M60 26 C50 20 40 12 28 8 C18 6 8 10 2 16 C14 14 26 18 36 24 C44 28 52 30 56 30 L58 40 L55 49 L60 43 L65 49 L62 40 L64 30 C68 30 76 28 84 24 C94 18 106 14 118 16 C112 10 102 6 92 8 C80 12 70 20 60 26 Z"
      fill="currentColor"
    />
    <circle cx="60" cy="29" r="2.4" fill={C.coral} />
  </svg>
);

/** A loose V of birds, for a far sky. */
export const Birds: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 40" className={className} style={style} {...svgProps}>
    <g stroke="currentColor" strokeWidth={2.4}>
      <path d="M8 22 Q16 12 24 22 Q32 12 40 22" />
      <path d="M52 12 Q58 4 64 12 Q70 4 76 12" />
      <path d="M86 26 Q92 18 98 26 Q104 18 110 26" />
    </g>
  </svg>
);

/** Caribbean flamingo, from the lagoon at Oviedo. */
export const Flamingo: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useGid();
  return (
    <svg viewBox="0 0 100 180" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFB3A8" />
          <stop offset="1" stopColor="#F2675C" />
        </linearGradient>
      </defs>
      <path d="M62 96 L64 176 M64 176 L56 178 M66 96 L76 124 L62 128" stroke="#F28B82" strokeWidth={2.6} />
      <path d="M46 70 C34 60 32 46 42 36 C50 28 52 18 44 12" stroke={`url(#${id}f)`} strokeWidth={7} />
      <path d="M40 70 C50 56 80 58 88 72 C94 84 82 96 64 96 C50 96 38 86 40 70 Z" fill={`url(#${id}f)`} />
      <path d="M52 72 C64 64 80 68 86 78 C74 82 60 82 52 72 Z" fill={C.coralDark} fillOpacity={0.55} />
      <path d="M86 74 L98 80 L88 84 Z" fill={C.ink} />
      <circle cx="40" cy="12" r="7" fill="#FFB3A8" />
      <path d="M34 10 C27 12 25 19 28 25 C30 20 32 18 37 16 Z" fill="#F7EBDD" />
      <path d="M28 25 C27 22 27 19 29 17 L31 19 Z" fill={C.ink} />
      <circle cx="41" cy="10" r="1.4" fill={C.ink} />
    </svg>
  );
};

/** Brown pelican on a dock post. */
export const Pelican: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useGid();
  return (
    <svg viewBox="0 0 140 130" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A6988A" />
          <stop offset="1" stopColor="#5E5248" />
        </linearGradient>
      </defs>
      <rect x="50" y="96" width="30" height="34" rx="4" fill={C.bark} />
      <path d="M50 104 L80 104 M50 116 L80 116" stroke={C.barkDark} strokeOpacity={0.5} strokeWidth={1.5} />
      <path d="M44 52 C40 70 48 92 66 98 C84 102 98 92 100 76 C102 62 92 48 78 46 C64 44 50 44 44 52 Z" fill={`url(#${id}b)`} />
      <path d="M60 56 C76 52 96 60 100 76 C90 84 74 84 62 74 Z" fill="#4A4038" />
      <path d="M66 62 L90 70 M64 68 L88 76" stroke="#8C7F72" strokeWidth={1.2} />
      <path d="M48 54 C40 40 40 26 46 18" stroke="#6B4A36" strokeWidth={9} />
      <ellipse cx="50" cy="16" rx="9" ry="8" fill={C.cream} />
      <path d="M44 10 C48 6 54 6 58 10" stroke={C.mangoLight} strokeWidth={3} />
      <path d="M44 14 L4 30 C10 34 22 36 44 22 Z" fill="#B7AC9C" />
      <path d="M10 31 C20 38 34 34 44 22 L40 22 C30 28 20 32 10 31 Z" fill="#7A6E62" />
      <circle cx="50" cy="15" r="1.6" fill={C.ink} />
      <path d="M62 98 L60 104 M70 99 L70 104" stroke="#3D342C" strokeWidth={3} />
    </svg>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   Sea life
   ══════════════════════════════════════════════════════════════════════════ */

/** Stoplight parrotfish, facing right. */
export const ParrotFish: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useGid();
  return (
    <svg viewBox="0 0 160 90" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5FE3C4" />
          <stop offset="0.6" stopColor="#17A39A" />
          <stop offset="1" stopColor="#0B6E78" />
        </linearGradient>
      </defs>
      <path className="fish-tail" d="M24 45 L2 24 C7 38 7 52 2 66 Z" fill="#F7B23B" style={{ transformOrigin: '24px 45px' }} />
      <path d="M46 20 C66 4 98 4 118 22 Z" fill="#3FC7B4" />
      <path d="M58 70 C70 82 92 82 104 70 Z" fill="#3FC7B4" />
      <path d="M18 45 C30 22 70 12 104 18 C126 22 142 34 148 45 C142 58 126 68 104 72 C70 78 30 68 18 45 Z" fill={`url(#${id}p)`} />
      <g stroke="#B6FFF0" strokeOpacity={0.35} strokeWidth={1.4}>
        {[40, 56, 72, 88].map((x) => (
          <path key={x} d={`M${x} 26 C${x + 6} 36 ${x + 6} 54 ${x} 64`} />
        ))}
      </g>
      <path d="M108 26 C116 34 116 56 108 64" stroke="#FF9E8C" strokeWidth={3} />
      <path d="M120 34 C128 38 134 42 140 44" stroke="#FFD47E" strokeWidth={2} />
      <path d="M140 44 C144 46 146 48 148 45" stroke="#E9F7F2" strokeWidth={2.5} />
      <circle cx="128" cy="38" r="4" fill="#FFF7D6" />
      <circle cx="129" cy="38" r="2" fill={C.ink} />
    </svg>
  );
};

/** Queen angelfish, facing right. */
export const AngelFish: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useGid();
  return (
    <svg viewBox="0 0 130 140" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4FD0E0" />
          <stop offset="0.55" stopColor="#3FB59A" />
          <stop offset="1" stopColor="#F7C64A" />
        </linearGradient>
      </defs>
      <path className="fish-tail" d="M34 70 L8 52 C12 62 12 78 8 88 Z" fill="#FFD447" style={{ transformOrigin: '34px 70px' }} />
      <path d="M46 40 C40 18 52 2 74 4 C66 14 70 26 82 30 Z" fill="#2D8FD0" />
      <path d="M46 100 C40 122 52 138 74 136 C66 126 70 114 82 110 Z" fill="#2D8FD0" />
      <path d="M46 40 C42 20 52 6 70 6" stroke="#FFD447" strokeWidth={2.4} />
      <path d="M30 70 C30 40 60 22 88 30 C104 36 114 54 114 70 C114 86 104 104 88 110 C60 118 30 100 30 70 Z" fill={`url(#${id}a)`} />
      <circle cx="88" cy="40" r="6" fill="#1F4FB5" />
      <circle cx="88" cy="40" r="3" fill="#59C7FF" />
      <path d="M98 62 L102 84" stroke="#2D8FD0" strokeWidth={3} />
      <circle cx="104" cy="56" r="3.6" fill="#FFF7D6" />
      <circle cx="105" cy="56" r="1.8" fill={C.ink} />
      <g fill="#E8FFF6" fillOpacity={0.35}>
        {[[54, 56], [62, 70], [54, 84], [70, 56], [70, 84], [78, 70]].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r={2.2} />
        ))}
      </g>
    </svg>
  );
};

/** A small reef fish, for schools. Takes its colour from `currentColor`. */
export const Fish: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 60 30" className={className} style={style} {...svgProps}>
    <path d="M12 15 L1 6 C3 12 3 18 1 24 Z" fill="currentColor" fillOpacity={0.85} />
    <path d="M8 15 C16 5 38 2 50 9 C55 12 58 14 59 15 C58 16 55 18 50 21 C38 28 16 25 8 15 Z" fill="currentColor" />
    <path d="M20 9 C24 14 24 18 20 22" stroke="#fff" strokeOpacity={0.35} strokeWidth={1.4} />
    <circle cx="49" cy="13" r="1.8" fill="#fff" />
    <circle cx="49.4" cy="13" r="0.9" fill={C.ink} />
  </svg>
);

/** Green sea turtle, from above, swimming toward the top of its box. */
export const SeaTurtle: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useGid();
  return (
    <svg viewBox="0 0 160 200" className={className} style={style} {...svgProps}>
      <defs>
        <radialGradient id={`${id}s`} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#B08A4E" />
          <stop offset="0.7" stopColor="#6E6A36" />
          <stop offset="1" stopColor="#4C5A2E" />
        </radialGradient>
      </defs>
      <g fill="#A3A06A">
        <path className="flipper-l" style={{ transformOrigin: '58px 80px' }} d="M58 70 C34 56 12 60 2 78 C20 76 38 82 56 92 Z" />
        <path className="flipper-r" style={{ transformOrigin: '102px 80px' }} d="M102 70 C126 56 148 60 158 78 C140 76 122 82 104 92 Z" />
        <path d="M62 146 C50 158 44 172 48 184 C56 174 64 164 70 154 Z" />
        <path d="M98 146 C110 158 116 172 112 184 C104 174 96 164 90 154 Z" />
        <path d="M76 156 L80 172 L84 156 Z" />
      </g>
      <ellipse cx="80" cy="36" rx="13" ry="18" fill="#A3A06A" />
      <g fill="#6E7044" fillOpacity={0.6}>
        <circle cx="75" cy="30" r="2.4" />
        <circle cx="85" cy="32" r="2" />
        <circle cx="80" cy="42" r="2.2" />
      </g>
      <ellipse cx="80" cy="106" rx="40" ry="52" fill={`url(#${id}s)`} />
      <g stroke="#E8D9A8" strokeOpacity={0.45} strokeWidth={1.6} fill="none">
        <path d="M80 60 L68 74 L72 94 L88 94 L92 74 Z" />
        <path d="M72 94 L68 116 L80 128 L92 116 L88 94" />
        <path d="M80 128 L72 146 M80 128 L88 146" />
        <path d="M68 74 L48 84 M92 74 L112 84 M68 116 L46 120 M92 116 L114 120 M72 94 L44 100 M88 94 L116 100" />
      </g>
    </svg>
  );
};

/** Humpback whale — they come to Samaná Bay every winter to calve. */
export const Humpback: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useGid();
  return (
    <svg viewBox="0 0 260 120" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3F6C86" />
          <stop offset="1" stopColor="#1C3B52" />
        </linearGradient>
      </defs>
      <path
        d="M10 62 C20 40 60 30 110 32 C160 34 200 46 228 58 L250 40 C254 50 250 60 244 64 C252 68 256 80 252 90 L230 72 C200 84 150 92 100 90 C60 88 26 82 10 62 Z"
        fill={`url(#${id}w)`}
      />
      <path d="M14 66 C40 80 80 86 120 86 C100 80 60 74 14 66 Z" fill="#C9DCE6" fillOpacity={0.55} />
      <g stroke="#9EBFD0" strokeOpacity={0.5} strokeWidth={1.2}>
        <path d="M24 70 C44 76 64 80 84 82" />
        <path d="M22 74 C42 80 62 84 82 86" />
      </g>
      <path d="M80 80 C90 100 110 112 142 116 C122 104 108 92 100 84 Z" fill="#2C5068" />
      <path d="M112 108 L120 110 L128 112" stroke="#C9DCE6" strokeOpacity={0.6} strokeWidth={2} />
      <path d="M168 40 C172 34 176 32 180 34 L182 44 Z" fill="#1C3B52" />
      <g fill="#C9DCE6" fillOpacity={0.6}>
        <circle cx="36" cy="54" r="1.8" />
        <circle cx="44" cy="50" r="1.4" />
        <circle cx="30" cy="58" r="1.4" />
      </g>
      <circle cx="44" cy="64" r="2" fill="#0B1F2D" />
    </svg>
  );
};

/** Spotted eagle ray, from above. */
export const EagleRay: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useGid();
  return (
    <svg viewBox="0 0 200 150" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2D4F66" />
          <stop offset="1" stopColor="#1A3446" />
        </linearGradient>
      </defs>
      <path d="M100 104 C100 120 98 134 92 148" stroke="#1A3446" strokeWidth={2.4} />
      <path
        className="ray-wings"
        style={{ transformOrigin: '100px 70px' }}
        d="M100 30 C120 30 160 50 196 78 C160 76 130 84 112 96 C108 100 104 104 100 104 C96 104 92 100 88 96 C70 84 40 76 4 78 C40 50 80 30 100 30 Z"
        fill={`url(#${id}r)`}
      />
      <path d="M92 32 C94 22 106 22 108 32" fill="#2D4F66" />
      <g fill="#E8F6FF" fillOpacity={0.75}>
        {[[60, 62], [76, 54], [90, 50], [110, 50], [124, 54], [140, 62], [48, 70], [152, 70], [86, 66], [114, 66], [100, 80], [70, 74], [130, 74]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={2.4} />
        ))}
      </g>
    </svg>
  );
};

export const Seahorse: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useGid();
  return (
    <svg viewBox="0 0 80 140" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}h`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.mangoLight} />
          <stop offset="1" stopColor={C.flamboyan} />
        </linearGradient>
      </defs>
      <path d="M58 56 C68 58 70 70 60 76 Z" fill={C.coralLight} />
      <path
        d="M40 16 C52 14 58 24 54 34 C62 42 62 56 55 66 C48 76 46 88 52 98 C58 108 55 124 43 128 C33 131 26 123 30 114 C33 108 40 108 42 114 C40 112 36 112 35 116 C35 122 42 124 46 118 C50 110 44 100 40 92 C36 82 36 70 42 60 C46 52 44 44 38 40 C34 36 33 22 40 16 Z"
        fill={`url(#${id}h)`}
      />
      <path d="M42 20 L20 21 C18 23 18 26 20 28 L40 30 Z" fill={C.flamboyan} />
      <path d="M44 14 L46 6 L50 14 L54 8 L54 18" fill={C.mango} />
      <g stroke="#FFE7C2" strokeOpacity={0.55} strokeWidth={1.2}>
        {[44, 52, 60, 68, 76, 84, 92].map((y) => (
          <path key={y} d={`M${y < 60 ? 44 : 42} ${y} L${y < 60 ? 56 : 52} ${y + 2}`} />
        ))}
      </g>
      <circle cx="44" cy="24" r="2.2" fill={C.ink} />
    </svg>
  );
};

/** Branching elkhorn coral. */
export const Coral: React.FC<IllustrationProps & { tone?: 'coral' | 'orchid' | 'mango' }> = ({ className = '', style, tone = 'coral' }) => {
  const col = tone === 'orchid' ? '#B98BE0' : tone === 'mango' ? '#F7B23B' : '#F28B7E';
  const dark = tone === 'orchid' ? '#8A5BBF' : tone === 'mango' ? '#D98612' : '#CF453E';
  return (
    <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
      <g stroke={dark} strokeWidth={12}>
        <path d="M60 118 C60 96 58 84 48 72" />
      </g>
      <g stroke={col} strokeWidth={9}>
        <path d="M60 118 C60 96 58 84 48 72 C40 62 34 48 36 30" />
        <path d="M48 72 C36 70 24 62 18 48" />
        <path d="M60 100 C70 88 84 82 92 66 C96 56 96 44 92 34" />
        <path d="M80 82 C90 82 102 76 108 64" />
        <path d="M44 60 C52 50 56 36 54 22" />
        <path d="M92 50 C100 46 104 38 104 30" />
      </g>
      <g fill="#FFE2D8" fillOpacity={0.5}>
        {[[36, 32], [18, 50], [92, 36], [108, 64], [54, 24], [104, 32]].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r={2.2} />
        ))}
      </g>
    </svg>
  );
};

/** Purple sea fan. */
export const SeaFan: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
    <g stroke="#A779D8" strokeWidth={2}>
      {Array.from({ length: 13 }).map((_, i) => {
        const a = (-70 + i * (140 / 12)) * (Math.PI / 180);
        const x = 60 + Math.sin(a) * 56;
        const y = 116 - Math.cos(a) * 92;
        return <path key={i} d={`M60 116 Q${f(60 + Math.sin(a) * 20)} ${f(80)} ${f(x)} ${f(y)}`} />;
      })}
    </g>
    <g stroke="#C9A6EE" strokeOpacity={0.6} strokeWidth={1.1}>
      {[40, 58, 76, 94].map((r) => (
        <path key={r} d={`M${60 - r * 0.62} ${116 - r * 0.75} Q60 ${116 - r * 1.25} ${60 + r * 0.62} ${116 - r * 0.75}`} />
      ))}
    </g>
  </svg>
);

/** Seagrass and sargassum. Each strand sways on its own clock. */
export const Seaweed: React.FC<IllustrationProps & { tone?: 'green' | 'gold' }> = ({ className = '', style, tone = 'green' }) => {
  const [a, b] = tone === 'gold' ? ['#C9A13E', '#8E7124'] : ['#4FB86A', '#1E6A3B'];
  return (
    <svg viewBox="0 0 80 160" className={className} style={style} {...svgProps}>
      {[
        { d: 'M20 160 C10 130 30 110 18 80 C8 56 26 36 20 8', w: 6, c: b, delay: '0s' },
        { d: 'M40 160 C52 132 30 110 42 82 C52 58 34 40 44 16', w: 7, c: a, delay: '-1.4s' },
        { d: 'M60 160 C68 136 54 120 62 96 C68 78 58 64 64 44', w: 5, c: b, delay: '-2.6s' },
      ].map((s, i) => (
        <path
          key={i}
          className="seaweed-strand"
          style={{ animationDelay: s.delay, transformOrigin: 'bottom center' }}
          d={s.d}
          stroke={s.c}
          strokeWidth={s.w}
        />
      ))}
    </svg>
  );
};

/** A column of rising bubbles. */
export const Bubbles: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 40 120" className={className} style={style} {...svgProps}>
    {[[20, 110, 5], [14, 84, 4], [24, 60, 6], [16, 36, 3.5], [22, 14, 4.5]].map(([x, y, r], i) => (
      <g key={i}>
        <circle cx={x} cy={y} r={r} stroke="#E8FFFB" strokeOpacity={0.75} strokeWidth={1.4} />
        <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.25} fill="#fff" fillOpacity={0.8} />
      </g>
    ))}
  </svg>
);

/* ══════════════════════════════════════════════════════════════════════════
   Sky & shore
   ══════════════════════════════════════════════════════════════════════════ */

export const SunBurst: React.FC<IllustrationProps & { spin?: boolean }> = ({ className = '', style, spin = false }) => {
  const id = useGid();
  return (
    <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
      <defs>
        <radialGradient id={`${id}s`}>
          <stop offset="0" stopColor="#FFF4C9" />
          <stop offset="0.35" stopColor="#FFD47E" />
          <stop offset="0.5" stopColor="#FFD47E" stopOpacity={0.45} />
          <stop offset="1" stopColor="#FFD47E" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="60" fill={`url(#${id}s)`} className={spin ? 'animate-float' : undefined} />
    </svg>
  );
};

export const Cloud: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 60" className={className} style={style} {...svgProps}>
    <path d="M14 48 C2 48 2 32 16 32 C16 18 36 12 46 24 C52 8 80 8 84 26 C98 20 114 30 106 44 C112 50 104 52 98 50 L20 50 Z" fill="#FFFFFF" fillOpacity={0.92} />
    <path d="M20 50 L98 50" stroke="#BDE9FA" strokeWidth={2} />
  </svg>
);

export const PalmTree: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useGid();
  return (
    <svg viewBox="0 0 200 300" overflow="visible" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#B58A5E" />
          <stop offset="1" stopColor="#7A5434" />
        </linearGradient>
      </defs>
      <path d="M70 300 C74 230 84 160 112 92 L124 96 C100 160 92 230 92 300 Z" fill={`url(#${id}t)`} />
      {Array.from({ length: 13 }).map((_, i) => {
        const y = 290 - i * 16;
        const x = 80 + i * 2.7;
        return <path key={i} d={`M${x - 8} ${y} Q${x + 3} ${y - 5} ${x + 15} ${y - 1}`} stroke="#6A4A2E" strokeOpacity={0.5} strokeWidth={2} />;
      })}
      {[
        { r: -175, s: 0.5 },
        { r: -140, s: 0.56 },
        { r: -100, s: 0.5 },
        { r: -62, s: 0.56 },
        { r: -22, s: 0.52 },
        { r: 12, s: 0.46 },
        { r: -120, s: 0.4 },
        { r: -42, s: 0.42 },
      ].map((fr, i) => (
        <g key={i} transform={`translate(118 94) rotate(${fr.r + 42}) scale(${fr.s}) translate(-12 -190)`}>
          <path d={PALM_FROND.leaflets} fill={i % 2 ? '#2F8A4A' : '#3E9B50'} />
          <path d={PALM_FROND.rachis} stroke="#1E6A3B" strokeWidth={4} />
        </g>
      ))}
      <circle cx="112" cy="100" r="7" fill="#6B4A2E" />
      <circle cx="124" cy="104" r="7" fill="#7A5434" />
      <circle cx="118" cy="110" r="6.5" fill="#5E3E26" />
    </svg>
  );
};

/** Layered water edge closing a band: three currents, the top one foamy. */
export const WaveBand: React.FC<IllustrationProps & { tone?: 'lagoon' | 'sky' | 'abyss' }> = ({ className = '', style, tone = 'lagoon' }) => {
  const layers =
    tone === 'abyss'
      ? ['#0B4F5C', '#08404B', '#06323D']
      : tone === 'sky'
      ? ['#BDE9FA', '#7FD3EE', '#4DB6E5']
      : ['#93ECE1', '#4FCFC4', '#17B5AC'];
  return (
    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className={className} style={style} {...svgProps}>
      <path className="current-a" d="M0 58 C140 30 260 86 420 60 C580 34 700 84 860 58 C1000 36 1100 70 1200 52 L1200 120 L0 120 Z" fill={layers[0]} />
      <path className="current-b" d="M0 78 C160 56 300 104 460 80 C620 56 760 102 920 80 C1040 64 1120 86 1200 74 L1200 120 L0 120 Z" fill={layers[1]} />
      <path d="M0 98 C180 82 320 116 500 98 C680 82 820 114 1000 98 C1080 92 1150 98 1200 94 L1200 120 L0 120 Z" fill={layers[2]} />
      <path d="M0 58 C140 30 260 86 420 60 C580 34 700 84 860 58 C1000 36 1100 70 1200 52" stroke="#FFFFFF" strokeOpacity={0.65} strokeWidth={3} strokeDasharray="2 14" />
    </svg>
  );
};

/** A short curl of foam, used as a section flourish. */
export const FoamLine: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 160 24" className={className} style={style} {...svgProps}>
    <path d="M4 14 C20 4 34 22 50 12 C66 2 80 22 96 12 C112 2 126 22 142 12 C148 8 152 10 156 12" stroke={C.lagoon} strokeWidth={3} />
    <circle cx="80" cy="12" r="3" fill={C.coral} />
  </svg>
);

export default {
  MonsteraLeaf,
  PalmFrond,
  Fern,
  BananaLeaf,
  Heliconia,
  Hibiscus,
  Pineapple,
  Cocktail,
  Sailboat,
  Conch,
  Starfish,
  Parrot,
  Toucan,
  Hummingbird,
  Frigatebird,
  Birds,
  Flamingo,
  Pelican,
  ParrotFish,
  AngelFish,
  Fish,
  SeaTurtle,
  Humpback,
  EagleRay,
  Seahorse,
  Coral,
  SeaFan,
  Seaweed,
  Bubbles,
  SunBurst,
  Cloud,
  PalmTree,
  WaveBand,
  FoamLine,
};
