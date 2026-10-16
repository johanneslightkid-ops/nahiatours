import React from 'react';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { BananaLeaf, MonsteraLeaf, PalmFrond, SunBurst } from './Illustrations';

/**
 * The page behind every page: a morning sky going to sand, the sun's glow,
 * and the garden leaning in from the edges.
 *
 * It is fixed and full-viewport, so it is kept almost entirely static — a
 * gradient and a few inline SVGs. Only the two corner leaves sway, and only
 * on wide screens; on a phone this is one painted layer and nothing moves.
 * The live water is in the sections that need it, not here.
 */
const IllustratedBackdrop: React.FC = () => {
  const wide = useMediaQuery('(min-width: 1024px)');
  return (
    <div
      className="pointer-events-none fixed inset-0 select-none overflow-hidden"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #CFEFF8 0%, #E6F7F6 26%, #F6F3E4 52%, #FBF5E8 70%, #F5EAD3 100%)',
        }}
      />
      <SunBurst className="absolute -right-24 -top-24 h-80 w-80 opacity-90 sm:h-[28rem] sm:w-[28rem]" />

      {/* Leaf shade falling across the top of the page. */}
      <svg className="absolute -left-10 -top-10 h-[60vh] w-[60vw] opacity-[0.07]" viewBox="0 0 200 200">
        <g fill="#0E3B36">
          {[-20, 10, 40, 70].map((r, i) => (
            <ellipse key={i} cx="0" cy="0" rx="150" ry="14" transform={`rotate(${r})`} />
          ))}
        </g>
      </svg>

      {wide && (
        <>
          <div className="absolute -left-24 bottom-[-12%] h-[26rem] w-[26rem]" style={{ transform: 'rotate(32deg)' }}>
            <PalmFrond color="jungleLight" className="leaf-sway-slow h-full w-full opacity-40" />
          </div>
          <div className="absolute -right-16 bottom-[-10%] h-[30rem] w-60" style={{ transform: 'rotate(-26deg)' }}>
            <BananaLeaf className="leaf-sway-slow h-full w-full opacity-30" />
          </div>
          <div className="absolute -right-20 top-[30%] h-64 w-56" style={{ transform: 'rotate(-110deg)' }}>
            <MonsteraLeaf tone="fresh" className="h-full w-full opacity-20" />
          </div>
        </>
      )}
    </div>
  );
};

export default IllustratedBackdrop;
