import { useState } from "react";
import { signIn, signUp, confirmSignUp } from "aws-amplify/auth";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../lib/useAuth";
import Spline from '@splinetool/react-spline';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, ArrowRight, Loader2, Mail, Lock, CheckCircle2 } from 'lucide-react';

type Mode = "login" | "signup" | "confirm";

export default function LoginPage() {
    const { user, loading: authLoading } = useAuth();
    const [mode, setMode] = useState<Mode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    if (authLoading) return null;
    if (user) return <Navigate to="/dashboard" replace />;

    const handleLogin = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSubmitting(true); setError("");
        try {
            await signIn({ username: email, password });
            navigate("/dashboard");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSignup = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSubmitting(true); setError("");
        try {
            await signUp({ username: email, password });
            setMode("confirm");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirm = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSubmitting(true); setError("");
        try {
            await confirmSignUp({ username: email, confirmationCode: code });
            setMode("login");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const formVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gray-950">
            {/* SPLINE 3D BACKGROUND */}
            <div className="absolute inset-0 z-0">
                <Spline scene="https://prod.spline.design/kZCWcwB61OSaXwYy/scene.splinecode" />
            </div>
            
            {/* Dark overlay to ensure text readability */}
            <div className="absolute inset-0 bg-gray-950/60 z-0 pointer-events-none"></div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-md p-8 md:p-10 rounded-2xl glass-panel"
            >
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-2xl flex items-center justify-center mb-4 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                        <Code2 size={32} />
                    </div>
                    <h1 className="text-white font-mono text-3xl font-bold tracking-tight">
                        CODEDUEL
                    </h1>
                    <p className="text-gray-400 font-mono text-xs tracking-widest mt-2 uppercase">
                        {mode === "login" && "Welcome Back"}
                        {mode === "signup" && "Create your account"}
                        {mode === "confirm" && "Verify your email"}
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    <motion.form 
                        key={mode}
                        variants={formVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="flex flex-col gap-4"
                        onSubmit={
                            mode === "login" ? handleLogin :
                            mode === "signup" ? handleSignup :
                            handleConfirm
                        }
                    >
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }} 
                                animate={{ opacity: 1, height: 'auto' }} 
                                className="text-red-400 bg-red-950/50 border border-red-900/50 text-xs font-mono p-3 rounded-lg flex items-center gap-2"
                            >
                                <div className="w-1 h-full bg-red-500 rounded-full"></div>
                                {error}
                            </motion.div>
                        )}

                        {mode !== "confirm" && (
                            <>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="Email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full glass-input text-gray-100 font-mono text-sm pl-10 pr-4 py-3 rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full glass-input text-gray-100 font-mono text-sm pl-10 pr-4 py-3 rounded-xl"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {mode === "confirm" && (
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                    <CheckCircle2 size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Verification code"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="w-full glass-input text-gray-100 font-mono text-sm pl-10 pr-4 py-3 rounded-xl tracking-widest text-center"
                                    required
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="group mt-2 w-full bg-green-500 hover:bg-green-400 text-black font-mono font-bold text-sm py-3 px-4 rounded-xl disabled:opacity-50 transition-all flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_25px_rgba(34,197,94,0.4)]"
                        >
                            {submitting ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    {mode === "login" ? "SIGN IN" :
                                     mode === "signup" ? "CREATE ACCOUNT" :
                                     "VERIFY"}
                                    <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </motion.form>
                </AnimatePresence>

                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                    <p className="text-gray-400 font-mono text-xs">
                        {mode === "login" ? "Don't have an account?" : "Already have an account?"}
                        <button
                            onClick={() => setMode(mode === "login" ? "signup" : "login")}
                            className="ml-2 text-green-400 hover:text-green-300 font-bold transition-colors underline-offset-4 hover:underline"
                        >
                            {mode === "login" ? "Sign up now" : "Sign in"}
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}