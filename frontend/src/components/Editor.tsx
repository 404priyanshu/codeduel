import MonacoEditor from "@monaco-editor/react";

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
    return (
        <MonacoEditor
            height="100%"
            theme="vs-dark"
            language={language}
            value={value}
            onChange={onChange}
            options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
            }}
        />
    );
}
