import MDEditor from '@uiw/react-md-editor';

export const MarkDownViewer = ({ content }: { content: string }) => {
    return (
        <div data-color-mode="light">
            <MDEditor.Markdown source={content} />
        </div>
    );
};