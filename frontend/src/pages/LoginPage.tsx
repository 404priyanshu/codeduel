import { useState } from "react";
import { signIn, signUp, confirmSignUp } from "aws-amplify/auth";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../lib/useAuth";

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

    // Early returns AFTER all hooks
    if (authLoading) return null;
    if (user) return <Navigate to="/dashboard" replace />;

    const handleLogin = async () => {
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

    const handleSignup = async () => {
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

    const handleConfirm = async () => {
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

    return (
        <div className="h-screen w-screen bg-gray-950 
                    flex items-center justify-center">
            <div className="w-full max-w-sm border border-gray-800 
                      bg-gray-900 p-8">
                <h1 className="text-green-400 font-mono text-2xl 
                       font-bold mb-2">
                    CODEDUEL
                </h1>
                <p className="text-gray-500 font-mono text-xs mb-8">
                    {mode === "login" && "SIGN IN TO CONTINUE"}
                    {mode === "signup" && "CREATE AN ACCOUNT"}
                    {mode === "confirm" && "CHECK YOUR EMAIL"}
                </p>

                {error && (
                    <p className="text-red-400 font-mono text-xs mb-4 
                        border border-red-900 p-2">
                        {error}
                    </p>
                )}

                {mode !== "confirm" && (
                    <>
                        <input
                            type="email"
                            placeholder="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 
                         text-gray-200 font-mono text-sm px-3 py-2 
                         mb-3 outline-none focus:border-green-500"
                        />
                        <input
                            type="password"
                            placeholder="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 
                         text-gray-200 font-mono text-sm px-3 py-2 
                         mb-6 outline-none focus:border-green-500"
                        />
                    </>
                )}

                {mode === "confirm" && (
                    <input
                        type="text"
                        placeholder="verification code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 
                       text-gray-200 font-mono text-sm px-3 py-2 
                       mb-6 outline-none focus:border-green-500"
                    />
                )}

                <button
                    onClick={
                        mode === "login" ? handleLogin :
                            mode === "signup" ? handleSignup :
                                handleConfirm
                    }
                    disabled={submitting}
                    className="w-full bg-green-500 text-black font-mono 
                     font-bold text-sm py-2 hover:bg-green-400 
                     disabled:opacity-50 transition-colors"
                >
                    {submitting ? "..." :
                        mode === "login" ? "SIGN IN →" :
                            mode === "signup" ? "CREATE ACCOUNT →" :
                                "VERIFY →"}
                </button>

                <p
                    className="text-gray-600 font-mono text-xs mt-4 
                     text-center cursor-pointer hover:text-gray-400"
                    onClick={() => setMode(mode === "login" ? "signup" : "login")}
                >
                    {mode === "login"
                        ? "No account? Sign up"
                        : "Have an account? Sign in"}
                </p>
            </div>
        </div>
    );
}