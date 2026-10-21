import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { isYouTubeShort, youtubeId, youtubeThumb } from '../../lib/youtube';
import { loadYouTubeApi, YouTubePlayer, YT_STATE } from './inspire/youtubeApi';

/**
 * A YouTube video as a background: muted, looping, filling the box like
 * `object-fit: cover`, with no controls and nothing to click.
 *
 * A `<video>` cannot play a YouTube address — that is why one pasted as a
 * hero background used to leave it blank. YouTube only plays in its own
 * player, so this embeds that player (through YouTube's IFrame Player API)
 * and sizes it to cover the box, since a frame cannot be told to crop itself.
 *
 * The video's own still is shown first and stays underneath: the player is
 * revealed only once it is really playing (which also keeps YouTube's title,
 * shown as a video starts, out of sight), and wherever it cannot play — saved
 * data, a refused autoplay, a blocked YouTube — the still is what remains.
 * Out of view (another slide on screen) the video is paused.
 */
const YouTubeBackground: React.FC<{
  url: string;
  /** This slide is the one on screen. */
  active: boolean;
  /** Whether the player may load at all (see useDeferredVideo). */
  enabled: boolean;
  /** The video cannot play here: private, deleted, or its owner forbids embedding. */
  onUnavailable?: () => void;
  className?: string;
}> = ({ url, active, enabled, onUnavailable, className = '' }) => {
  const id = youtubeId(url);
  const upright = isYouTubeShort(url);
  const box = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement | null>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [poster, setPoster] = useState(() => (id ? youtubeThumb(id) : ''));
  const [playing, setPlaying] = useState(false);
  // Loaded the first time it is shown, then kept: reloading YouTube on every slide would cost more.
  const [mounted, setMounted] = useState(false);
  const activeRef = useRef(active);
  activeRef.current = active;
  const unavailable = useRef(onUnavailable);
  unavailable.current = onUnavailable;

  useEffect(() => {
    if (enabled && active) setMounted(true);
  }, [enabled, active]);

  // Cover the box: as wide as it, or as tall, whichever leaves no bars; a touch more to hide the frame's edge.
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return undefined;
    const ratio = upright ? 9 / 16 : 16 / 9;
    const fit = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      const cover = width / height > ratio ? { width, height: width / ratio } : { width: height * ratio, height };
      setSize({ width: Math.ceil(cover.width * 1.06), height: Math.ceil(cover.height * 1.06) });
    };
    fit();
    window.addEventListener('resize', fit);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    observer?.observe(element);
    return () => {
      window.removeEventListener('resize', fit);
      observer?.disconnect();
    };
  }, [upright]);

  useEffect(() => {
    if (!mounted || !id) return undefined;
    let cancelled = false;
    let reveal = 0;
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !host.current) return;
        const target = document.createElement('div');
        host.current.appendChild(target);
        player.current = new YT.Player(target, {
          host: 'https://www.youtube-nocookie.com',
          videoId: id,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            mute: 1,
            loop: 1,
            playlist: id,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            iv_load_policy: 3,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              const frame = event.target.getIframe();
              frame.tabIndex = -1;
              frame.setAttribute('aria-hidden', 'true');
              event.target.mute();
              if (activeRef.current) event.target.playVideo();
            },
            onStateChange: (event) => {
              if (event.data === YT_STATE.PLAYING) {
                window.clearTimeout(reveal);
                reveal = window.setTimeout(() => setPlaying(true), 900);
              } else if (event.data === YT_STATE.ENDED) {
                // The loop, in case the player does not loop a single video itself.
                event.target.seekTo(0, true);
                event.target.playVideo();
              }
            },
            // 2 bad id, 100 private or deleted, 101/150 its owner forbids embedding.
            onError: () => unavailable.current?.(),
          },
        });
      })
      .catch(() => undefined); // YouTube unreachable: the still stays.
    return () => {
      cancelled = true;
      window.clearTimeout(reveal);
      try {
        player.current?.destroy();
      } catch {
        /* already gone */
      }
      player.current = null;
    };
  }, [mounted, id]);

  // Only the slide on screen plays.
  useEffect(() => {
    try {
      if (active) player.current?.playVideo();
      else player.current?.pauseVideo();
    } catch {
      /* not ready yet: onReady starts it if it is on screen */
    }
  }, [active]);

  if (!id) return null;

  return (
    <div ref={box} className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <img
        src={poster}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        // No maxresdefault for some videos: YouTube's 120 px placeholder, or an error.
        onLoad={(event) => {
          if (event.currentTarget.naturalWidth > 120 || !id) return;
          // YouTube's 120 px "no picture": try the medium still; none there either means no video.
          if (poster.endsWith('maxresdefault.jpg')) setPoster(youtubeThumb(id, 'hqdefault'));
          else unavailable.current?.();
        }}
        onError={() => {
          if (id && poster.endsWith('maxresdefault.jpg')) setPoster(youtubeThumb(id, 'hqdefault'));
          else unavailable.current?.();
        }}
        decoding="async"
      />
      {mounted && (
        <div
          ref={(element) => {
            host.current = element;
            element?.setAttribute('inert', '');
          }}
          className={`pointer-events-none absolute left-1/2 top-1/2 transition-opacity duration-1000 [&>iframe]:h-full [&>iframe]:w-full ${playing ? 'opacity-100' : 'opacity-0'}`}
          style={{ width: size.width || '100%', height: size.height || '100%', transform: 'translate(-50%, -50%)' }}
        />
      )}
    </div>
  );
};

export default YouTubeBackground;
