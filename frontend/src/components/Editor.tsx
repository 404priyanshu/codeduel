import MonacoEditor, { type OnMount } from "@monaco-editor/react";
import { useRef, useEffect } from "react";
import type * as monacoType from "monaco-editor";

interface Props {
    language?: string;
    value?: string;
    onChange?: (value: string | undefined) => void;
}

export default function Editor({
    language = "javascript",
    value = "// Start coding here\n",
    onChange,
}: Props) {
    const editorRef = useRef<monacoType.editor.IStandaloneCodeEditor | null>(null);
    const isApplyingRemote = useRef(false);

    const handleMount: OnMount = (editor) => {
        editorRef.current = editor;

        // Listen for content changes from user typing
        editor.onDidChangeModelContent(() => {
            if (isApplyingRemote.current) return;      // skip echo
            onChange?.(editor.getValue());
        });
    };

    // When the parent passes a new `value` (from remote), push it
    // into the editor model WITHOUT replacing the whole document,
    // and preserve the cursor / selection.
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const model = editor.getModel();
        if (!model) return;

        const currentValue = model.getValue();
        if (value === currentValue) return;  // nothing changed

        // Save cursor & selections
        const selections = editor.getSelections();

        isApplyingRemote.current = true;

        // Use pushEditOperations so Ctrl-Z still works for the
        // local user. It replaces the full text, but keeps undo stack.
        model.pushEditOperations(
            selections,
            [
                {
                    range: model.getFullModelRange(),
                    text: value ?? "",
                },
            ],
            () => selections   // restore previous selections
        );

        // Restore cursor position
        if (selections) {
            editor.setSelections(selections);
        }

        isApplyingRemote.current = false;
    }, [value]);

    return (
        <MonacoEditor
            height="100%"
            theme="vs-dark"
            language={language}
            defaultValue={value}
            onMount={handleMount}
            options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
            }}
        />
    );
}
