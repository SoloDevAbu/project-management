import MDEditor from '@uiw/react-md-editor';
import * as commands from '@uiw/react-md-editor/commands';
import { useState, useImperativeHandle, forwardRef } from 'react';

interface ProjectDetailesEditorProps {
  initialContent?: string | null;
}

export interface ProjectDetailesEditorRef {
  getContent: () => string;
}

const ProjectDetailesEditor = forwardRef<ProjectDetailesEditorRef, ProjectDetailesEditorProps>(
  ({ initialContent }, ref) => {
    const [content, setContent] = useState(initialContent || '');

    useImperativeHandle(ref, () => ({
      getContent: () => content,
    }));

    return (
      <div>
        <MDEditor
          value={content}
          onChange={(val) => setContent(val || '')}
          height={400}
          preview="live"
          visibleDragbar={false}
          data-color-mode='light'
          commands={[
            commands.bold,
            commands.italic,
            commands.strikethrough,
            commands.heading,
            commands.quote,
            commands.code,
            commands.link,
            commands.table,
            commands.codeBlock,
          ]}
        />
      </div>
    );
  }
);

ProjectDetailesEditor.displayName = 'ProjectDetailesEditor';

export default ProjectDetailesEditor;