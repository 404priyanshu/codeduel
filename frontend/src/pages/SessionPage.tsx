import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  Code2,
  Loader2,
  UserRound,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import Editor from "@/components/Editor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  getPresenceColor,
  getPresenceName,
  type PresenceParticipant,
} from "@/lib/presence";
import {
  joinRoom,
  normalizeRoomId,
  persistRoomGrant,
  readRoomGrant,
  type RoomGrant,
} from "@/lib/rooms";
import { useAuth } from "@/lib/useAuth";

const LANGUAGES = [
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
  { label: "C++", value: "cpp" },
];

interface SessionLocationState {
  roomGrant?: RoomGrant;
}

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [language, setLanguage] = useState("javascript");
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<PresenceParticipant[]>([]);
  const [roomGrant, setRoomGrant] = useState<RoomGrant | null>(null);
  const [authorizing, setAuthorizing] = useState(false);
  const [authorizationError, setAuthorizationError] = useState("");

  const normalizedRoomId = useMemo(() => {
    if (!id) return null;

    try {
      return normalizeRoomId(id);
    } catch {
      return null;
    }
  }, [id]);

  const locationRoomGrant = useMemo(() => {
    const locationState = location.state as SessionLocationState | null;
    if (locationState?.roomGrant?.roomId === normalizedRoomId) {
      return locationState.roomGrant;
    }

    return null;
  }, [location.state, normalizedRoomId]);

  const cachedRoomGrant = useMemo(() => {
    if (!normalizedRoomId) {
      return null;
    }

    return readRoomGrant(normalizedRoomId);
  }, [normalizedRoomId]);

  const activeRoomGrant =
    roomGrant?.roomId === normalizedRoomId
      ? roomGrant
      : locationRoomGrant ?? cachedRoomGrant;
  const currentPresenceUser = useMemo(() => {
    if (!user || !activeRoomGrant) {
      return null;
    }

    const displayName = getPresenceName(
      user.signInDetails?.loginId,
      user.username
    );

    return {
      userId: user.userId,
      name: displayName,
      role: activeRoomGrant.role,
      color: getPresenceColor(user.userId),
    } as const;
  }, [activeRoomGrant, user]);
  const isAuthorizing =
    !activeRoomGrant &&
    !authorizationError &&
    (authorizing || Boolean(normalizedRoomId));

  useEffect(() => {
    if (!normalizedRoomId) {
      navigate("/dashboard");
      return;
    }

    if (locationRoomGrant) {
      persistRoomGrant(locationRoomGrant);
      return;
    }

    if (cachedRoomGrant || activeRoomGrant) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setAuthorizing(true);
      setAuthorizationError("");

      try {
        const nextGrant = await joinRoom(normalizedRoomId);
        if (cancelled) return;
        setRoomGrant(nextGrant);
        setAuthorizationError("");
      } catch (error) {
        if (cancelled) return;
        setRoomGrant(null);
        setAuthorizationError(
          error instanceof Error
            ? error.message
            : "Unable to authorize access to this room."
        );
      } finally {
        if (!cancelled) {
          setAuthorizing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeRoomGrant, cachedRoomGrant, locationRoomGrant, navigate, normalizedRoomId]);

  const handleConnectionChange = useCallback((isConnected: boolean) => {
    setConnected(isConnected);
  }, []);

  const handleLanguageChange = useCallback((nextLanguage: string) => {
    setLanguage((currentLanguage) =>
      currentLanguage === nextLanguage ? currentLanguage : nextLanguage
    );
  }, []);

  const handlePresenceChange = useCallback((nextParticipants: PresenceParticipant[]) => {
    setParticipants(nextParticipants);
  }, []);

  if (!normalizedRoomId) {
    return null;
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-background">
      <header className="border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="flex min-h-14 items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="font-mono text-xs uppercase tracking-[0.18em] text-primary"
            >
              <Code2 className="size-4" />
              CodeDuel
            </Button>
            <Separator orientation="vertical" className="hidden h-6 md:block" />
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                Session
              </div>
              <div className="truncate font-mono text-sm text-foreground/90">
                {normalizedRoomId}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden max-w-[28rem] items-center gap-2 xl:flex">
              {participants.length > 0 ? (
                participants.map((participant) => (
                  <div
                    key={participant.userId}
                    className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: participant.color }}
                    />
                    <span className="max-w-[10rem] truncate text-foreground/90">
                      {participant.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground/80">
                      {participant.role}
                    </span>
                    {participant.isSelf ? (
                      <span className="text-primary">you</span>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  <UserRound className="size-3.5" />
                  Waiting for participants
                </div>
              )}
            </div>

            <div className="w-40">
              <Select
                value={language}
                onValueChange={handleLanguageChange}
                disabled={isAuthorizing || !activeRoomGrant}
              >
                <SelectTrigger className="h-10 font-mono text-xs uppercase tracking-[0.18em]">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((languageOption) => (
                    <SelectItem
                      key={languageOption.value}
                      value={languageOption.value}
                      className="font-mono text-xs uppercase tracking-[0.16em]"
                    >
                      {languageOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Badge
              className="font-mono"
              variant={isAuthorizing ? "outline" : connected ? "success" : "outline"}
            >
              {isAuthorizing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : connected ? (
                <Wifi className="size-3.5" />
              ) : (
                <WifiOff className="size-3.5" />
              )}
              {isAuthorizing ? "Authorizing" : connected ? "Live" : "Connecting"}
            </Badge>
            <Badge className="font-mono" variant="outline">
              <Users className="size-3.5" />
              {participants.length || (activeRoomGrant ? 1 : 0)}
            </Badge>
          </div>
        </div>
      </header>

      <div className="flex-1 bg-[linear-gradient(180deg,hsl(var(--background)),hsl(224_47%_5%))]">
        {isAuthorizing ? (
          <div className="flex h-full items-center justify-center p-6">
            <Card className="glass-panel w-full max-w-lg border-border/80">
              <CardHeader className="items-center text-center">
                <Badge className="font-mono" variant="outline">
                  <Loader2 className="size-3.5 animate-spin" />
                  Authorizing room
                </Badge>
                <CardTitle className="font-mono text-2xl uppercase">
                  Validating access
                </CardTitle>
                <CardDescription className="max-w-md text-sm leading-7">
                  The collaboration server is verifying your room membership and
                  issuing a signed room access token before the editor connects.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        ) : authorizationError ? (
          <div className="flex h-full items-center justify-center p-6">
            <Card className="glass-panel w-full max-w-xl border-border/80">
              <CardHeader className="space-y-4">
                <Badge className="w-fit font-mono" variant="outline">
                  Room access failed
                </Badge>
                <div className="space-y-2">
                  <CardTitle className="font-mono text-2xl uppercase">
                    We could not authorize this room.
                  </CardTitle>
                  <CardDescription className="text-sm leading-7">
                    This room may not exist anymore, may have expired, or your
                    session could not be verified by the collaboration server.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <Alert variant="destructive">
                  <AlertDescription className="flex items-start gap-3 font-mono text-xs">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{authorizationError}</span>
                  </AlertDescription>
                </Alert>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    className="font-mono uppercase tracking-[0.18em]"
                    onClick={() => navigate("/dashboard")}
                  >
                    Back to dashboard
                  </Button>
                  <Button
                    variant="outline"
                    className="font-mono uppercase tracking-[0.18em]"
                    onClick={() => window.location.reload()}
                  >
                    Retry authorization
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : activeRoomGrant ? (
          <Editor
            currentUser={currentPresenceUser}
            sessionId={normalizedRoomId}
            roomAccessToken={activeRoomGrant.roomAccessToken}
            language={language}
            onConnectionChange={handleConnectionChange}
            onLanguageChange={handleLanguageChange}
            onPresenceChange={handlePresenceChange}
          />
        ) : null}
      </div>

      <footer className="border-t border-border/70 bg-card/55 px-4 py-2 md:px-6">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {isAuthorizing
              ? "Waiting for server-backed room authorization."
              : connected
                ? "Connected. Editor, language, and presence sync in real time."
                : "Room authorized. Connecting to collaboration server."}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {participants.length > 0
              ? `${participants.length} participant${participants.length === 1 ? "" : "s"} in room`
              : "No presence detected yet"}
          </span>
        </div>
      </footer>
    </div>
  );
}
