import React from 'react';
import MarkdownField from './MarkdownField';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
}

/**
 * Kept as a name, not as a dependency.
 *
 * This used to render @uiw/react-md-editor, which built into a 899 kB chunk —
 * 316 kB gzipped — for a single description field, and whose split-pane live
 * preview left about half a phone screen to type in. MarkdownField does the
 * same job with no dependency and full width on a phone; the props are
 * unchanged so every caller keeps working.
 */
const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, height = 200 }) => (
  <MarkdownField value={value} onChange={onChange} minRem={Math.max(10, height / 16)} />
);

export default MarkdownEditor;
