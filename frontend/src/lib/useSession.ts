import { useEffect, useRef, useState, useCallback } from "react";

export function useSession(sessionId: string) {
    const ws = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    const [remoteCode, setRemoteCode] = useState<string | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMounted = useRef(true);
    const WS_URL = import.meta.env.VITE_WS_URL;

    const connect = useCallback(() => {
        if (!isMounted.current) return;

        const socket = new WebSocket(`${WS_URL}?sessionId=${sessionId}`);

        socket.onopen = () => {
            if (!isMounted.current) return;
            setConnected(true);
        };

        socket.onclose = () => {
            if (!isMounted.current) return;
            setConnected(false);
            reconnectTimer.current = setTimeout(() => connect(), 3000);
        };

        socket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "code") {
                    setRemoteCode(data.code);
                }
            } catch (e) {
                console.error("Failed to parse message", e);
            }
        };

        ws.current = socket;
    }, [sessionId, WS_URL]);

    useEffect(() => {
        isMounted.current = true;
        connect();
        return () => {
            isMounted.current = false;
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            ws.current?.close();
        };
    }, [connect]);

    const sendCode = useCallback((code: string) => {
        // Debounce — only send 300ms after user stops typing
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            if (ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({
                    type: "code",
                    sessionId,
                    code,
                }));
            }
        }, 300);
    }, [sessionId]);

    return { connected, remoteCode, sendCode };
}