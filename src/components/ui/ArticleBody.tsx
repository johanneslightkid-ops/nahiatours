import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';

interface ArticleBodyProps {
  caption?: string;
  prelude?: string;
  body: string;
  images?: string[];
  /** Alt text stem; the index is appended. */
  title?: string;
  className?: string;
}

/**
 * One article, laid out the way an article is laid out.
 *
 * The blog page used to take the whole post as one string, split it on blank
 * lines and print every paragraph at the same size — so a piece with a
 * standfirst, an opening and eight sections arrived as an undifferentiated
 * column of text, and its photographs did not arrive at all.
 *
 * Three things have a job here:
 *
 *   CAPTION   the standfirst. Larger than the body, lighter in weight, and the
 *             first thing the eye lands on after the title.
 *   PRELUDE   the opening. Set bold, because it is the paragraph that decides
 *             whether the rest gets read.
 *   BODY      Markdown, carrying [[IMAGE-n]] markers on their own lines where
 *             the writer put a photograph. Each marker is replaced by the nth
 *             picture; a marker with no picture behind it simply disappears.
 *
 * Only tokens that exist in every branch's Tailwind config are used here
 * (ink, paper, lagoon), so the same component renders inside each design.
 */
const IMAGE_MARKER = /\[\[IMAGE-(\d+)\]\]/gi;

const ArticleBody: React.FC<ArticleBodyProps> = ({
  caption,
  prelude,
  body,
  images = [],
  title = '',
  className = '',
}) => {
  // Split the body at every image marker, keeping the number so the right
  // picture lands in the right hole.
  const segments: Array<{ type: 'text'; value: string } | { type: 'image'; index: number }> = [];
  let cursor = 0;
  IMAGE_MARKER.lastIndex = 0;

  for (let match = IMAGE_MARKER.exec(body); match; match = IMAGE_MARKER.exec(body)) {
    const before = body.slice(cursor, match.index);
    if (before.trim()) segments.push({ type: 'text', value: before });
    segments.push({ type: 'image', index: Number(match[1]) - 1 });
    cursor = match.index + match[0].length;
  }
  const tail = body.slice(cursor);
  if (tail.trim()) segments.push({ type: 'text', value: tail });
  if (segments.length === 0) segments.push({ type: 'text', value: body });

  const placed = new Set(
    segments.filter((s): s is { type: 'image'; index: number } => s.type === 'image').map((s) => s.index)
  );
  // Any picture the writer never referenced still belongs in the article, so
  // it goes at the end rather than being quietly dropped.
  const orphans = images.map((_, i) => i).filter((i) => !placed.has(i));

  const figure = (index: number, key: string) => {
    const src = images[index];
    if (!src) return null;
    return (
      <figure key={key} className="my-8 -mx-1 sm:mx-0">
        <img
          src={src}
          alt={title ? `${title} — ${index + 1}` : ''}
          loading="lazy"
          decoding="async"
          className="w-full rounded-2xl border border-ink/10 object-cover shadow-ink-sm"
        />
      </figure>
    );
  };

  return (
    <div className={className}>
      {caption && (
        <p className="mb-6 font-display text-xl leading-relaxed text-ink-soft sm:text-2xl">
          {caption}
        </p>
      )}

      {prelude && (
        <p className="mb-8 border-l-2 border-lagoon/60 pl-5 text-lg font-bold leading-relaxed text-ink sm:text-xl">
          {prelude}
        </p>
      )}

      {segments.map((segment, i) =>
        segment.type === 'image' ? (
          figure(segment.index, `img-${i}`)
        ) : (
          <MarkdownRenderer
            key={`text-${i}`}
            content={segment.value.trim()}
            className="prose-headings:font-display prose-headings:text-ink prose-p:text-ink-soft prose-li:text-ink-soft prose-strong:text-ink prose-a:text-lagoon-dark"
          />
        )
      )}

      {orphans.map((index) => figure(index, `orphan-${index}`))}
    </div>
  );
};

export default ArticleBody;
