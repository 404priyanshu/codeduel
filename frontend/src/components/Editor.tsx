import MonacoEditor, { type OnMount } from "@monaco-editor/react";
import { useRef, useEffect, useState } from "react";
import type * as monacoType from "monaco-editor";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";

interface Props {
    sessionId: string;
    language?: string;
    onConnectionChange?: (connected: boolean) => void;
    onLanguageChange?: (language: string) => void;
}

export default function Editor({
    sessionId,
    language = "javascript",
    onConnectionChange,
    onLanguageChange,
}: Props) {
    const editorRef = useRef<monacoType.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monacoType | null>(null);
    const docRef = useRef<Y.Doc | null>(null);
    const providerRef = useRef<WebsocketProvider | null>(null);
    const bindingRef = useRef<MonacoBinding | null>(null);
    const sessionStateRef = useRef<Y.Map<string> | null>(null);
    const editorDisposables = useRef<monacoType.IDisposable[]>([]);
    const syncedRef = useRef(false);
    const languageRef = useRef(language);
    const onLanguageChangeRef = useRef(onLanguageChange);
    const [isEditorReady, setIsEditorReady] = useState(false);

    useEffect(() => {
        languageRef.current = language;
        onLanguageChangeRef.current = onLanguageChange;
    }, [language, onLanguageChange]);

    const handleMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        setIsEditorReady(true);
    };

    useEffect(() => {
        if (!isEditorReady) return;

        const editor = editorRef.current;
        const wsUrl = import.meta.env.VITE_COLLAB_WS_URL || "ws://localhost:1234";
        if (!editor) return;
        const model = editor.getModel();
        if (!model) return;

        const doc = new Y.Doc();
        const yText = doc.getText("monaco");
        const sessionState = doc.getMap<string>("session");
        const provider = new WebsocketProvider(wsUrl, sessionId, doc, {
            maxBackoffTime: 1500,
            resyncInterval: 5000,
        });
        const binding = new MonacoBinding(yText, model, new Set([editor]));

        let socketConnected = false;
        let docSynced = false;
        const emitConnectionState = () => {
            onConnectionChange?.(socketConnected && docSynced);
        };

        const statusListener = ({
            status,
        }: {
            status: "connected" | "disconnected" | "connecting";
        }) => {
            socketConnected = status === "connected";
            if (status !== "connected") {
                docSynced = false;
            }
            emitConnectionState();
        };
        const syncListener = (synced: boolean) => {
            docSynced = synced;
            syncedRef.current = synced;
            if (synced) {
                const sharedLanguage = sessionState.get("language");
                if (typeof sharedLanguage === "string" && sharedLanguage.length > 0) {
                    if (sharedLanguage !== languageRef.current) {
                        onLanguageChangeRef.current?.(sharedLanguage);
                    }
                } else {
                    sessionState.set("language", languageRef.current);
                }
            }
            emitConnectionState();
        };
        const disconnectListener = () => {
            socketConnected = false;
            docSynced = false;
            syncedRef.current = false;
            emitConnectionState();
        };
        const sessionStateListener = () => {
            const sharedLanguage = sessionState.get("language");
            if (
                typeof sharedLanguage === "string" &&
                sharedLanguage.length > 0 &&
                sharedLanguage !== languageRef.current
            ) {
                onLanguageChangeRef.current?.(sharedLanguage);
            }
        };

        provider.on("status", statusListener);
        provider.on("sync", syncListener);
        provider.on("connection-error", disconnectListener);
        provider.on("connection-close", disconnectListener);
        sessionState.observe(sessionStateListener);

        docRef.current = doc;
        providerRef.current = provider;
        bindingRef.current = binding;
        sessionStateRef.current = sessionState;
        editorDisposables.current.push({
            dispose: () => provider.off("status", statusListener),
        });
        editorDisposables.current.push({
            dispose: () => provider.off("sync", syncListener),
        });
        editorDisposables.current.push({
            dispose: () => provider.off("connection-error", disconnectListener),
        });
        editorDisposables.current.push({
            dispose: () => provider.off("connection-close", disconnectListener),
        });
        editorDisposables.current.push({
            dispose: () => sessionState.unobserve(sessionStateListener),
        });

        return () => {
            editorDisposables.current.forEach((d) => d.dispose());
            editorDisposables.current = [];
            bindingRef.current?.destroy();
            providerRef.current?.destroy();
            docRef.current?.destroy();
            bindingRef.current = null;
            providerRef.current = null;
            docRef.current = null;
            sessionStateRef.current = null;
            onConnectionChange?.(false);
        };
    }, [isEditorReady, sessionId, onConnectionChange]);

    useEffect(() => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        const model = editor?.getModel();
        if (!editor || !monaco || !model) return;
        monaco.editor.setModelLanguage(model, language);
    }, [language]);

    useEffect(() => {
        const sessionState = sessionStateRef.current;
        if (!sessionState || !syncedRef.current) return;
        if (sessionState.get("language") === language) return;
        sessionState.set("language", language);
    }, [language]);

    return (
        <MonacoEditor
            height="100%"
            theme="vs-dark"
            language={language}
            onMount={handleMount}
            options={{
                automaticLayout: true,
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
            }}
        />
    );
}
