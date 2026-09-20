import React from 'react';
import MDEditor from '@uiw/react-md-editor';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  height = 200,
}) => {
  return (
    <div data-color-mode="light" className="overflow-hidden rounded-2xl border border-[rgba(150,112,31,0.4)]">
      <MDEditor
        value={value}
        onChange={(val) => onChange(val ?? '')}
        height={height}
        preview="live"
        visibleDragbar={false}
      />
    </div>
  );
};

export default MarkdownEditor;