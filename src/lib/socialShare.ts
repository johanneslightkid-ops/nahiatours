/**
 * Where a post can actually be shared from a browser.
 *
 * Half of these networks have a share intent and half do not, and pretending
 * otherwise is how a "Share to Instagram" button ends up doing nothing. Each
 * entry says honestly which it is:
 *
 *   mode: 'intent'  — a URL that opens the composer with the text already in
 *                     it. Click and it is ready to post.
 *   mode: 'paste'   — the network has no web composer that accepts text from a
 *                     link (Instagram and TikTok both refuse, by design). The
 *                     button copies the post to the clipboard and opens the
 *                     right page, so the next action is one paste.
 */

export type ShareMode = 'intent' | 'paste';

export interface ShareTarget {
  platform: string;
  label: string;
  mode: ShareMode;
  /** What the button does about the composer. */
  note: { en: string; es: string };
  build: (input: { text: string; url: string }) => string;
}

const enc = encodeURIComponent;

export const SHARE_TARGETS: ShareTarget[] = [
  {
    platform: 'facebook',
    label: 'Facebook',
    mode: 'intent',
    note: {
      en: 'Opens the Facebook composer with the link attached.',
      es: 'Abre el compositor de Facebook con el enlace adjunto.',
    },
    build: ({ text, url }) =>
      `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}&quote=${enc(text.slice(0, 1200))}`,
  },
  {
    platform: 'twitter',
    label: 'X / Twitter',
    mode: 'intent',
    build: ({ text, url }) => `https://twitter.com/intent/tweet?text=${enc(text.slice(0, 240))}&url=${enc(url)}`,
    note: {
      en: 'Opens a new post with the text already written.',
      es: 'Abre una publicación nueva con el texto ya escrito.',
    },
  },
  {
    platform: 'whatsapp',
    label: 'WhatsApp',
    mode: 'intent',
    build: ({ text, url }) => `https://wa.me/?text=${enc(`${text}\n\n${url}`)}`,
    note: {
      en: 'Opens WhatsApp with the post ready to send.',
      es: 'Abre WhatsApp con la publicación lista para enviar.',
    },
  },
  {
    platform: 'telegram',
    label: 'Telegram',
    mode: 'intent',
    build: ({ text, url }) => `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
    note: {
      en: 'Opens Telegram with the post ready to send.',
      es: 'Abre Telegram con la publicación lista para enviar.',
    },
  },
  {
    platform: 'linkedin',
    label: 'LinkedIn',
    mode: 'intent',
    build: ({ url }) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
    note: {
      en: 'LinkedIn only accepts the link, so the text is copied for you.',
      es: 'LinkedIn solo acepta el enlace, así que el texto se copia por ti.',
    },
  },
  {
    platform: 'instagram',
    label: 'Instagram',
    mode: 'paste',
    // Instagram has no web share intent at all — no URL will prefill a post.
    // The honest button is copy-then-open.
    build: () => 'https://www.instagram.com/',
    note: {
      en: 'Instagram cannot be prefilled from a link. The post is copied — paste it into the app.',
      es: 'Instagram no se puede rellenar desde un enlace. La publicación se copia: pégala en la app.',
    },
  },
  {
    platform: 'tiktok',
    label: 'TikTok',
    mode: 'paste',
    build: () => 'https://www.tiktok.com/upload',
    note: {
      en: 'TikTok cannot be prefilled either. The caption is copied — paste it on upload.',
      es: 'TikTok tampoco se puede rellenar. La descripción se copia: pégala al subir.',
    },
  },
  {
    platform: 'youtube',
    label: 'YouTube',
    mode: 'paste',
    build: () => 'https://studio.youtube.com/',
    note: {
      en: 'The description is copied for YouTube Studio.',
      es: 'La descripción se copia para YouTube Studio.',
    },
  },
];

export const shareTargetFor = (platform: string) =>
  SHARE_TARGETS.find((t) => t.platform === platform.toLowerCase());

/** Copy, tolerating the browsers and contexts where the API is unavailable. */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the textarea trick */
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
};

/**
 * Copy the post, then open the network. Both, always — even for the intent
 * links, because a composer that loses the text on a redirect still leaves the
 * operator one paste away rather than back at the start.
 */
export const shareTo = async (platform: string, text: string, url: string): Promise<ShareMode | null> => {
  const target = shareTargetFor(platform);
  if (!target) return null;

  await copyText(`${text}\n\n${url}`);
  window.open(target.build({ text, url }), '_blank', 'noopener,noreferrer');
  return target.mode;
};
