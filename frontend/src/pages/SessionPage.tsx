import { useState } from "react";
import Editor from "../components/Editor";

export default function SessionPage() {
    const [code, setCode] = useState("// Start coding here\n");

    return (
        <div className="h-screen w-full bg-gray-950 flex flex-col">
            <div
                className="h-12 bg-gray-900 border-b border-gray-800
                      flex items-center px-4"
            >
                <span className="text-green-400 font-mono text-sm">
                    CodeDuel — Session
                </span>
            </div>
            <div className="flex-1">
                <Editor
                    value={code}
                    onChange={(value) => setCode(value ?? "")}
                />
            </div>
        </div>
    );
}
