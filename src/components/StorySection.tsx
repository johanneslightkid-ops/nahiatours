import React, { useEffect, useState, useRef } from 'react';
import { FoamLine } from './ui/Illustrations';

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
          {emoji && <div className={`section-icon mb-5 ${isAlternate ? 'md:ml-auto md:mr-0' : 'md:mr-auto md:ml-0'}`}>{emoji}</div>}
          {title && <h2 className="scribble-title-bg mb-6 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl md:text-5xl">{title}</h2>}
          {timeframe && (
            <p className="inline-block rounded-full border-2 border-ink bg-mango-light px-4 py-1 text-sm font-extrabold uppercase tracking-wider text-ink shadow-ink-sm">
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
              <div className="story-copy-card mb-6 rounded-[30px_16px_30px_18px] animate-wave-sway-2">
                <p className="whitespace-pre-wrap text-base font-semibold leading-8 text-ink sm:text-lg">
                  {description}
                </p>
              </div>
            )}

            {/* Narrative */}
            {narrative && (
              <div className="prose prose-lg max-w-none">
                <p className="text-base font-semibold italic leading-8 text-ink-soft md:text-lg">
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
                    className={`rounded-full border-[2.5px] border-ink px-4 py-1.5 text-sm font-extrabold text-ink shadow-ink-sm transition-transform hover:-translate-y-1 hover:rotate-2 ${
                      ['bg-mango-light', 'bg-lagoon-light', 'bg-hibiscus-light', 'bg-jungle-light'][idx % 4]
                    }`}
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
                    <div className="relative w-full aspect-video rounded-[28px_14px_30px_16px] flex items-center justify-center border-[2.5px] border-ink bg-paper-warm font-bold text-ink-soft">Loading TikTok...</div>
                  )
                ) : (
                  <iframe
                    src={isInView ? getVimeoAutoplayUrl(vimeoUrl) : vimeoUrl}
                    className="relative w-full aspect-video rounded-[28px_14px_30px_16px] shadow-2xl"
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
              <div className={`story-media-frame group mb-10 md:mb-0 ${id === 'afternoon_post' ? 'mt-12 md:mt-0' : ''} animate-wave-sway-1`}>
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={title || 'Story image'}
                    className="mt-6 relative h-[22rem] w-full rounded-[32px_14px_36px_20px] object-cover shadow-[0_25px_60px_rgba(4,19,29,0.3)] transition-transform duration-700 group-hover:scale-105 sm:h-96 md:h-[520px]"
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
                     <div className="mt-6 relative h-[22rem] w-full rounded-[32px_14px_36px_20px] flex items-center justify-center border-[2.5px] border-ink bg-paper-warm font-bold text-ink-soft sm:h-96 md:h-[520px]">Loading TikTok...</div>
                  )
                ) : (
                  <iframe
                    src={isInView ? getVimeoAutoplayUrl(vimeoUrl) : vimeoUrl}
                    className="mt-6 relative h-[22rem] w-full rounded-[32px_14px_36px_20px] shadow-[0_25px_60px_rgba(4,19,29,0.3)] transition-transform duration-500 sm:h-96 md:h-[520px]"
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
      <div className="pointer-events-none absolute bottom-0 left-0 flex w-full justify-center pb-10 opacity-30">
        <FoamLine className="h-6 w-32" />
      </div>
    </section>
  );
};

export default StorySection;
