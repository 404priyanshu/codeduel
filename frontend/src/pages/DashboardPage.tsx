import { useState } from "react";
import { signOut } from "aws-amplify/auth";
import Spline from "@splinetool/react-spline";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Code2,
  Copy,
  LogOut,
  MonitorPlay,
  Play,
  Sparkles,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/useAuth";

function generateSessionId() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");

  const handleCreate = () => {
    navigate(`/session/${generateSessionId()}`);
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    navigate(`/session/${joinCode.trim().toUpperCase()}`);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 z-0 opacity-80">
        <ErrorBoundary fallback={<div className="absolute inset-0 bg-background" />}>
          <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" />
        </ErrorBoundary>
      </div>
      <div className="surface-grid absolute inset-0 z-0 opacity-20" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_28%),linear-gradient(180deg,hsl(var(--background)/0.58),hsl(var(--background)/0.92)_75%)]" />

      <header className="relative z-10 border-b border-border/70 bg-background/40 backdrop-blur-2xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6 md:px-10">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-primary/30 bg-primary/12 text-primary">
              <Code2 className="size-5" />
            </div>
            <div>
              <div className="font-mono text-lg font-bold tracking-wide text-foreground">
                CODEDUEL
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Collaboration dashboard
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge className="hidden font-mono md:inline-flex" variant="outline">
              {user?.signInDetails?.loginId ?? user?.username}
            </Badge>
            <Button
              variant="ghost"
              className="font-mono text-xs uppercase tracking-[0.2em]"
              onClick={handleSignOut}
            >
              <span>Sign out</span>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-7xl flex-col px-6 py-12 md:px-10 md:py-16">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-10 max-w-3xl"
        >
          <Badge className="mb-5 font-mono" variant="default">
            <Sparkles className="size-3.5" />
            Room control center
          </Badge>
          <h1 className="text-balance font-mono text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Launch or join a live coding room in seconds.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            Start a fresh interview session for an interviewer workflow, or jump
            into an existing room with a shared code. The underlying editor stays
            synced in real time through the collaboration server.
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="grid gap-6 lg:grid-cols-[1fr_auto_1fr]"
        >
          <Card className="glass-panel overflow-hidden border-border/80">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className="font-mono" variant="default">
                  Interviewer
                </Badge>
                <div className="flex size-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                  <MonitorPlay className="size-5" />
                </div>
              </div>
              <div className="space-y-2">
                <CardTitle className="font-mono text-2xl uppercase">
                  Create session
                </CardTitle>
                <CardDescription className="max-w-md text-sm leading-7">
                  Generate a room code instantly and share it with a candidate.
                  The editor is ready immediately, with persistence and reconnect
                  support already in place.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Includes
                </div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  <div>Shared Monaco editor with Yjs sync</div>
                  <div>Language selection synchronized across clients</div>
                  <div>Persistent room snapshots on the collab server</div>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full font-mono uppercase tracking-[0.2em]"
                onClick={handleCreate}
              >
                <Play className="size-4 fill-current" />
                Start new room
              </Button>
            </CardContent>
          </Card>

          <div className="hidden items-center justify-center lg:flex">
            <Separator
              orientation="vertical"
              className="h-48 bg-gradient-to-b from-transparent via-border to-transparent"
            />
          </div>

          <Card className="glass-panel overflow-hidden border-border/80">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className="font-mono" variant="violet">
                  Candidate
                </Badge>
                <div className="flex size-11 items-center justify-center rounded-2xl border border-violet-500/25 bg-violet-500/10 text-violet-300">
                  <Users className="size-5" />
                </div>
              </div>
              <div className="space-y-2">
                <CardTitle className="font-mono text-2xl uppercase">
                  Join session
                </CardTitle>
                <CardDescription className="max-w-md text-sm leading-7">
                  Enter the 8-character room code from your interviewer and land
                  directly inside the live collaborative editor.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
                <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Session code
                </div>
                <div className="relative">
                  <Code2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="SESSION CODE"
                    value={joinCode}
                    onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleJoin();
                      }
                    }}
                    className="h-12 pl-10 font-mono tracking-[0.3em] uppercase"
                    maxLength={8}
                  />
                </div>
              </div>

              <Button
                size="lg"
                variant="secondary"
                className="w-full bg-violet-500/90 font-mono uppercase tracking-[0.2em] text-white hover:bg-violet-400"
                onClick={handleJoin}
                disabled={!joinCode.trim()}
              >
                <Copy className="size-4" />
                Connect to room
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.section>
      </main>
    </div>
  );
}
