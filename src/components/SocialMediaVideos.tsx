import React, { useState, useEffect } from 'react';
import { getSocialMediaData, SocialMediaVideo } from '../services/socialMediaService';
import { FaInstagram, FaTiktok, FaFacebook, FaYoutube, FaTwitter, FaPlay } from 'react-icons/fa';

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <FaInstagram className="w-6 h-6" />,
  tiktok: <FaTiktok className="w-6 h-6" />,
  facebook: <FaFacebook className="w-6 h-6" />,
  youtube: <FaYoutube className="w-6 h-6" />,
  twitter: <FaTwitter className="w-6 h-6" />
};

const platformColors: Record<string, { bg: string; text: string; gradient: string }> = {
  instagram: {
    bg: 'bg-hibiscus',
    text: 'text-pink-600',
    gradient: 'bg-hibiscus'
  },
  tiktok: {
    bg: 'bg-ink',
    text: 'text-black',
    gradient: 'bg-lagoon'
  },
  facebook: {
    bg: 'bg-sky-dark',
    text: 'text-blue-600',
    gradient: 'bg-lagoon'
  },
  youtube: {
    bg: 'bg-sunset',
    text: 'text-hibiscus-dark',
    gradient: 'bg-lagoon'
  },
  twitter: {
    bg: 'bg-sky',
    text: 'text-blue-400',
    gradient: 'bg-lagoon'
  }
};

interface SocialMediaVideosProps {
  showIf?: boolean;
}

const SocialMediaVideos: React.FC<SocialMediaVideosProps> = ({ showIf = true }) => {
  const [videos, setVideos] = useState<SocialMediaVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [videosByPlatform, setVideosByPlatform] = useState<Record<string, SocialMediaVideo[]>>({});

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const data = await getSocialMediaData();
        if (data.videos && data.videos.length > 0) {
          setVideos(data.videos);
          // Group videos by platform
          const grouped: Record<string, SocialMediaVideo[]> = {};
          data.videos.forEach((video: SocialMediaVideo) => {
            if (!grouped[video.platform]) {
              grouped[video.platform] = [];
            }
            grouped[video.platform].push(video);
          });
          setVideosByPlatform(grouped);
        }
      } catch (error) {
        console.error('Error loading social media videos:', error);
      } finally {
        setLoading(false);
      }
    };
    loadVideos();
  }, []);

  // Don't show if no videos or showIf is false
  if (!showIf || loading || videos.length === 0) {
    return null;
  }

  const platforms = Object.keys(videosByPlatform);

  return (
    <section className="wavy-band-top py-28 px-4 md:px-8 bg-paper-warm relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="parallax-wash parallax-wash-left" />
        <div className="parallax-wash parallax-wash-right" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-ink mb-4">
            Follow Our Adventures
          </h2>
          <p className="text-xl text-ink-soft max-w-2xl mx-auto">
            Watch exclusive behind-the-scenes content and adventure highlights from across our social media
          </p>
        </div>

        {/* Videos by platform */}
        <div className="space-y-16">
          {platforms.map((platform) => (
            <div key={platform} className="space-y-6">
              {/* Platform header */}
              <div className={`inline-flex items-center gap-3 rounded-full ring-1 ring-ink/10 px-6 py-3 text-white shadow-md ${platformColors[platform].gradient}`}>
                {platformIcons[platform]}
                <span className="font-bold text-lg capitalize">{platform}</span>
              </div>

              {/* Videos grid for this platform */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videosByPlatform[platform].map((video, idx) => (
                  <div
                    key={video.id}
                    className="group relative rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all hover:-translate-y-2 ring-1 ring-ink/10 flex flex-col h-full bg-white"
                  >
                    {/* Video thumbnail/preview */}
                    <div className={`relative flex h-64 items-center justify-center overflow-hidden border-b border-white/20 ${platformColors[platform].gradient}`}>
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all" />
                      <FaPlay className="text-6xl text-paper/85 group-hover:text-white transition-all transform group-hover:scale-125" />

                      {/* Video info overlay */}
                      <div className="absolute inset-0 flex flex-col justify-end bg-ink/60 p-4 opacity-0 transition-opacity group-hover:opacity-100">
                        <p className="text-white text-sm font-semibold">{video.title}</p>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col p-5 bg-white space-y-4">
                      <div className="space-y-3">
                        <h3 className="font-bold text-ink line-clamp-2">{video.title}</h3>
                        <p className="text-sm text-ink-soft line-clamp-2">{video.description}</p>
                        <p className="text-xs text-ink-light">{video.createdAt}</p>
                      </div>

                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto inline-flex w-full items-center justify-center rounded-full ring-1 ring-ink/10 bg-gradient-to-br from-mango-light via-mango to-mango-dark px-4 py-3 text-center font-extrabold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-mango-light"
                      >
                        Watch on {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* View all CTA */}
        <div className="mt-16 text-center">
          <p className="text-ink-soft mb-6">
            Like what you see? Follow us on social media for daily adventure content!
          </p>
          <div className="flex justify-center gap-4">
            {platforms.map((platform) => {
              const url = platforms
                .filter((p) => p === platform)
                .map((p) => {
                  // You can customize these URLs based on your social media accounts
                  const baseUrls: Record<string, string> = {
                    instagram: 'https://instagram.com',
                    tiktok: 'https://tiktok.com',
                    facebook: 'https://facebook.com',
                    youtube: 'https://youtube.com',
                    twitter: 'https://twitter.com'
                  };
                  return baseUrls[p] || '#';
                })[0];

              return (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 rounded-full ring-1 ring-ink/10 px-6 py-3 font-extrabold text-white shadow-md transition hover:-translate-y-0.5 ${platformColors[platform].gradient}`}
                >
                  {platformIcons[platform]}
                  <span className="capitalize hidden sm:inline">{platform}</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialMediaVideos;
