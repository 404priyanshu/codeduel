import { useEffect, useRef, useState, useCallback } from "react";

export function useSession(sessionId: string) {
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [connected, setConnected] = useState(false);
    const [remoteCode, setRemoteCode] = useState<string | null>(null);

    const WS_URL = import.meta.env.VITE_WS_URL;

    const connect = useCallback(() => {
        // Guard against missing env var
        if (!WS_URL) {
            console.warn("VITE_WS_URL is not set — WebSocket disabled");
            return;
        }

        const socket = new WebSocket(`${WS_URL}?sessionId=${sessionId}`);

        socket.onopen = () => setConnected(true);

        socket.onclose = () => {
            setConnected(false);
            // Auto-reconnect after 2 seconds
            reconnectTimer.current = setTimeout(() => {
                connect();
            }, 2000);
        };

        socket.onerror = () => {
            // Let onclose handle reconnection
            socket.close();
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
    }, [WS_URL, sessionId]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            ws.current?.close();
        };
    }, [connect]);

    const sendCode = (code: string) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: "code", code }));
        }
    };

    return { connected, remoteCode, sendCode };
}