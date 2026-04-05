import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "aws-amplify/auth";
import { useAuth } from "../lib/useAuth";
import Spline from '@splinetool/react-spline';
import { motion } from 'framer-motion';
import { LogOut, MonitorPlay, Users, Code2, Copy, Play } from 'lucide-react';

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

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col bg-gray-950 overflow-hidden">
            
            {/* SPLINE 3D BACKGROUND */}
            <div className="absolute inset-0 z-0 opacity-80">
                <Spline scene="https://prod.spline.design/kZCWcwB61OSaXwYy/scene.splinecode" />
            </div>
            
            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-gray-950/70 z-0 pointer-events-none"></div>

            {/* Navbar (Glassmorphism) */}
            <header className="relative z-10 h-16 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between px-6 md:px-12 sticky top-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/30">
                        <Code2 size={18} />
                    </div>
                    <span className="text-white font-mono font-bold text-lg tracking-wide">
                        CODEDUEL
                    </span>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse"></div>
                        <span className="text-gray-400 font-mono text-xs">
                            {user?.signInDetails?.loginId}
                        </span>
                    </div>
                    
                    <button
                        onClick={handleSignOut}
                        className="group flex items-center gap-2 text-gray-400 hover:text-white font-mono text-xs transition-colors py-1 px-3 rounded-md hover:bg-white/5"
                    >
                        <span>SIGN OUT</span>
                        <LogOut size={14} className="group-hover:text-red-400 transition-colors" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 md:p-12">
                
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl md:text-5xl text-white font-mono font-bold mb-4">
                        Choose your path
                    </h1>
                    <p className="text-gray-400 font-mono text-sm max-w-md mx-auto">
                        Start a new interview space or join an existing one using a room code.
                    </p>
                </motion.div>

                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col md:flex-row items-stretch justify-center gap-6 md:gap-10 w-full max-w-4xl"
                >
                    {/* Create Session Card */}
                    <motion.div variants={itemVariants} className="flex-1">
                        <div className="h-full glass-panel rounded-2xl p-8 border border-white/10 hover:border-green-500/50 transition-colors duration-300 group">
                            <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center mb-6 border border-green-500/20 group-hover:scale-110 transition-transform duration-300">
                                <MonitorPlay size={24} />
                            </div>
                            
                            <div className="text-green-400 font-mono text-xs tracking-widest font-bold mb-2">
                                INTERVIEWER
                            </div>
                            <h2 className="text-2xl text-white font-mono font-bold mb-4">
                                Create Session
                            </h2>
                            <p className="text-gray-400 font-mono text-sm leading-relaxed mb-8 flex-1">
                                Launch a secure, ultra-low latency coding sandbox. Share the generated link with your candidate to begin assessing.
                            </p>
                            
                            <button
                                onClick={handleCreate}
                                className="w-full bg-green-500 hover:bg-green-400 text-black font-mono font-bold text-sm py-3.5 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)] hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] flex items-center justify-center"
                            >
                                <Play size={16} fill="currentColor" className="mr-2" />
                                START NEW ROOM
                            </button>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="hidden md:flex items-center">
                        <div className="w-[1px] h-32 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
                    </motion.div>

                    <div className="flex md:hidden items-center justify-center py-2">
                        <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                    </div>

                    {/* Join Session Card */}
                    <motion.div variants={itemVariants} className="flex-1">
                        <div className="h-full glass-panel rounded-2xl p-8 border border-white/10 hover:border-purple-500/50 transition-colors duration-300 group">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6 border border-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                                <Users size={24} />
                            </div>
                            
                            <div className="text-purple-400 font-mono text-xs tracking-widest font-bold mb-2">
                                CANDIDATE
                            </div>
                            <h2 className="text-2xl text-white font-mono font-bold mb-4">
                                Join Session
                            </h2>
                            <p className="text-gray-400 font-mono text-sm leading-relaxed mb-6">
                                Enter the 8-character session code provided by your interviewer to connect to the live coding environment.
                            </p>
                            
                            <div className="mt-auto">
                                <div className="relative mb-3">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                        <Code2 size={16} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="SESSION CODE"
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                                        className="w-full glass-input text-gray-100 font-mono text-sm pl-10 pr-4 py-3.5 rounded-xl outline-none focus:border-purple-500 tracking-[0.2em] font-medium"
                                        maxLength={8}
                                    />
                                </div>
                                <button
                                    onClick={handleJoin}
                                    disabled={!joinCode.trim()}
                                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-mono font-bold text-sm py-3.5 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(147,51,234,0.2)] hover:shadow-[0_0_25px_rgba(147,51,234,0.4)] disabled:shadow-none flex items-center justify-center"
                                >
                                    <Copy size={16} className="mr-2" />
                                    CONNECT
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

            </div>
        </div>
    );
}