import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/useAuth";

export default function ProtectedRoute({
    children,
}: {
    children: ReactNode;
}) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="h-screen w-screen bg-gray-950 
                      flex items-center justify-center">
                <span className="text-green-400 font-mono text-sm 
                         animate-pulse">
                    LOADING...
                </span>
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;

    return <>{children}</>;
}
