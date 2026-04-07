import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "../components/Editor";

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
    const [language, setLanguage] = useState("javascript");
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!id) navigate("/dashboard");
    }, [id, navigate]);

    const handleConnectionChange = useCallback((isConnected: boolean) => {
        setConnected(isConnected);
    }, []);
    const handleLanguageChange = useCallback((nextLanguage: string) => {
        setLanguage((currentLanguage) =>
            currentLanguage === nextLanguage ? currentLanguage : nextLanguage
        );
    }, []);

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
                        onChange={(e) => handleLanguageChange(e.target.value)}
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
                    sessionId={id!}
                    language={language}
                    onConnectionChange={handleConnectionChange}
                    onLanguageChange={handleLanguageChange}
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
