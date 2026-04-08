import MonacoEditor, { type OnMount } from "@monaco-editor/react";
import { useRef, useEffect, useState } from "react";
import type * as monacoType from "monaco-editor";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import type { EditorPresenceUser, PresenceParticipant } from "@/lib/presence";

interface Props {
    sessionId: string;
    roomAccessToken: string;
    currentUser?: EditorPresenceUser | null;
    language?: string;
    onConnectionChange?: (connected: boolean) => void;
    onLanguageChange?: (language: string) => void;
    onPresenceChange?: (participants: PresenceParticipant[]) => void;
}

export default function Editor({
    sessionId,
    roomAccessToken,
    currentUser,
    language = "javascript",
    onConnectionChange,
    onLanguageChange,
    onPresenceChange,
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
    const onPresenceChangeRef = useRef(onPresenceChange);
    const currentUserRef = useRef(currentUser);
    const [isEditorReady, setIsEditorReady] = useState(false);

    useEffect(() => {
        languageRef.current = language;
        onLanguageChangeRef.current = onLanguageChange;
        onPresenceChangeRef.current = onPresenceChange;
        currentUserRef.current = currentUser;
    }, [currentUser, language, onLanguageChange, onPresenceChange]);

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
            params: {
                roomAccessToken,
            },
            resyncInterval: 5000,
        });
        const styleElement = document.createElement("style");
        styleElement.setAttribute("data-codeduel-presence", sessionId);
        document.head.appendChild(styleElement);
        const binding = new MonacoBinding(
            yText,
            model,
            new Set([editor]),
            provider.awareness
        );

        let socketConnected = false;
        let docSynced = false;
        const emitConnectionState = () => {
            onConnectionChange?.(socketConnected && docSynced);
        };
        const emitPresenceState = () => {
            const aggregatedParticipants = new Map<string, PresenceParticipant>();
            const styleRules = [
                ".monaco-editor .yRemoteSelection { border-radius: 3px; }",
                ".monaco-editor .yRemoteSelectionHead::after, .monaco-editor .yRemoteSelectionHead::before { content: ''; position: absolute; top: 0; bottom: 0; width: 2px; }",
            ];

            provider.awareness.getStates().forEach((state, clientId) => {
                const user = state.user as EditorPresenceUser | undefined;
                if (!user || typeof user.userId !== "string" || typeof user.name !== "string") {
                    return;
                }

                styleRules.push(
                    `.monaco-editor .yRemoteSelection-${clientId} { background-color: ${user.color}2e; border-left: 2px solid ${user.color}; }`,
                    `.monaco-editor .yRemoteSelectionHead-${clientId}::after, .monaco-editor .yRemoteSelectionHead-${clientId}::before { border-left: 2px solid ${user.color}; margin-left: -1px; }`
                );

                const participantKey = user.userId;
                const existingParticipant = aggregatedParticipants.get(participantKey);

                if (existingParticipant) {
                    existingParticipant.clientIds.push(clientId);
                    return;
                }

                aggregatedParticipants.set(participantKey, {
                    ...user,
                    clientIds: [clientId],
                    isSelf: participantKey === currentUserRef.current?.userId,
                });
            });

            styleElement.textContent = styleRules.join("\n");
            onPresenceChangeRef.current?.(
                Array.from(aggregatedParticipants.values()).sort((left, right) => {
                    if (left.isSelf && !right.isSelf) return -1;
                    if (!left.isSelf && right.isSelf) return 1;
                    if (left.role !== right.role) {
                        return left.role === "owner" ? -1 : 1;
                    }
                    return left.name.localeCompare(right.name);
                })
            );
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
        const awarenessListener = () => {
            emitPresenceState();
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
                emitPresenceState();
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
        provider.awareness.on("change", awarenessListener);
        sessionState.observe(sessionStateListener);
        if (currentUserRef.current) {
            provider.awareness.setLocalStateField("user", currentUserRef.current);
        }
        emitPresenceState();

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
            dispose: () => provider.awareness.off("change", awarenessListener),
        });
        editorDisposables.current.push({
            dispose: () => sessionState.unobserve(sessionStateListener),
        });

        return () => {
            editorDisposables.current.forEach((d) => d.dispose());
            editorDisposables.current = [];
            provider.awareness.setLocalState(null);
            styleElement.remove();
            bindingRef.current?.destroy();
            providerRef.current?.destroy();
            docRef.current?.destroy();
            bindingRef.current = null;
            providerRef.current = null;
            docRef.current = null;
            sessionStateRef.current = null;
            onConnectionChange?.(false);
            onPresenceChangeRef.current?.([]);
        };
    }, [currentUser, isEditorReady, onConnectionChange, roomAccessToken, sessionId]);

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

    useEffect(() => {
        const provider = providerRef.current;
        if (!provider || !currentUser) return;
        provider.awareness.setLocalStateField("user", currentUser);
    }, [currentUser]);

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
