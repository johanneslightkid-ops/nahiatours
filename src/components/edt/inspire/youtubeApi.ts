/**
 * YouTube's IFrame Player API, loaded once, when the TV player first needs it
 * (https://developers.google.com/youtube/iframe_api_reference). Only what the
 * show uses is typed.
 */
export interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setVolume(volume: number): void;
  getVolume(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  loadVideoById(id: string): void;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
}

export interface YouTubeEvent<T = undefined> {
  target: YouTubePlayer;
  data: T;
}

export interface YouTubeNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      host?: string;
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: YouTubeEvent) => void;
        onStateChange?: (event: YouTubeEvent<number>) => void;
        onError?: (event: YouTubeEvent<number>) => void;
      };
    }
  ) => YouTubePlayer;
}

/** onStateChange values. */
export const YT_STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const;

type WindowWithYouTube = Window & { YT?: YouTubeNamespace & { loaded?: number }; onYouTubeIframeAPIReady?: () => void };

let loading: Promise<YouTubeNamespace> | null = null;

export const loadYouTubeApi = (): Promise<YouTubeNamespace> => {
  const win = window as WindowWithYouTube;
  if (win.YT?.Player) return Promise.resolve(win.YT);
  if (loading) return loading;
  loading = new Promise<YouTubeNamespace>((resolve, reject) => {
    const fail = (reason: string) => {
      loading = null;
      reject(new Error(reason));
    };
    const timer = window.setTimeout(() => fail('The YouTube player did not load.'), 12000);
    const previous = win.onYouTubeIframeAPIReady;
    win.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timer);
      previous?.();
      if (win.YT?.Player) resolve(win.YT);
      else fail('The YouTube player did not load.');
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timer);
      fail('The YouTube player is blocked here.');
    };
    document.head.appendChild(script);
  });
  return loading;
};
