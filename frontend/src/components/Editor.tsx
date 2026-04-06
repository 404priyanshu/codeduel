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

    // Track the last value we reported via onChange so the useEffect
    // can distinguish "value changed because of local typing" (skip)
    // from "value changed because of a remote update" (apply).
    const lastLocalValue = useRef<string | null>(null);

    const handleMount: OnMount = (editor) => {
        editorRef.current = editor;

        // Listen for content changes from user typing
        editor.onDidChangeModelContent(() => {
            if (isApplyingRemote.current) return;      // skip echo
            const v = editor.getValue();
            lastLocalValue.current = v;                // remember it
            onChange?.(v);
        });
    };

    // Only apply the value prop when it differs from both
    // the current model AND what we last sent via onChange.
    // This prevents the race where React state lags behind
    // Monaco's model during fast typing.
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        // If this value came from local typing, skip it —
        // Monaco already has it in the model.
        if (value === lastLocalValue.current) return;

        const model = editor.getModel();
        if (!model) return;

        const currentValue = model.getValue();
        if (value === currentValue) return;  // already in sync

        // This is a genuine remote update — apply it.
        const selections = editor.getSelections();

        isApplyingRemote.current = true;

        // pushEditOperations preserves the undo stack
        model.pushEditOperations(
            selections,
            [
                {
                    range: model.getFullModelRange(),
                    text: value ?? "",
                },
            ],
            () => selections
        );

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
