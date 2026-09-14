import React from 'react';
import { SunBurst, PalmFrond } from './Illustrations';

/**
 * The painting the whole site hangs in front of.
 *
 * The previous design put a dive photographer's over-under back here: sky
 * above, lit water below, split at the waterline. That was right for a company
 * selling a beach. This company drives people to one — so the picture is the
 * coast road at the end of the afternoon, and it is built the way a landscape
 * painter builds one, from the back of the scene forward:
 *
 *   sky → haze at the horizon → the far headland → the sea → the shore →
 *   the road you are actually on
 *
 * Each of those is a flat mass of a single value. That is the whole trick of a
 * painted landscape: distance is value and temperature, not detail. Nothing
 * back here is drawn; it is blocked in.
 *
 * It does not move. Not as a concession — the last design's version of this
 * layer cost the page most of its frame budget, and I measured that carefully
 * before removing it — but because paint is dry, and a scene that holds still
 * is what makes the photographs in front of it read as the moving part.
 *
 * Everything is CSS gradients and two inline SVGs. No images, no canvas.
 */
const IllustratedBackdrop: React.FC = () => (
  <div
    className="pointer-events-none fixed inset-0 select-none overflow-hidden"
    style={{ zIndex: -1 }}
    aria-hidden="true"
  >
    {/* Sky. Cerulean at the zenith dropping into cadmium haze — the horizon
        of a hot afternoon is always warmer and lighter than the top of the
        sky, and getting that one relationship right is most of the effect. */}
    <div
      className="absolute inset-0"
      style={{
        background:
          'linear-gradient(180deg, #3A6E93 0%, #5D9CC0 18%, #8FC0D6 38%, #CFE3EC 54%, #F0DDB4 66%, #F6D36A 74%, #F0E7D7 100%)',
      }}
    />

    {/* The sun, low and to the right, sitting in its own haze. */}
    <SunBurst className="absolute -right-[10vw] top-[22vh] h-[38vw] w-[38vw] opacity-90 lg:-right-[4vw] lg:h-[26vw] lg:w-[26vw]" />

    {/* The far headland. Distance reads as a single cool, light, flat mass —
        the moment you put detail or contrast in here it walks forward. */}
    <div
      className="absolute inset-x-0"
      style={{
        top: '52vh',
        height: '9vh',
        background:
          'linear-gradient(180deg, rgba(58,110,147,0) 0%, rgba(58,110,147,0.3) 34%, rgba(42,74,39,0.42) 100%)',
        clipPath:
          'polygon(0% 62%, 9% 44%, 17% 54%, 28% 30%, 38% 46%, 47% 36%, 58% 52%, 68% 40%, 79% 56%, 88% 46%, 100% 60%, 100% 100%, 0% 100%)',
      }}
    />

    {/* The sea. Deeper and colder than the last design's, because everything
        in front of it has to sit on top of it. */}
    <div
      className="absolute inset-x-0"
      style={{
        top: '60vh',
        height: '18vh',
        background:
          'linear-gradient(180deg, rgba(47,154,160,0) 0%, rgba(47,154,160,0.92) 9%, #1E8E96 36%, #14707A 68%, #0E5C66 100%)',
      }}
    />

    {/* The light lying on the water under the sun. One long horizontal smear
        of thick pale paint — which is all a sun track ever is. */}
    <div
      className="absolute right-[6%] h-[16vh] w-[46vw]"
      style={{
        top: '60vh',
        background:
          'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(251,246,236,0.7) 0%, rgba(246,211,106,0.34) 34%, transparent 72%)',
      }}
    />

    {/* Wet sand at the tideline, catching the sky. */}
    <div
      className="absolute inset-x-0"
      style={{
        top: '78vh',
        height: '7vh',
        background:
          'linear-gradient(180deg, rgba(185,168,130,0) 0%, rgba(185,168,130,0.9) 14%, #D2BF9E 46%, #C4A87C 100%)',
      }}
    />

    {/* THE ROAD. The reason this company exists, and the bottom edge of every
        page on the site: warm asphalt going into shadow, with the dusty verge
        where it meets the sand. */}
    <div
      className="absolute inset-x-0 bottom-0"
      style={{
        top: '85vh',
        background:
          'linear-gradient(180deg, rgba(138,106,74,0) 0%, rgba(138,106,74,0.92) 10%, #6B4626 34%, #4A3220 72%, #3E2A1A 100%)',
      }}
    />

    {/* Light lying along the crown of the road, running back to the vanishing
        point. Not dashes: at this distance a painter does not render road
        markings, they put down one smear of warm light where the surface
        turns up to the sky and let it read. Drawing the dashes individually
        gave a ladder, which is exactly what "blocked in, not drawn" is meant
        to prevent. */}
    <div
      className="absolute bottom-0 left-1/2 h-[15vh] w-[52vw] -translate-x-1/2"
      style={{
        background:
          'radial-gradient(ellipse 38% 96% at 50% 100%, rgba(246,211,106,0.3) 0%, rgba(176,122,60,0.16) 42%, transparent 76%)',
      }}
    />

    {/* Palms leaning in from the corners, as dark silhouette masses. Against a
        hot sky a palm is not green — it is nearly black, and that contrast is
        what makes the light behind it read as strong. */}
    <div
      className="absolute -left-40 h-96 w-96 opacity-40 sm:h-[30rem] sm:w-[30rem]"
      style={{ bottom: '-6vh', transform: 'rotate(28deg)' }}
    >
      <PalmFrond color="dark" className="h-full w-full" />
    </div>
    <div
      className="absolute -right-44 hidden h-96 w-96 opacity-35 lg:block"
      style={{ bottom: '-10vh', transform: 'rotate(-34deg) scaleX(-1)' }}
    >
      <PalmFrond color="dark" className="h-full w-full" />
    </div>
  </div>
);

export default IllustratedBackdrop;
