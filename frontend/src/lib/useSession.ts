import { useEffect, useRef, useState, useCallback } from "react";

export function useSession(sessionId: string) {
    const ws = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    const [remoteCode, setRemoteCode] = useState<string | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingCode = useRef<string | null>(null);
    const lastSentCode = useRef<string>("");
    const lastSendAt = useRef(0);
    const isMounted = useRef(true);
    const WS_URL = import.meta.env.VITE_WS_URL;
    const SEND_INTERVAL_MS = 50;

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
                    // Skip duplicate payloads to avoid unnecessary rerenders.
                    setRemoteCode((prev) => (prev === data.code ? prev : data.code));
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
            if (flushTimer.current) clearTimeout(flushTimer.current);
            ws.current?.close();
        };
    }, [connect]);

    const flushPendingCode = useCallback(() => {
        if (pendingCode.current === null) return;
        if (ws.current?.readyState !== WebSocket.OPEN) return;
        if (pendingCode.current === lastSentCode.current) return;

        ws.current.send(
            JSON.stringify({
                type: "code",
                sessionId,
                code: pendingCode.current,
            })
        );
        lastSentCode.current = pendingCode.current;
        lastSendAt.current = Date.now();
    }, [sessionId]);

    const sendCode = useCallback((code: string) => {
        pendingCode.current = code;

        if (code === lastSentCode.current) return;

        const elapsed = Date.now() - lastSendAt.current;
        const remaining = Math.max(0, SEND_INTERVAL_MS - elapsed);

        if (remaining === 0) {
            if (flushTimer.current) {
                clearTimeout(flushTimer.current);
                flushTimer.current = null;
            }
            flushPendingCode();
            return;
        }

        if (flushTimer.current) return;
        flushTimer.current = setTimeout(() => {
            flushTimer.current = null;
            flushPendingCode();
        }, remaining);
    }, [flushPendingCode]);

    return { connected, remoteCode, sendCode };
}