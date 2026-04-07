import { useState, useEffect, useCallback } from "react";
import { getCurrentUser, type GetCurrentUserOutput } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

export function useAuth() {
    const [user, setUser] = useState<GetCurrentUserOutput | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refreshUser();

        const unsubscribe = Hub.listen("auth", ({ payload }) => {
            if (
                payload.event === "signedIn" ||
                payload.event === "signInWithRedirect" ||
                payload.event === "signedOut"
            ) {
                setLoading(true);
                void refreshUser();
            }
        });

        return unsubscribe;
    }, [refreshUser]);

    return { user, loading };
}
