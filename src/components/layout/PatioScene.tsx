import React from 'react';

/**
 * The wall the menu opens onto: an old house in the Zona Colonial.
 *
 * Salmon lime-wash, faded in places, the plaster fallen away here and there to
 * show the brick, patched again in a fresher coat around the windows; a cream
 * cornice and pilasters, a band of azulejo at the foot. Palms hang over the
 * top, a bougainvillea climbs the pilasters, monstera and hibiscus grow out of
 * the corners, and somebody has sprayed "Gloria a Jesús" across the wall —
 * as on a hundred walls in the country.
 *
 * One static SVG, drawn only while the menu is open, scaled to cover the
 * viewport. What moves (the fronds, the butterflies) moves by transform alone.
 */

const INK = '#1D2346';

/** A leaf of the climbing vine: a pointed oval, turned along the stem. */
const vineLeaves = (points: Array<[number, number, number]>) =>
  points.map(([x, y, angle], i) => (
    <path
      key={i}
      d="M0 0C6 -8 18 -8 26 0C18 8 6 8 0 0Z"
      transform={`translate(${x} ${y}) rotate(${angle})`}
      fill={i % 3 === 0 ? '#7DBA4F' : '#4F9136'}
      stroke={INK}
      strokeWidth={1.6}
    />
  ));

/** A bougainvillea cluster: three papery bracts around a pale centre, many times over. */
const Bougainvillea: React.FC<{ x: number; y: number; scale?: number }> = ({ x, y, scale = 1 }) => {
  const blooms: Array<[number, number]> = [
    [0, 0], [16, -6], [30, 4], [8, 14], [24, 18], [-12, 10], [40, -8], [-4, -14], [36, 20],
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {blooms.map(([bx, by], i) => (
        <g key={i} transform={`translate(${bx} ${by}) rotate(${i * 37})`}>
          {[0, 120, 240].map((r) => (
            <ellipse key={r} cx={0} cy={-5} rx={4.6} ry={6.4} transform={`rotate(${r})`} fill={i % 4 === 0 ? '#F2AEDB' : '#BF3A8F'} stroke={INK} strokeWidth={1} />
          ))}
          <circle r={1.8} fill="#FFF3B0" />
        </g>
      ))}
    </g>
  );
};

/** A hibiscus: five red petals, a long stamen. */
const Hibiscus: React.FC<{ x: number; y: number; r?: number; tone?: string }> = ({ x, y, r = 0, tone = '#E5482F' }) => (
  <g transform={`translate(${x} ${y}) rotate(${r})`}>
    {[0, 72, 144, 216, 288].map((a) => (
      <path key={a} d="M0 0C-12 -10 -12 -30 0 -34C12 -30 12 -10 0 0Z" transform={`rotate(${a})`} fill={tone} stroke={INK} strokeWidth={2} />
    ))}
    <circle r={5} fill="#7A1F14" />
    <path d="M0 0L16 -22" stroke="#FFDD6E" strokeWidth={3} strokeLinecap="round" />
    <circle cx={17} cy={-24} r={3.4} fill="#FFDD6E" stroke={INK} strokeWidth={1} />
  </g>
);

/** A palm frond hanging from the roof line: a midrib and a fan of leaflets. */
const Frond: React.FC<{ transform: string; className?: string; shade?: string }> = ({ transform, className, shade = '#4F9136' }) => (
  <g transform={transform}>
    <g className={className}>
      <path d="M0 0C80 30 170 90 250 190" fill="none" stroke="#2F611E" strokeWidth={5} strokeLinecap="round" />
      {Array.from({ length: 11 }, (_, i) => {
        const t = (i + 1) / 12;
        const x = 250 * t * (0.75 + 0.25 * t);
        const y = 190 * t * t + 30 * t;
        const length = 70 - i * 3.5;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d={`M0 0C${length * 0.4} -10 ${length * 0.8} -6 ${length} 8C${length * 0.6} 6 ${length * 0.3} 6 0 0Z`} transform="rotate(-38)" fill={shade} stroke={INK} strokeWidth={1.8} />
            <path d={`M0 0C${length * 0.4} -10 ${length * 0.8} -6 ${length} 8C${length * 0.6} 6 ${length * 0.3} 6 0 0Z`} transform="rotate(62) scale(1 -1)" fill={i % 2 ? '#7DBA4F' : shade} stroke={INK} strokeWidth={1.8} />
          </g>
        );
      })}
    </g>
  </g>
);

/** A monstera leaf, split the way the old ones are (the splits are holes). */
const Monstera: React.FC<{ transform: string; fill?: string }> = ({ transform, fill = '#3E8A2E' }) => (
  <g transform={transform}>
    <path
      fillRule="evenodd"
      d={[
        'M0 0C-24 -12 -96 -36 -110 -112C-120 -170 -72 -214 -14 -202C-6 -200 2 -196 8 -190C42 -222 112 -200 120 -130C128 -58 40 -12 0 0Z',
        'M-110 -118L-34 -104L-108 -96Z',
        'M-100 -70L-26 -66L-90 -52Z',
        'M-74 -184L-20 -140L-88 -170Z',
        'M118 -126L40 -112L116 -104Z',
        'M106 -72L34 -66L96 -54Z',
        'M88 -186L38 -144L102 -172Z',
      ].join(' ')}
      fill={fill}
      stroke={INK}
      strokeWidth={3}
      strokeLinejoin="round"
    />
    <path d="M0 0C-4 -60 -2 -130 4 -192" fill="none" stroke="#B4D98A" strokeWidth={3} strokeLinecap="round" />
  </g>
);

/** A long banana leaf, for the back of the pot. */
const BananaLeaf: React.FC<{ transform: string; fill?: string }> = ({ transform, fill = '#4F9136' }) => (
  <g transform={transform}>
    <path d="M0 0C-34 -70 -30 -190 0 -250C30 -190 34 -70 0 0Z" fill={fill} stroke={INK} strokeWidth={2.6} />
    <path d="M0 -4V-244" stroke="#B4D98A" strokeWidth={2.5} />
    {Array.from({ length: 7 }, (_, i) => (
      <path key={i} d={`M0 ${-30 - i * 30}l${i % 2 ? 22 : -22} -16`} stroke="#2F611E" strokeWidth={1.6} />
    ))}
  </g>
);

/** A terracotta pot on the azulejo, with whatever grew out of it. */
const Pot: React.FC<{ x: number; mirror?: boolean; children?: React.ReactNode }> = ({ x, mirror = false, children }) => (
  <g transform={`translate(${x} 0) scale(${mirror ? -1 : 1} 1)`}>
    {children}
    <path d="M-78 896H78L64 1000H-64Z" fill="#C8643F" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
    <path d="M-88 880H88V904H-88Z" fill="#DE7B52" stroke={INK} strokeWidth={4} />
    <path d="M-40 930C-10 940 20 940 46 928" fill="none" stroke="#F7B48F" strokeWidth={4} strokeLinecap="round" />
  </g>
);

/** A patch where the plaster has fallen and the brick shows. */
const Spall: React.FC<{ d: string }> = ({ d }) => (
  <g>
    <path d={d} fill="#FFE6D6" stroke="#FFE6D6" strokeWidth={10} strokeLinejoin="round" />
    <path d={d} fill="url(#patio-brick)" stroke="#8B3A28" strokeWidth={3} strokeLinejoin="round" />
  </g>
);

export const PatioWall: React.FC<{ narrow?: boolean }> = ({ narrow = false }) => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="patio-wall" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#F8BC9C" />
          <stop offset="0.55" stopColor="#F2A585" />
          <stop offset="1" stopColor="#EA9070" />
        </linearGradient>
        <pattern id="patio-brick" width="44" height="22" patternUnits="userSpaceOnUse">
          <rect width="44" height="22" fill="#B9583F" />
          <path d="M0 0.5H44M0 11H44M0 21.5H44M22 0V11M0 11V22M44 11V22" stroke="#EBC6A4" strokeWidth={2.4} />
          <rect x="3" y="3" width="15" height="5" fill="#A54A33" opacity={0.6} />
          <rect x="26" y="14" width="13" height="4" fill="#C96B4F" opacity={0.6} />
        </pattern>
        <pattern id="patio-azulejo" width="60" height="60" patternUnits="userSpaceOnUse">
          <rect width="60" height="60" fill="#2F4FD1" />
          <path d="M30 6L54 30L30 54L6 30Z" fill="none" stroke="#F7EFE1" strokeWidth={3} />
          <circle cx="30" cy="30" r="8" fill="#FFDD6E" stroke="#F7EFE1" strokeWidth={2} />
          <path d="M0 0L10 10M60 0L50 10M0 60L10 50M60 60L50 50" stroke="#A9BAF5" strokeWidth={3} />
          <rect width="60" height="60" fill="none" stroke="#1A2F94" strokeWidth={2} />
        </pattern>
        <linearGradient id="patio-spray" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#BF3A8F" />
          <stop offset="0.5" stopColor="#E5482F" />
          <stop offset="1" stopColor="#F5B921" />
        </linearGradient>
        <radialGradient id="patio-lamp">
          <stop offset="0" stopColor="#FFF3B0" stopOpacity={0.9} />
          <stop offset="1" stopColor="#FFF3B0" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* The wall, and the weather on it. */}
      <rect width="1600" height="1000" fill="url(#patio-wall)" />
      <path d="M90 160C240 120 330 220 280 330C230 430 80 420 40 330C0 240 20 180 90 160Z" fill="#FFFFFF" opacity={0.14} />
      <path d="M1180 520C1320 480 1460 560 1440 680C1420 780 1250 800 1180 730C1110 660 1100 550 1180 520Z" fill="#FFFFFF" opacity={0.12} />
      <path d="M420 640C520 600 600 680 560 760C520 840 400 820 380 750C360 690 380 655 420 640Z" fill="#D9785A" opacity={0.18} />
      <path d="M1320 90C1420 80 1500 150 1480 230C1460 300 1360 300 1320 250C1280 200 1270 100 1320 90Z" fill="#D9785A" opacity={0.16} />
      {Array.from({ length: 14 }, (_, i) => (
        <path key={i} d={`M${60 + i * 113} ${80 + ((i * 53) % 120)}v${60 + ((i * 37) % 90)}`} stroke="#D9785A" strokeWidth={6} strokeLinecap="round" opacity={0.12} />
      ))}

      {/* Where the plaster gave way. */}
      <Spall d="M150 560L220 548L300 566L318 620L290 676L210 690L150 662L134 610Z" />
      <Spall d="M1350 270L1420 262L1470 300L1452 360L1388 376L1340 340Z" />
      <Spall d="M660 92L740 86L790 110L760 140L690 142L652 120Z" />
      <path d="M318 620L360 640L372 690M290 676L300 720L330 740M1340 340L1300 372L1296 420M1452 360L1490 390" fill="none" stroke="#7A3B2A" strokeWidth={2} opacity={0.6} />
      <path d="M1130 300L1180 330L1196 380L1240 396M470 600L430 626L420 680" fill="none" stroke="#7A3B2A" strokeWidth={2} opacity={0.45} />

      {/* Cornice, dentils and pilasters. */}
      <rect x="0" y="0" width="1600" height="74" fill="#FFF4E2" />
      <path d="M0 52H1600M0 62H1600M0 74H1600" stroke={INK} strokeWidth={3} />
      {Array.from({ length: 54 }, (_, i) => (
        <rect key={i} x={i * 30 + 6} y={74} width={16} height={12} fill="#FFF4E2" stroke={INK} strokeWidth={2} />
      ))}
      {[300, 1240].map((x) => (
        <g key={x}>
          <rect x={x} y={86} width={60} height={820} fill="#FFF4E2" stroke={INK} strokeWidth={3} />
          <rect x={x - 10} y={86} width={80} height={26} fill="#FFF4E2" stroke={INK} strokeWidth={3} />
          <path d={`M${x + 14} 130V880M${x + 46} 130V880`} stroke="#E2CDA6" strokeWidth={4} />
          <path d={`M${x + 8} ${x === 300 ? 470 : 560}l22 10l14 34`} fill="none" stroke="#B9A07A" strokeWidth={2} />
        </g>
      ))}

      {/* A wrought-iron farol on the right pilaster. */}
      <g transform="translate(1270 170)">
        <circle r={70} fill="url(#patio-lamp)" />
        <path d="M-40 -40H10V-30M-40 -40V-20" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
        <path d="M-6 -30H26L32 -18H-12Z" fill={INK} />
        <path d="M-10 -18H30L24 26H-4Z" fill="#FFDD6E" stroke={INK} strokeWidth={4} />
        <path d="M10 -18V26" stroke={INK} strokeWidth={2} />
        <path d="M-6 26H26L18 36H2Z" fill={INK} />
      </g>

      {/* The azulejo band at the foot of the wall. */}
      <rect x="0" y="906" width="1600" height="94" fill="url(#patio-azulejo)" />
      <path d="M0 906H1600" stroke={INK} strokeWidth={5} />
      <Spall d="M1080 930L1130 922L1160 950L1140 984L1090 990L1070 960Z" />

      {/* The graffiti. Smaller on a phone, where the wall is cropped to a
          narrow slice and the full-size letters would run off both sides. */}
      <g transform={`translate(800 ${narrow ? 862 : 852}) rotate(-4) scale(${narrow ? 0.62 : 1})`} fontFamily="'Permanent Marker', 'Caveat', cursive" fontSize={84} textAnchor="middle">
        {Array.from({ length: 26 }, (_, i) => (
          <circle key={i} cx={-330 + ((i * 97) % 660)} cy={-70 + ((i * 41) % 110)} r={1.5 + (i % 3)} fill="#BF3A8F" opacity={0.35} />
        ))}
        <text stroke={INK} strokeWidth={16} strokeLinejoin="round" fill={INK}>
          Gloria a Jesús
        </text>
        <text fill="url(#patio-spray)" stroke="#FFF7EC" strokeWidth={2.5}>
          Gloria a Jesús
        </text>
        {[
          [-232, 10, 34],
          [-120, 14, 22],
          [-12, 12, 44],
          [96, 10, 26],
          [214, 14, 38],
        ].map(([x, y, length]) => (
          <g key={x}>
            <path d={`M${x} ${y}v${length}`} stroke="#BF3A8F" strokeWidth={5} strokeLinecap="round" />
            <circle cx={x} cy={y + length + 4} r={4.5} fill="#BF3A8F" />
          </g>
        ))}
        <path d="M318 -58l8 -18l8 18l18 8l-18 8l-8 18l-8 -18l-18 -8Z" fill="#FFDD6E" stroke={INK} strokeWidth={2.5} />
      </g>

      {/* The bougainvillea climbing both pilasters. */}
      <path d="M330 90C300 200 362 280 326 380C296 470 358 540 330 640" fill="none" stroke="#2F611E" strokeWidth={4} />
      <path d="M1270 90C1300 210 1236 300 1272 420C1300 520 1240 600 1270 700" fill="none" stroke="#2F611E" strokeWidth={4} />
      {vineLeaves([
        [318, 150, 200], [338, 210, -20], [312, 280, 190], [352, 330, -30], [320, 420, 170], [342, 480, -10], [326, 560, 200], [340, 610, -40],
        [1280, 160, -20], [1258, 230, 200], [1250, 300, 160], [1286, 380, -30], [1262, 470, 210], [1284, 540, -10], [1256, 620, 190],
      ])}
      <Bougainvillea x={300} y={130} />
      <Bougainvillea x={330} y={300} scale={0.8} />
      <Bougainvillea x={1250} y={250} scale={0.9} />
      <Bougainvillea x={1266} y={520} scale={0.75} />

      {/* Palms hanging over the roof line. */}
      <Frond transform="translate(-30 -20) rotate(8)" className="frond-sway" />
      <Frond transform="translate(-60 40) rotate(28) scale(0.85)" className="frond-sway frond-sway-slow" shade="#3E8A2E" />
      <Frond transform="translate(1630 -20) scale(-1 1) rotate(8)" className="frond-sway frond-sway-slow" />
      <Frond transform="translate(1660 50) scale(-0.9 0.9) rotate(30)" className="frond-sway" shade="#3E8A2E" />

      {/* Pots of green at the foot of the wall. */}
      <Pot x={150}>
        <BananaLeaf transform="translate(0 884) rotate(-34)" fill="#3E8A2E" />
        <BananaLeaf transform="translate(0 884) rotate(18) scale(0.9)" />
        <Monstera transform="translate(-10 888) rotate(-12) scale(0.95)" />
        <Monstera transform="translate(20 888) rotate(38) scale(0.7)" fill="#4F9136" />
        <Hibiscus x={-70} y={790} r={-10} />
        <Hibiscus x={74} y={760} r={24} tone="#FF9E8A" />
      </Pot>
      <Pot x={1450} mirror>
        <BananaLeaf transform="translate(0 884) rotate(-24)" />
        <BananaLeaf transform="translate(0 884) rotate(30) scale(0.85)" fill="#3E8A2E" />
        <Monstera transform="translate(0 888) rotate(-30) scale(0.85)" fill="#4F9136" />
        <Monstera transform="translate(10 888) rotate(14) scale(0.9)" />
        <Hibiscus x={-60} y={770} r={14} tone="#F5B921" />
        <Hibiscus x={80} y={800} r={-20} />
      </Pot>
    </svg>
  </div>
);

/**
 * Butterflies over the wall. Each drifts on its own loop and beats its wings,
 * both by transform; they are decoration, so pointer events pass through.
 */
export const Butterflies: React.FC = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    {[
      { left: '18%', top: '28%', wing: '#F5B921', spot: '#1D2346', className: 'mariposa-a' },
      { left: '76%', top: '18%', wing: '#3FAFC9', spot: '#1A2F94', className: 'mariposa-b' },
      { left: '62%', top: '72%', wing: '#EE7A3C', spot: '#1D2346', className: 'mariposa-c' },
    ].map((b) => (
      <span key={b.className} className={`mariposa ${b.className}`} style={{ left: b.left, top: b.top }}>
        <svg viewBox="-24 -20 48 40" className="h-9 w-9">
          <g className="mariposa-wing">
            <path d="M0 0C-6 -16 -22 -20 -22 -6C-22 4 -10 6 0 0Z" fill={b.wing} stroke={INK} strokeWidth={1.8} />
            <path d="M0 0C-4 10 -16 18 -18 8C-19 2 -8 0 0 0Z" fill={b.wing} stroke={INK} strokeWidth={1.8} />
            <circle cx={-12} cy={-8} r={2.6} fill={b.spot} />
          </g>
          <g className="mariposa-wing mariposa-wing-r">
            <path d="M0 0C6 -16 22 -20 22 -6C22 4 10 6 0 0Z" fill={b.wing} stroke={INK} strokeWidth={1.8} />
            <path d="M0 0C4 10 16 18 18 8C19 2 8 0 0 0Z" fill={b.wing} stroke={INK} strokeWidth={1.8} />
            <circle cx={12} cy={-8} r={2.6} fill={b.spot} />
          </g>
          <path d="M0 -8V10" stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <path d="M0 -8L-4 -15M0 -8L4 -15" stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
        </svg>
      </span>
    ))}
  </div>
);

/**
 * Painted shapes behind the logo and the language compass: three irregular
 * pools of colour, a little larger than what sits on them, each turning
 * slowly on its own.
 */
export const ColourPools: React.FC = () => (
  <div className="pointer-events-none absolute inset-0" aria-hidden="true">
    <svg viewBox="0 0 300 300" className="pool pool-a absolute -left-6 top-0 h-[17rem] w-[17rem]">
      <defs>
        <linearGradient id="pool-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFDD6E" />
          <stop offset="1" stopColor="#EE7A3C" />
        </linearGradient>
      </defs>
      <path d="M140 20C176 6 214 30 238 58C262 86 300 104 290 150C282 190 252 200 246 236C238 278 188 296 146 282C112 270 92 290 58 270C22 250 30 210 20 180C8 142 -4 108 26 78C54 50 98 36 140 20Z" fill="url(#pool-a)" stroke={INK} strokeWidth={4} />
    </svg>
    <svg viewBox="0 0 300 300" className="pool pool-b absolute bottom-0 right-[-1.5rem] h-[15rem] w-[15rem]">
      <defs>
        <linearGradient id="pool-b" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#2F4FD1" />
          <stop offset="1" stopColor="#A9E4EE" />
        </linearGradient>
      </defs>
      <path d="M162 18C214 14 262 52 276 104C288 150 262 172 270 214C278 258 232 292 184 284C146 278 128 296 90 282C46 266 20 226 26 182C32 144 10 118 30 84C52 46 112 22 162 18Z" fill="url(#pool-b)" stroke={INK} strokeWidth={4} />
    </svg>
    <svg viewBox="0 0 300 300" className="pool pool-c absolute bottom-[3.5rem] left-[-0.5rem] h-[7.5rem] w-[7.5rem]">
      <defs>
        <radialGradient id="pool-c">
          <stop offset="0" stopColor="#F2AEDB" />
          <stop offset="1" stopColor="#BF3A8F" />
        </radialGradient>
      </defs>
      <path d="M120 40C170 18 240 44 256 104C270 156 236 182 238 218C240 256 190 274 150 260C112 248 76 264 50 230C24 196 44 160 40 126C36 86 76 58 120 40Z" fill="url(#pool-c)" stroke={INK} strokeWidth={5} />
    </svg>
  </div>
);
