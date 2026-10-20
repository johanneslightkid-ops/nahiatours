import React, { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import AutoScrollGallery from '../AutoScrollGallery';
import CoverflowLightbox from '../CoverflowLightbox';
import { localeText } from '../../../lib/localeText';

interface Props {
  images?: string[];
  /** The article's Markdown, for pictures written into the text as ![…](…). */
  body?: string;
  title: string;
  locale: string;
}

const MARKDOWN_IMAGE = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;

/** Every picture of an article, once each: its own list first, then any in the text. */
export const articlePictures = (images: string[] = [], body = ''): string[] => {
  const found = [...images];
  MARKDOWN_IMAGE.lastIndex = 0;
  for (let match = MARKDOWN_IMAGE.exec(body); match; match = MARKDOWN_IMAGE.exec(body)) found.push(match[1]);
  return [...new Set(found.map((src) => src.trim()).filter(Boolean))];
};

/**
 * The article's photographs in miniature, right under its title — a preview
 * of what is in the piece. The pictures also stay where the writer put them;
 * this is a second way in. A few sit in a row; more run as a small reel. A
 * tap opens them on the full-screen stage.
 */
const ArticleGallery: React.FC<Props> = ({ images, body, title, locale }) => {
  const pictures = useMemo(() => articlePictures(images, body), [images, body]);
  const [open, setOpen] = useState<number | null>(null);
  if (pictures.length === 0) return null;

  const label = localeText(locale, { en: 'Photos in this article', es: 'Fotos del artículo', de: 'Fotos in diesem Artikel', fr: 'Photos de l’article' });
  const thumb = (src: string, index: number) => (
    <button
      type="button"
      onClick={() => setOpen(index)}
      className="article-thumb group"
      aria-label={`${label} — ${index + 1} / ${pictures.length}`}
    >
      <img src={src} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
    </button>
  );

  return (
    <div className="mb-6">
      <span className="mb-2 block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.2em] text-ink-light">
        {label} · {pictures.length}
      </span>
      {pictures.length >= 5 ? (
        <AutoScrollGallery items={pictures} itemKey={(src, index) => `${src}-${index}`} renderItem={thumb} speed={20} gapClassName="gap-2" arrows={false} label={label} className="article-reel -mx-4 sm:-mx-8" />
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">{pictures.map(thumb)}</div>
      )}
      <AnimatePresence>
        {open !== null && (
          <CoverflowLightbox
            items={pictures.map((src, index) => ({ src, caption: `${title} — ${index + 1}` }))}
            startAt={open}
            onClose={() => setOpen(null)}
            label={title}
            closeLabel={localeText(locale, { en: 'Close', es: 'Cerrar', de: 'Schließen', fr: 'Fermer' })}
            previousLabel={localeText(locale, { en: 'Previous photo', es: 'Foto anterior', de: 'Vorheriges Foto', fr: 'Photo précédente' })}
            nextLabel={localeText(locale, { en: 'Next photo', es: 'Foto siguiente', de: 'Nächstes Foto', fr: 'Photo suivante' })}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ArticleGallery;
