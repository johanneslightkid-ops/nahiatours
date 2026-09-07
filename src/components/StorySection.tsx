import React, { useEffect, useState, useRef } from 'react';
import { FoamLine, Caustics } from './ui/Illustrations';

interface StorySectionProps {
  id: string;
  title: string;
  emoji: string;
  timeframe?: string;
  description: string;
  narrative: string;
  imageUrl?: string;
  vimeoUrl?: string;
  mood?: string;
  isAlternate?: boolean;
  themeName?: string;
}

const StorySection: React.FC<StorySectionProps> = ({
  id,
  title,
  emoji,
  timeframe,
  description,
  narrative,
  imageUrl,
  vimeoUrl,
  mood,
  isAlternate = false,
  themeName,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const isTikTok = vimeoUrl?.includes('tiktok.com');
  const tiktokVideoId = isTikTok ? vimeoUrl?.match(/video\/(\d+)/)?.[1] || vimeoUrl?.split('/').pop()?.split('?')[0] : '';

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = () => setIsMobile(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener?.('change', handleChange);

    if (isTikTok && isInView && !document.getElementById('tiktok-embed-script')) {
      const script = document.createElement('script');
      script.id = 'tiktok-embed-script';
      script.src = 'https://www.tiktok.com/embed.js';
      script.async = true;
      document.body.appendChild(script);
    }

    return () => mediaQuery.removeEventListener?.('change', handleChange);
  }, [isTikTok, isInView]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          setHasLoaded(true);
        } else {
          setIsInView(false);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Attempt to pause/resume the video natively via postMessage when scrolling in/out of view
    if (!hasLoaded || !sectionRef.current) return;

    // The iframe might be native (Vimeo) or injected by TikTok embed.js
    const iframe = sectionRef.current.querySelector('iframe');
    if (!iframe || !iframe.contentWindow) return;

    try {
      if (isInView) {
        if (isTikTok) {
          iframe.contentWindow.postMessage({ 'x-tiktok-player': true, type: 'play' }, '*');
        } else {
          iframe.contentWindow.postMessage(JSON.stringify({ method: 'play' }), '*');
        }
      } else {
        if (isTikTok) {
          iframe.contentWindow.postMessage({ 'x-tiktok-player': true, type: 'pause' }, '*');
        } else {
          iframe.contentWindow.postMessage(JSON.stringify({ method: 'pause' }), '*');
        }
      }
    } catch (e) {
      // Ignore cross-origin errors if any
    }
  }, [isInView, hasLoaded, isTikTok]);

  const getVimeoAutoplayUrl = (url: string) => {
    if (!url) return '';
    if (isTikTok) return url; // TikTok handles its own URLs
    
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('autoplay', '1');
      urlObj.searchParams.set('loop', '1');
      urlObj.searchParams.set('muted', '1');
      urlObj.searchParams.set('background', '1'); // specific to vimeo to remove UI
      return urlObj.toString();
    } catch (e) {
      // If it's not a valid URL yet or missing protocol, just return original
      return url;
    }
  };

  const media = imageUrl ? (
    <img
      src={imageUrl}
      alt={title || 'Story image'}
      className="photo-pop h-full w-full object-cover"
    />
  ) : isTikTok ? (
    hasLoaded ? (
      <div className="flex h-full w-full items-center justify-center overflow-hidden">
        <blockquote
          className="tiktok-embed"
          cite={vimeoUrl}
          data-video-id={tiktokVideoId}
          style={{ maxWidth: '605px', minWidth: '325px', margin: '0 auto' }}
        >
          <section></section>
        </blockquote>
      </div>
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-paper-warm font-bold text-ink-light">
        Loading…
      </div>
    )
  ) : vimeoUrl ? (
    <iframe
      src={isInView ? getVimeoAutoplayUrl(vimeoUrl) : vimeoUrl}
      className="h-full w-full"
      frameBorder="0"
      allowFullScreen
    />
  ) : null;

  const hasMedia = Boolean(imageUrl || vimeoUrl);

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`home-section wavy-band relative overflow-hidden py-20 sm:py-24 lg:py-28 ${
        themeName ? themeName : isAlternate ? 'cove-section' : 'shore-section'
      }`}
    >
      <div
        className={`parallax-wash ${isAlternate ? 'parallax-wash-left' : 'parallax-wash-right'}`}
      />

      <div className="section-shell relative z-10">
        {/* The story is told in two columns: the picture and, beside it, the
            whole of the copy — heading included. Floating the heading across
            the full width left it stranded a long way from the words it
            belonged to. */}
        <div
          className={`grid items-center gap-10 lg:gap-16 ${
            hasMedia ? 'lg:grid-cols-12' : 'lg:grid-cols-1'
          }`}
        >
          {/* Picture */}
          {hasMedia && (
            <div
              className={`group relative lg:col-span-6 ${isAlternate ? 'lg:order-2' : 'lg:order-1'}`}
            >
              <div className="photo-frame animate-wave-sway-1 relative aspect-[4/3] sm:aspect-[3/2] lg:aspect-[4/3]">
                {media}
                <Caustics soft className="z-10" />
              </div>

              {/* The timeframe rides the corner of the picture, the way a
                  caption is written on the border of a print. */}
              {timeframe && (
                <span className="absolute -bottom-4 left-5 z-20 inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-lagoon-dark shadow-lg">
                  {timeframe}
                </span>
              )}
            </div>
          )}

          {/* Words */}
          <div
            className={`${hasMedia ? 'lg:col-span-6' : ''} ${
              isAlternate ? 'lg:order-1' : 'lg:order-2'
            }`}
          >
            {emoji && <div className="section-icon mb-6">{emoji}</div>}

            {title && (
              <h2 className="scribble-title-bg mb-6 font-display text-3xl leading-[1.08] text-ink sm:text-4xl lg:text-5xl">
                {title}
              </h2>
            )}

            {description && (
              <p className="mb-6 whitespace-pre-wrap text-lg leading-[1.75] text-ink-soft">
                {description}
              </p>
            )}

            {narrative && (
              <div className="story-copy-card mb-7">
                <p className="text-base italic leading-[1.8] text-ink-soft sm:text-lg">
                  {narrative}
                </p>
              </div>
            )}

            {mood && (
              <div className="flex flex-wrap gap-2.5">
                {mood
                  .split(', ')
                  .filter(Boolean)
                  .map((m, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-bold shadow-sm transition-transform duration-300 hover:-translate-y-0.5 ${
                        [
                          'bg-lagoon-light/70 text-lagoon-dark',
                          'bg-sunset-light/60 text-[#8a5a00]',
                          'bg-jungle-light/60 text-jungle-dark',
                          'bg-mango-light/45 text-mango-dark',
                        ][idx % 4]
                      }`}
                    >
                      {m}
                    </span>
                  ))}
              </div>
            )}

            {/* A second piece of media (video alongside a photo) sits under
                the copy rather than competing with the hero picture. */}
            {vimeoUrl && imageUrl && (
              <div className="animate-wave-sway-3 mt-8">
                {isTikTok ? (
                  hasLoaded ? (
                    <div className="photo-frame w-full">
                      <blockquote
                        className="tiktok-embed"
                        cite={vimeoUrl}
                        data-video-id={tiktokVideoId}
                        style={{ maxWidth: '605px', minWidth: '325px', margin: '0 auto' }}
                      >
                        <section></section>
                      </blockquote>
                    </div>
                  ) : (
                    <div className="photo-frame flex aspect-video w-full items-center justify-center bg-paper-warm font-bold text-ink-light">
                      Loading…
                    </div>
                  )
                ) : (
                  <div className="photo-frame aspect-video w-full">
                    <iframe
                      src={isInView ? getVimeoAutoplayUrl(vimeoUrl) : vimeoUrl}
                      className="h-full w-full"
                      frameBorder="0"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* A line of foam closing the section off. */}
      <div className="pointer-events-none absolute bottom-0 left-0 flex w-full justify-center pb-8 opacity-40">
        <FoamLine className="h-6 w-32" />
      </div>
    </section>
  );
};

export default StorySection;
