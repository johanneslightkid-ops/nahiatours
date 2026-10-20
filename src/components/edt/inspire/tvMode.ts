import { useEffect, useState } from 'react';
import type { TvPlayerMode } from '../../../edt/inspireConfig';

/**
 * Should this screen get the TV player?
 *
 * Not "is this a TV" — the shop's screen may be an LG, a Samsung, an Android
 * or Google TV, a Hisense, TCL, Xiaomi or other brand with a browser of its
 * own, and many of them do not say what they are. So the question is turned
 * round: every device that is plainly a computer, a phone or a tablet keeps
 * YouTube's own player; anything else gets the TV player, which works on a
 * computer too. On top of that:
 *
 *  • TV names in the browser's identity settle it at once;
 *  • a key only a TV remote has (LG's or Samsung's Back, the coloured keys),
 *    or Back pressed while the remote was caught inside YouTube's player,
 *    marks this device as a TV from then on;
 *  • `?tv=1`, `?tv=0`, `?tv=auto` in the address tell one device for good;
 *  • and Admin → Inspire can set it for every screen.
 */
const TV_NAMES =
  /\b(SMART-?TV|SmartTV|Smart TV|Web0S|webOS|NetCast|LG Browser|LGE|Tizen|HbbTV|CE-HTML|BRAVIA|GoogleTV|Google TV|Android ?TV|CrKey|Chromecast|SHIELD|MiBOX|MiTV|Mi TV|Large Screen|Opera TV|OMI|Espial|VIDAA|Hisense|HiSmart|TCL|Skyworth|Coocaa|Konka|Haier|Changhong|Zeasn|WhaleTV|Titan ?OS|Vestel|Foxxum|PhilipsTV|NETTV|Viera|AQUOS|Toshiba|Roku|AppleTV|tvOS|DTV|STB)\b/i;
/** Fire TV models are AFT-something, in capitals. */
const FIRE_TV = /\bAFT[A-Z0-9]{1,6}\b/;

const media = (query: string) => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches);

/** Plainly a computer, a phone or a tablet: the only devices that keep YouTube's own player by default. */
const plainlyNotATv = (agent: string): boolean => {
  if (navigator.maxTouchPoints > 0) return true; // phones, tablets, touch laptops
  const hasMouse = media('(hover: hover)') && media('(pointer: fine)');
  if (!hasMouse) return false; // no mouse and no touch: a remote
  return /Windows NT|Macintosh|Mac OS X|CrOS/.test(agent) || (/Linux/.test(agent) && /x86_64|i686|amd64/i.test(agent) && !/Android/.test(agent));
};

export const looksLikeTv = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const agent = navigator.userAgent || '';
  if (TV_NAMES.test(agent) || FIRE_TV.test(agent)) return true;
  return !plainlyNotATv(agent);
};

const OVERRIDE_KEY = 'inspire_tv';
const LEARNED_KEY = 'inspire_tv_learned';
const CHANGED = 'inspire-tv-changed';

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** What this one device was told with `?tv=1`, `?tv=0` or `?tv=auto`. */
const deviceOverride = (): boolean | null => {
  try {
    const asked = new URLSearchParams(window.location.search).get('tv');
    if (asked === '1' || asked === '0') localStorage.setItem(OVERRIDE_KEY, asked);
    else if (asked === 'auto') {
      localStorage.removeItem(OVERRIDE_KEY);
      localStorage.removeItem(LEARNED_KEY);
    }
  } catch {
    /* nothing to remember it in */
  }
  const stored = read(OVERRIDE_KEY);
  return stored === '1' ? true : stored === '0' ? false : null;
};

/** The device showed it is a TV: remember it, and switch the open show over. */
export const learnTv = () => {
  try {
    if (localStorage.getItem(LEARNED_KEY) === '1') return;
    localStorage.setItem(LEARNED_KEY, '1');
  } catch {
    /* remembered for this visit only */
  }
  learnedThisVisit = true;
  window.dispatchEvent(new Event(CHANGED));
};

let learnedThisVisit = false;

/** Keys only a TV remote sends: webOS Back 461, Tizen Back/Exit 10009/10182, the coloured keys 403–406. */
const REMOTE_ONLY = new Set([461, 10009, 10182, 403, 404, 405, 406]);
const REMOTE_KEYS = new Set(['GoBack', 'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue']);

const decide = (mode: TvPlayerMode): boolean => {
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  const told = deviceOverride();
  if (told !== null) return told;
  if (learnedThisVisit || read(LEARNED_KEY) === '1') return true;
  return looksLikeTv();
};

/** Whether the show plays its videos in the TV player; changes the moment the device gives itself away. */
export const useTvPlayer = (mode: TvPlayerMode): boolean => {
  const [tv, setTv] = useState(() => decide(mode));
  useEffect(() => {
    setTv(decide(mode));
    const update = () => setTv(decide(mode));
    const onKey = (event: KeyboardEvent) => {
      if (REMOTE_ONLY.has(event.keyCode) || REMOTE_KEYS.has(event.key)) learnTv();
    };
    window.addEventListener(CHANGED, update);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener(CHANGED, update);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [mode]);
  return tv;
};
