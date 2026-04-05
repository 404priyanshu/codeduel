import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "aws-amplify/auth";
import { useAuth } from "../lib/useAuth";

function generateSessionId() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [joinCode, setJoinCode] = useState("");

    const handleCreate = () => {
        const id = generateSessionId();
        navigate(`/session/${id}`);
    };

    const handleJoin = () => {
        if (!joinCode.trim()) return;
        navigate(`/session/${joinCode.trim().toUpperCase()}`);
    };

    const handleSignOut = async () => {
        await signOut();
        navigate("/");
    };

    return (
        <div className="h-screen w-screen bg-gray-950 flex flex-col">

            {/* Navbar */}
            <div className="h-14 bg-gray-900 border-b border-gray-800 
                      flex items-center justify-between px-6">
                <span className="text-green-400 font-mono font-bold text-lg">
                    CODEDUEL
                </span>
                <div className="flex items-center gap-4">
                    <span className="text-gray-500 font-mono text-xs">
                        {user?.signInDetails?.loginId}
                    </span>
                    <button
                        onClick={handleSignOut}
                        className="text-gray-500 font-mono text-xs 
                       hover:text-red-400 transition-colors"
                    >
                        SIGN OUT
                    </button>
                </div>
            </div>

            {/* Main */}
            <div className="flex-1 flex items-center justify-center gap-6 
                      p-8">

                {/* Create Session */}
                <div className="w-72 border border-gray-800 bg-gray-900 p-8">
                    <div className="text-green-400 font-mono text-xs 
                          tracking-widest mb-2">
                        INTERVIEWER
                    </div>
                    <h2 className="text-white font-mono text-xl font-bold mb-2">
                        Create Session
                    </h2>
                    <p className="text-gray-500 font-mono text-xs mb-8 
                        leading-relaxed">
                        Start a new interview room. Share the session code with your candidate.
                    </p>
                    <button
                        onClick={handleCreate}
                        className="w-full bg-green-500 text-black font-mono 
                       font-bold text-sm py-3 hover:bg-green-400 
                       transition-colors"
                    >
                        CREATE ROOM →
                    </button>
                </div>

                <div className="text-gray-700 font-mono text-sm">OR</div>

                {/* Join Session */}
                <div className="w-72 border border-gray-800 bg-gray-900 p-8">
                    <div className="text-purple-400 font-mono text-xs 
                          tracking-widest mb-2">
                        CANDIDATE
                    </div>
                    <h2 className="text-white font-mono text-xl font-bold mb-2">
                        Join Session
                    </h2>
                    <p className="text-gray-500 font-mono text-xs mb-6 
                        leading-relaxed">
                        Enter the session code shared by your interviewer.
                    </p>
                    <input
                        type="text"
                        placeholder="SESSION CODE"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                        className="w-full bg-gray-950 border border-gray-800 
                       text-gray-200 font-mono text-sm px-3 py-2 
                       mb-3 outline-none focus:border-purple-500 
                       tracking-widest"
                    />
                    <button
                        onClick={handleJoin}
                        className="w-full bg-purple-600 text-white font-mono 
                       font-bold text-sm py-3 hover:bg-purple-500 
                       transition-colors"
                    >
                        JOIN ROOM →
                    </button>
                </div>

            </div>
        </div>
    );
}