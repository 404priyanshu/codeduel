import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "../components/Editor";
import { useSession } from "../lib/useSession";

const LANGUAGES = [
    { label: "JavaScript", value: "javascript" },
    { label: "TypeScript", value: "typescript" },
    { label: "Python", value: "python" },
    { label: "Java", value: "java" },
    { label: "C++", value: "cpp" },
];

export default function SessionPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [code, setCode] = useState("// Start coding here\n");
    const [language, setLanguage] = useState("javascript");
    const { connected, remoteCode, sendCode } = useSession(id!);

    // When remote code arrives, update state so the Editor sees the new value
    useEffect(() => {
        if (remoteCode !== null) {
            setCode(remoteCode);
        }
    }, [remoteCode]);

    // handleChange is ONLY called for local keystrokes
    // (the Editor skips calling onChange during remote updates)
    const handleChange = useCallback((value: string | undefined) => {
        const newCode = value ?? "";
        setCode(newCode);
        sendCode(newCode);
    }, [sendCode]);

    return (
        <div className="h-screen w-screen bg-gray-950 flex flex-col">

            {/* Header */}
            <div className="h-12 bg-gray-900 border-b border-gray-800
                      flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-4">
                    <span
                        onClick={() => navigate("/dashboard")}
                        className="text-green-400 font-mono text-sm font-bold
                       cursor-pointer hover:text-green-300"
                    >
                        CODEDUEL
                    </span>
                    <span className="text-gray-700 font-mono text-xs">
                        SESSION: {id}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="bg-gray-800 text-gray-300 font-mono text-xs
                       border border-gray-700 px-2 py-1 outline-none
                       focus:border-green-500 cursor-pointer"
                    >
                        {LANGUAGES.map((l) => (
                            <option key={l.value} value={l.value}>
                                {l.label}
                            </option>
                        ))}
                    </select>

                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-500"
                            }`} />
                        <span className="text-gray-500 font-mono text-xs">
                            {connected ? "LIVE" : "CONNECTING..."}
                        </span>
                    </div>
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1">
                <Editor
                    value={code}
                    language={language}
                    onChange={handleChange}
                />
            </div>

            {/* Footer */}
            <div className="h-6 bg-gray-900 border-t border-gray-800
                      flex items-center px-4 shrink-0">
                <span className="text-gray-600 font-mono text-xs">
                    {connected
                        ? "✓ Connected — changes sync in real time"
                        : "⚠ Disconnected — trying to reconnect"}
                </span>
            </div>

        </div>
    );
}