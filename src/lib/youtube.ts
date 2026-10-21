/**
 * YouTube addresses, in every form people paste them:
 * youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, /embed/ID,
 * /live/ID, m. and music. hosts, youtube-nocookie.com — or a bare 11-character id.
 */
const ID = /^[A-Za-z0-9_-]{11}$/;

export const youtubeId = (value: string): string | null => {
  const text = (value || '').trim();
  if (ID.test(text)) return text;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  if (host === 'youtu.be') {
    const id = url.pathname.split('/')[1] ?? '';
    return ID.test(id) ? id : null;
  }
  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com') return null;
  const fromQuery = url.searchParams.get('v');
  if (fromQuery && ID.test(fromQuery)) return fromQuery;
  const [, kind, id] = url.pathname.split('/');
  return ['shorts', 'embed', 'live', 'v'].includes(kind) && ID.test(id ?? '') ? id : null;
};

export const isYouTube = (value: string) => youtubeId(value) !== null;

/** A Short is upright (9:16); everything else is taken as 16:9. */
export const isYouTubeShort = (value: string) => /youtube\.com\/shorts\//i.test(value);

/** The video's own still: the largest YouTube made, the medium one when there is none. */
export const youtubeThumb = (id: string, size: 'maxresdefault' | 'hqdefault' = 'maxresdefault') => `https://i.ytimg.com/vi/${id}/${size}.jpg`;
