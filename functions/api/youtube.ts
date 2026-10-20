/**
 * /api/youtube — videos about one tour, for the in-store "Inspire me" show.
 *
 *   GET  ?q=<tour words>&channel=<@handle | URL | UC…id>&shorts=1&max=12
 *        → { videos: Video[], source: 'api' | 'pages' }
 *   GET  ?status=1            → { hasKey }
 *   PUT  { apiKey }  (admin)  → stores or clears the YouTube Data API key
 *
 * The order is the operator's brief: first the company's own channel — its
 * most-watched videos on that tour — then Shorts about it, then the most
 * popular videos about it from anybody.
 *
 * With a YouTube Data API key (an env var, or one saved from the admin) it
 * asks the API. Without one it reads YouTube's own public search and channel
 * pages, which carry the same results as JSON in the page; that path needs no
 * setup at all and is what a fresh site uses. Answers are cached for six
 * hours, so a TV looping the show all day costs a handful of lookups.
 *
 * The key is kept under `youtube-secret`, a protected KV entry the public data
 * endpoint refuses to serve.
 */

import { adminKv, verifyAdminRequest } from '../../shared/adminAuth';

export const YOUTUBE_SECRET_KEY = 'youtube-secret';

interface Env {
  YOUTUBE_API_KEY?: string;
  DATA_KV_F?: { get(key: string): Promise<string | null>; put(key: string, value: string): Promise<void>; delete(key: string): Promise<void> };
  DATA_KV?: Env['DATA_KV_F'];
  [key: string]: unknown;
}

export interface Video {
  id: string;
  title: string;
  channel: string;
  views: number;
  short: boolean;
  thumb: string;
  /** Why it is in the list: the company's own channel, a Short, or popular. */
  from: 'channel' | 'shorts' | 'popular';
}

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...extra } });

const viewsOf = (text: unknown): number => {
  const raw = String(text ?? '').toLowerCase().replace(/,/g, '');
  const match = /([\d.]+)\s*([kmb])?/.exec(raw);
  if (!match) return 0;
  const n = Number(match[1]);
  const scale = match[2] === 'k' ? 1e3 : match[2] === 'm' ? 1e6 : match[2] === 'b' ? 1e9 : 1;
  return Math.round(n * scale);
};

const secondsOf = (text: unknown): number => {
  const parts = String(text ?? '').split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return 0;
  return parts.reduce((total, n) => total * 60 + n, 0);
};

const thumbOf = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/** "@handle", a channel URL or a UC… id, as something the pages and the API both accept. */
const channelRef = (input: string): { handle?: string; id?: string } => {
  const value = input.trim();
  if (!value) return {};
  const id = /(UC[\w-]{20,})/.exec(value)?.[1];
  if (id) return { id };
  const handle = /@([\w.-]+)/.exec(value)?.[1] ?? (/^[\w.-]+$/.test(value) ? value : undefined);
  return handle ? { handle } : {};
};

// ── Without a key: YouTube's public pages ───────────────────────────────────

const PAGE_HEADERS = {
  'Accept-Language': 'en-US,en;q=0.9',
  // Skips the EU consent interstitial, which would otherwise be all we get.
  Cookie: 'CONSENT=YES+cb; SOCS=CAI',
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
};

const initialData = async (url: string): Promise<unknown> => {
  const response = await fetch(url, { headers: PAGE_HEADERS });
  if (!response.ok) return null;
  const html = await response.text();
  const start = html.indexOf('var ytInitialData = ');
  if (start < 0) return null;
  const from = start + 'var ytInitialData = '.length;
  const end = html.indexOf(';</script>', from);
  try {
    return JSON.parse(html.slice(from, end));
  } catch {
    return null;
  }
};

/** Every video the page describes, from its regular and its Shorts renderers. */
const collect = (node: unknown, out: Array<Omit<Video, 'from'>>, seen = new Set<string>()) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    node.forEach((item) => collect(item, out, seen));
    return out;
  }
  const record = node as Record<string, any>;
  const video = record.videoRenderer ?? record.gridVideoRenderer;
  if (video?.videoId && !seen.has(video.videoId)) {
    seen.add(video.videoId);
    const seconds = secondsOf(video.lengthText?.simpleText);
    out.push({
      id: video.videoId,
      title: video.title?.runs?.[0]?.text ?? video.title?.simpleText ?? '',
      channel: video.ownerText?.runs?.[0]?.text ?? video.shortBylineText?.runs?.[0]?.text ?? '',
      views: viewsOf(video.viewCountText?.simpleText ?? video.viewCountText?.runs?.map((r: any) => r.text).join('')),
      short: seconds > 0 && seconds <= 60,
      thumb: thumbOf(video.videoId),
    });
  }
  const reel = record.reelItemRenderer;
  if (reel?.videoId && !seen.has(reel.videoId)) {
    seen.add(reel.videoId);
    out.push({
      id: reel.videoId,
      title: reel.headline?.simpleText ?? '',
      channel: '',
      views: viewsOf(reel.viewCountText?.simpleText),
      short: true,
      thumb: thumbOf(reel.videoId),
    });
  }
  const lockup = record.shortsLockupViewModel;
  const lockupId = lockup?.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId;
  if (lockupId && !seen.has(lockupId)) {
    seen.add(lockupId);
    out.push({
      id: lockupId,
      title: lockup.overlayMetadata?.primaryText?.content ?? '',
      channel: '',
      views: viewsOf(lockup.overlayMetadata?.secondaryText?.content),
      short: true,
      thumb: thumbOf(lockupId),
    });
  }
  Object.values(record).forEach((value) => collect(value, out, seen));
  return out;
};

const fromPages = async (query: string, channel: string, shorts: boolean) => {
  const q = encodeURIComponent(query);
  const ref = channelRef(channel);
  const base = ref.handle ? `https://www.youtube.com/@${ref.handle}` : ref.id ? `https://www.youtube.com/channel/${ref.id}` : '';
  const [own, popular, short] = await Promise.all([
    base ? initialData(`${base}/search?query=${q}`).then((data) => collect(data, [])) : Promise.resolve([]),
    // sp=CAM%3D: sorted by view count.
    initialData(`https://www.youtube.com/results?search_query=${q}&sp=CAM%253D`).then((data) => collect(data, [])),
    shorts ? initialData(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${query} #shorts`)}`).then((data) => collect(data, [])) : Promise.resolve([]),
  ]);
  return { own, popular, short };
};

// ── With a key: the YouTube Data API ────────────────────────────────────────

const api = async (path: string, params: Record<string, string>, key: string) => {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  Object.entries({ ...params, key }).forEach(([name, value]) => url.searchParams.set(name, value));
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`YouTube API ${response.status}`);
  return (await response.json()) as any;
};

const isoSeconds = (iso: string) => {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso ?? '');
  return match ? Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0) : 0;
};

const fromApi = async (query: string, channel: string, shorts: boolean, key: string) => {
  const ref = channelRef(channel);
  let channelId = ref.id;
  if (!channelId && ref.handle) {
    const found = await api('channels', { part: 'id', forHandle: `@${ref.handle}` }, key).catch(() => null);
    channelId = found?.items?.[0]?.id;
  }
  const search = (extra: Record<string, string>) =>
    api('search', { part: 'snippet', type: 'video', maxResults: '15', q: query, order: 'viewCount', ...extra }, key)
      .then((data) => (data.items ?? []).map((item: any) => item.id?.videoId).filter(Boolean) as string[])
      .catch(() => [] as string[]);
  const [ownIds, popularIds, shortIds] = await Promise.all([
    channelId ? search({ channelId }) : Promise.resolve([]),
    search({}),
    shorts ? search({ videoDuration: 'short' }) : Promise.resolve([]),
  ]);
  const all = [...new Set([...ownIds, ...popularIds, ...shortIds])];
  const details = new Map<string, Omit<Video, 'from'>>();
  for (let i = 0; i < all.length; i += 50) {
    const data = await api('videos', { part: 'snippet,statistics,contentDetails', id: all.slice(i, i + 50).join(',') }, key);
    (data.items ?? []).forEach((item: any) => {
      const seconds = isoSeconds(item.contentDetails?.duration);
      details.set(item.id, {
        id: item.id,
        title: item.snippet?.title ?? '',
        channel: item.snippet?.channelTitle ?? '',
        views: Number(item.statistics?.viewCount ?? 0),
        short: seconds > 0 && seconds <= 180,
        thumb: item.snippet?.thumbnails?.high?.url ?? thumbOf(item.id),
      });
    });
  }
  const pick = (ids: string[]) => ids.map((id) => details.get(id)).filter(Boolean) as Array<Omit<Video, 'from'>>;
  return { own: pick(ownIds), popular: pick(popularIds), short: pick(shortIds) };
};

/** The brief's order: own channel by views, then Shorts, then popular — no repeats. */
const rank = (lists: { own: Array<Omit<Video, 'from'>>; popular: Array<Omit<Video, 'from'>>; short: Array<Omit<Video, 'from'>> }, shorts: boolean, max: number): Video[] => {
  const out: Video[] = [];
  const seen = new Set<string>();
  const add = (list: Array<Omit<Video, 'from'>>, from: Video['from']) =>
    [...list]
      .sort((a, b) => b.views - a.views)
      .forEach((video) => {
        if (!seen.has(video.id) && video.title) {
          seen.add(video.id);
          out.push({ ...video, from });
        }
      });
  add(lists.own, 'channel');
  // Only what really is a Short: a "#shorts" search also returns ordinary videos.
  if (shorts) add([...lists.short, ...lists.popular].filter((video) => video.short), 'shorts');
  add([...lists.popular, ...lists.short], 'popular');
  return out.slice(0, max);
};

/**
 * Drop the videos whose owners do not allow them to be played on other
 * sites — on the TV they would show "Video unavailable". YouTube's oEmbed
 * answers 401 for exactly those, without a key.
 */
const embeddable = async (videos: Video[], max: number): Promise<Video[]> => {
  const checked = await Promise.all(
    videos.map(async (video) => {
      try {
        const response = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${video.id}`)}`);
        return response.ok ? video : null;
      } catch {
        return video;
      }
    })
  );
  return checked.filter(Boolean).slice(0, max) as Video[];
};

const storedKey = async (env: Env): Promise<string> => {
  if (typeof env.YOUTUBE_API_KEY === 'string' && env.YOUTUBE_API_KEY.trim()) return env.YOUTUBE_API_KEY.trim();
  const kv = adminKv(env as never);
  if (!kv) return '';
  try {
    const raw = await kv.get(YOUTUBE_SECRET_KEY);
    return raw ? String(JSON.parse(raw)?.apiKey ?? '').trim() : '';
  } catch {
    return '';
  }
};

export const onRequest = async ({ request, env, waitUntil }: { request: Request; env: Env; waitUntil?: (promise: Promise<unknown>) => void }) => {
  const url = new URL(request.url);

  if (request.method === 'PUT') {
    const auth = await verifyAdminRequest(env as never, request);
    if (!auth.ok) return json({ error: auth.error }, auth.status);
    const kv = adminKv(env as never);
    if (!kv) return json({ error: 'No KV namespace is bound to this deployment.' }, 503);
    const body = (await request.json().catch(() => ({}))) as { apiKey?: string };
    const apiKey = String(body.apiKey ?? '').trim();
    if (apiKey) await kv.put(YOUTUBE_SECRET_KEY, JSON.stringify({ apiKey }));
    else await kv.delete(YOUTUBE_SECRET_KEY);
    return json({ ok: true, hasKey: Boolean(apiKey) });
  }

  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const key = await storedKey(env);
  if (url.searchParams.has('status')) return json({ hasKey: Boolean(key) }, 200, { 'Cache-Control': 'no-store' });

  const query = (url.searchParams.get('q') ?? '').trim().slice(0, 120);
  if (!query) return json({ error: 'Missing q' }, 400);
  const channel = (url.searchParams.get('channel') ?? '').trim().slice(0, 200);
  const shorts = url.searchParams.get('shorts') !== '0';
  const max = Math.min(30, Math.max(3, Number(url.searchParams.get('max')) || 12));

  // Six hours in the edge cache, keyed on everything that changes the answer.
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  const cacheKey = new Request(`https://youtube-cache.local/?q=${encodeURIComponent(query)}&c=${encodeURIComponent(channel)}&s=${shorts ? 1 : 0}&m=${max}&k=${key ? 1 : 0}`);
  const hit = cache ? await cache.match(cacheKey).catch(() => undefined) : undefined;
  if (hit) return hit;

  let videos: Video[] = [];
  let source: 'api' | 'pages' = key ? 'api' : 'pages';
  try {
    if (key) {
      try {
        videos = await embeddable(rank(await fromApi(query, channel, shorts, key), shorts, max * 2), max);
      } catch {
        // A key over its quota should not blank the TV: fall back to the pages.
        source = 'pages';
        videos = await embeddable(rank(await fromPages(query, channel, shorts), shorts, max * 2), max);
      }
    } else {
      videos = await embeddable(rank(await fromPages(query, channel, shorts), shorts, max * 2), max);
    }
  } catch (error) {
    return json({ videos: [], source, error: error instanceof Error ? error.message : String(error) }, 200, { 'Cache-Control': 'no-store' });
  }

  const response = json({ videos, source }, 200, { 'Cache-Control': 'public, max-age=21600' });
  if (cache && videos.length) {
    const put = cache.put(cacheKey, response.clone()).catch(() => undefined);
    if (waitUntil) waitUntil(put);
  }
  return response;
};
