import React, { useEffect, useState, useRef } from 'react';
import { FoamLine, Crosshair, Barcode } from './ui/Illustrations';

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

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`home-section wavy-band relative overflow-hidden px-4 py-28 sm:py-32 md:px-8 lg:py-36 ${
        themeName ? themeName : isAlternate ? 'cove-section' : 'shore-section'
      }`}
    >
      <div
        className={`parallax-wash ${isAlternate ? 'parallax-wash-left' : 'parallax-wash-right'}`}
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header with emoji and title */}
        <div className={`mb-10 text-center sm:mb-12 ${isAlternate ? 'md:text-right' : 'md:text-left'}`}>
          {emoji && (
            <div className={`section-icon mb-5 ${isAlternate ? 'md:ml-auto md:mr-0' : 'md:mr-auto md:ml-0'}`}>
              <span>{emoji}</span>
            </div>
          )}
          {title && <h2 className="scribble-title-bg mb-6 font-display text-3xl leading-tight text-ink sm:text-4xl md:text-5xl">{title}</h2>}
          {timeframe && (
            <p className="artsy-brick-badge">
              {timeframe}
            </p>
          )}
        </div>

        {/* Main content grid */}
        <div className={`grid items-center gap-12 ${imageUrl || vimeoUrl ? 'md:grid-cols-2 lg:gap-20' : 'md:grid-cols-1'}`}>
          {/* Text content */}
          <div className={(imageUrl || vimeoUrl) && isAlternate ? 'md:order-2' : 'md:order-1'}>
            {/* Description */}
            {description && (
              <div className="story-copy-card mb-6 animate-wave-sway-2">
                <p className="whitespace-pre-wrap text-base font-medium leading-8 text-ink sm:text-lg">
                  {description}
                </p>
                <div className="mt-5 flex items-center gap-3 border-t-2 border-ink/15 pt-4">
                  <Barcode value={id} className="h-4 w-20 opacity-45" />
                  <span className="tp-filenum">Ch. {id.replace(/_/g, ' ')}</span>
                </div>
              </div>
            )}

            {/* Narrative */}
            {narrative && (
              <div className="prose prose-lg max-w-none">
                <p className="text-base font-medium italic leading-8 text-ink-soft md:text-lg">
                  {narrative}
                </p>
              </div>
            )}

            {/* Mood badge */}
            {mood && (
              <div className="mt-8 flex flex-wrap gap-2.5">
                {mood.split(', ').filter(Boolean).map((m, idx) => (
                  <span
                    key={idx}
                    className={`border-2 px-4 py-1.5 font-condensed text-xs uppercase tracking-[0.14em] shadow-ink-sm transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 ${
                      idx % 4 === 3
                        ? 'border-mango bg-mango text-paper'
                        : 'border-ink bg-paper text-ink'
                    }`}
                    style={{ transform: `rotate(${(idx % 3) - 1}deg)` }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            )}

            {/* Video (if we also have an image, video goes here below the text) */}
            {vimeoUrl && imageUrl && (
              <div className="mt-8 story-media-frame flex justify-center w-full animate-wave-sway-3">
                {isTikTok ? (
                  hasLoaded ? (
                    <div className="relative z-10 w-full overflow-hidden rounded-[28px_14px_30px_16px]">
                      <blockquote
                        className="tiktok-embed"
                        cite={vimeoUrl}
                        data-video-id={tiktokVideoId}
                        style={{ maxWidth: "605px", minWidth: "325px", margin: "0 auto" }}
                      >
                        <section></section>
                      </blockquote>
                    </div>
                  ) : (
                    <div className="tp-filenum flex aspect-video w-full items-center justify-center border-[3px] border-ink bg-paper-warm">Loading TikTok…</div>
                  )
                ) : (
                  <iframe
                    src={isInView ? getVimeoAutoplayUrl(vimeoUrl) : vimeoUrl}
                    className="relative aspect-video w-full border-[3px] border-ink shadow-ink-lg"
                    frameBorder="0"
                    allowFullScreen
                  />
                )}
              </div>
            )}
          </div>

          {/* Media Column (Image or Video if no image) */}
          {(imageUrl || (!imageUrl && vimeoUrl)) && (
            <div className={`${isAlternate ? 'md:order-1' : 'md:order-2'} ${id === 'decision' ? 'md:mt-12' : ''}`}>
              <div className={`story-media-frame group relative mb-10 md:mb-0 ${id === 'afternoon_post' ? 'mt-12 md:mt-0' : ''} animate-wave-sway-1`}>
                <Crosshair className="pointer-events-none absolute -right-3 top-3 z-20 h-7 w-7" />
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={title || 'Story image'}
                    className="photo-pop relative mt-6 h-[22rem] w-full border-[3px] border-ink object-cover shadow-ink-lg transition-transform duration-700 group-hover:scale-[1.02] sm:h-96 md:h-[520px]"
                  />
                ) : isTikTok ? (
                  hasLoaded ? (
                    <div className="relative mt-6 z-10 flex justify-center w-full overflow-hidden rounded-[32px_14px_36px_20px]">
                      <blockquote
                        className="tiktok-embed"
                        cite={vimeoUrl}
                        data-video-id={tiktokVideoId}
                        style={{ maxWidth: "605px", minWidth: "325px", margin: "0 auto" }}
                      >
                        <section></section>
                      </blockquote>
                    </div>
                  ) : (
                     <div className="tp-filenum relative mt-6 flex h-[22rem] w-full items-center justify-center border-[3px] border-ink bg-paper-warm sm:h-96 md:h-[520px]">Loading TikTok…</div>
                  )
                ) : (
                  <iframe
                    src={isInView ? getVimeoAutoplayUrl(vimeoUrl) : vimeoUrl}
                    className="relative mt-6 h-[22rem] w-full border-[3px] border-ink shadow-ink-lg transition-transform duration-500 sm:h-96 md:h-[520px]"
                    frameBorder="0"
                    allowFullScreen
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Closing flourish */}
      <div className="pointer-events-none absolute bottom-0 left-0 flex w-full justify-center pb-10 opacity-60">
        <FoamLine className="h-4 w-40" />
      </div>
    </section>
  );
};

export default StorySection;
