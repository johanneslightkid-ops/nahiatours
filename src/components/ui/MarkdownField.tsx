import React, { useRef, useState } from 'react';
import {
  FaBold,
  FaItalic,
  FaHeading,
  FaLink,
  FaListUl,
  FaQuoteLeft,
  FaEye,
  FaPen,
} from 'react-icons/fa';
import MarkdownRenderer from './MarkdownRenderer';

interface MarkdownFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Minimum height in rem. The field grows past it. */
  minRem?: number;
  label?: string;
  hint?: string;
}

/**
 * A Markdown box you can actually use on a phone.
 *
 * It replaces @uiw/react-md-editor, which was two problems at once. It is a
 * 900 kB chunk — over 300 kB gzipped, the single largest thing in this
 * codebase — loaded for one textarea. And its side-by-side live preview halves
 * an already narrow screen, with a toolbar of small icon buttons above it, so
 * on a phone it was close to unusable.
 *
 * What is here instead: one full-width field with 44px touch targets, a
 * preview you toggle rather than one that permanently eats half the width, and
 * formatting buttons that wrap the selection the way every editor does. No
 * dependency, and the whole thing is smaller than the old library's icon set.
 */
const MarkdownField: React.FC<MarkdownFieldProps> = ({
  value,
  onChange,
  placeholder,
  minRem = 12,
  label,
  hint,
}) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [preview, setPreview] = useState(false);

  /** Wrap or prefix the selection, then put the caret back where it belongs. */
  const apply = (before: string, after = '', blockPrefix = false) => {
    const area = ref.current;
    if (!area) return;

    const start = area.selectionStart;
    const end = area.selectionEnd;
    const selected = value.slice(start, end);

    let next: string;
    let caret: number;

    if (blockPrefix) {
      // Line-level marks go at the start of every selected line.
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const block = value.slice(lineStart, end);
      const marked = block
        .split('\n')
        .map((line) => (line.startsWith(before) ? line.slice(before.length) : before + line))
        .join('\n');
      next = value.slice(0, lineStart) + marked + value.slice(end);
      caret = lineStart + marked.length;
    } else {
      next = value.slice(0, start) + before + (selected || '') + after + value.slice(end);
      caret = selected ? start + before.length + selected.length + after.length : start + before.length;
    }

    onChange(next);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(caret, caret);
    });
  };

  const tool =
    'grid h-11 w-11 place-items-center rounded-xl border border-ink/15 bg-white text-ink-soft transition hover:border-lagoon hover:text-ink';

  return (
    <div>
      {(label || hint) && (
        <div className="mb-2">
          {label && (
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-light">
              {label}
            </p>
          )}
          {hint && <p className="mt-0.5 text-xs text-ink-light">{hint}</p>}
        </div>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button type="button" className={tool} onClick={() => apply('**', '**')} title="Negrita" aria-label="Negrita">
          <FaBold className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={tool} onClick={() => apply('*', '*')} title="Cursiva" aria-label="Cursiva">
          <FaItalic className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={tool} onClick={() => apply('## ', '', true)} title="Subtítulo" aria-label="Subtítulo">
          <FaHeading className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={tool} onClick={() => apply('- ', '', true)} title="Lista" aria-label="Lista">
          <FaListUl className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={tool} onClick={() => apply('> ', '', true)} title="Cita" aria-label="Cita">
          <FaQuoteLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={tool}
          onClick={() => apply('[', '](https://)')}
          title="Enlace"
          aria-label="Enlace"
        >
          <FaLink className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl border border-ink/15 bg-white px-4 text-xs font-bold text-ink-soft transition hover:border-lagoon hover:text-ink"
        >
          {preview ? <><FaPen className="h-3 w-3" /> Editar</> : <><FaEye className="h-3 w-3" /> Vista previa</>}
        </button>
      </div>

      {preview ? (
        <div
          className="w-full overflow-auto rounded-2xl border border-ink/15 bg-white p-4"
          style={{ minHeight: `${minRem}rem` }}
        >
          {value.trim() ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="text-sm text-ink-light">Nada que mostrar todavía.</p>
          )}
        </div>
      ) : (
        <textarea
          ref={ref}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          // 16px keeps iOS from zooming the whole page when the field is
          // focused, which is the thing that makes mobile text entry feel
          // broken more than anything else.
          className="w-full resize-y rounded-2xl border border-ink/15 bg-white p-4 text-base leading-relaxed"
          style={{ minHeight: `${minRem}rem` }}
        />
      )}
    </div>
  );
};

export default MarkdownField;
