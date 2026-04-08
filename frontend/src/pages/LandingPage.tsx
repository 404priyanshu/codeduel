import { useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import Spline from "@splinetool/react-spline";
import {
  ArrowRight,
  ChevronDown,
  Code2,
  Eye,
  Globe,
  MonitorPlay,
  Play,
  Shield,
  Sparkles,
  Terminal,
  Users,
  Zap,
} from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/useAuth";

const CODE_LINES = [
  { text: "function", className: "text-violet-300" },
  { text: " twoSum", className: "text-primary" },
  { text: "(nums, target) {", className: "text-slate-200" },
  { text: "  const map = ", className: "text-slate-300" },
  { text: "new", className: "text-violet-300" },
  { text: " Map();", className: "text-slate-200" },
  { text: "  for (let i = 0; i < nums.length; i++) {", className: "text-slate-300" },
  { text: "    const comp = target - nums[i];", className: "text-slate-300" },
  { text: "    if (map.has(comp)) ", className: "text-slate-300" },
  { text: "return", className: "text-violet-300" },
  { text: " [map.get(comp), i];", className: "text-primary" },
  { text: "    map.set(nums[i], i);", className: "text-slate-300" },
  { text: "  }", className: "text-slate-500" },
  { text: "}", className: "text-slate-500" },
];

function AnimatedCodeBlock() {
  return (
    <div className="font-mono text-xs leading-6 sm:text-sm">
      {CODE_LINES.map((line, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 + index * 0.12, duration: 0.28 }}
        >
          <span className="mr-4 inline-block w-5 text-right text-slate-600">
            {index + 1}
          </span>
          <span className={line.className}>{line.text}</span>
          {index === CODE_LINES.length - 1 ? (
            <span className="ml-1 inline-block h-4 w-[7px] animate-pulse rounded-sm bg-primary align-middle" />
          ) : null}
        </motion.div>
      ))}
    </div>
  );
}

function RevealSection({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  badgeVariant,
  delay,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  badgeVariant: "default" | "violet" | "outline";
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay, duration: 0.45 }}
    >
      <Card className="glass-panel h-full border-border/80 transition-transform duration-300 hover:-translate-y-1">
        <CardHeader className="space-y-4">
          <Badge className="w-fit font-mono" variant={badgeVariant}>
            {icon}
            Feature
          </Badge>
          <div className="space-y-2">
            <CardTitle className="font-mono text-lg uppercase">{title}</CardTitle>
            <CardDescription className="text-sm leading-7">
              {description}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </motion.div>
  );
}

function StepCard({
  number,
  title,
  description,
  delay,
}: {
  number: string;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.45 }}
    >
      <Card className="glass-panel h-full border-border/80 text-center">
        <CardHeader className="items-center space-y-4">
          <div className="flex size-14 items-center justify-center rounded-full border border-primary/30 bg-primary/12 font-mono text-lg font-bold text-primary shadow-[0_0_30px_hsl(var(--primary)/0.12)]">
            {number}
          </div>
          <div className="space-y-2">
            <CardTitle className="font-mono text-lg uppercase">{title}</CardTitle>
            <CardDescription className="text-sm leading-7">
              {description}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </motion.div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.96]);

  const ctaAction = () => {
    navigate(!loading && user ? "/dashboard" : "/login");
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/45 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-10">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-primary/30 bg-primary/12 text-primary">
              <Code2 className="size-5" />
            </div>
            <div>
              <div className="font-mono text-lg font-bold tracking-wide text-foreground">
                CODEDUEL
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-muted-foreground">
                Real-time coding interviews
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="hidden font-mono text-xs uppercase tracking-[0.16em] md:inline-flex">
              <a href="#features">Features</a>
            </Button>
            <Button asChild variant="ghost" className="hidden font-mono text-xs uppercase tracking-[0.16em] md:inline-flex">
              <a href="#how-it-works">How it works</a>
            </Button>
            <Button className="font-mono text-xs uppercase tracking-[0.2em]" onClick={ctaAction}>
              {!loading && user ? "Dashboard" : "Get started"}
            </Button>
          </div>
        </div>
      </nav>

      <motion.div
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative flex min-h-screen items-center justify-center pt-16"
      >
        <div className="absolute inset-0 z-0">
          <ErrorBoundary fallback={<div className="absolute inset-0 bg-background" />}>
            <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" />
          </ErrorBoundary>
        </div>
        <div className="surface-grid absolute inset-0 z-[1] opacity-20" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-background/35 via-background/55 to-background" />

        <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-6 py-20 md:px-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16">
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
            >
              <Badge className="mb-6 font-mono" variant="default">
                <Sparkles className="size-3.5" />
                Collaborative coding rooms
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18 }}
              className="text-balance font-mono text-4xl font-bold leading-[1.02] text-foreground sm:text-5xl lg:text-7xl"
            >
              Code together.
              <span className="block bg-gradient-to-r from-primary to-emerald-200 bg-clip-text text-transparent">
                Interview with confidence.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.3 }}
              className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-muted-foreground md:text-base lg:mx-0"
            >
              CodeDuel gives interviewers and candidates a shared Monaco editor,
              synchronized language selection, and a low-friction room flow backed
              by a dedicated collaboration server.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.42 }}
              className="mt-8 flex flex-col items-center gap-4 sm:flex-row lg:justify-start"
            >
              <Button
                size="lg"
                className="font-mono uppercase tracking-[0.2em]"
                onClick={ctaAction}
              >
                <Play className="size-4 fill-current" />
                Start for free
                <ArrowRight className="size-4" />
              </Button>

              <Button asChild variant="ghost" className="font-mono uppercase tracking-[0.18em] text-muted-foreground">
                <a href="#features">
                  Learn more
                  <ChevronDown className="size-4 animate-bounce" />
                </a>
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, delay: 0.35 }}
          >
            <Card className="glass-panel overflow-hidden border-border/80">
              <CardHeader className="border-b border-border/70 bg-background/35 py-4">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-red-400/90" />
                  <div className="size-3 rounded-full bg-amber-300/90" />
                  <div className="size-3 rounded-full bg-primary/90" />
                  <span className="ml-3 font-mono text-xs text-muted-foreground">
                    solution.js — CODEDUEL
                  </span>
                  <Badge className="ml-auto font-mono" variant="success">
                    <Users className="size-3.5" />
                    2 connected
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="bg-[#0d1117] p-5">
                <AnimatedCodeBlock />
              </CardContent>
              <div className="flex items-center justify-between border-t border-border/70 bg-black/25 px-5 py-3">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  JavaScript • UTF-8
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                  Live session
                </span>
              </div>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
        >
          <ChevronDown className="size-6 animate-bounce text-muted-foreground" />
        </motion.div>
      </motion.div>

      <RevealSection id="features" className="relative z-10 py-24 md:py-30">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Badge className="mb-4 font-mono" variant="outline">
              Product features
            </Badge>
            <h2 className="text-balance font-mono text-3xl font-bold text-foreground md:text-4xl">
              Built to keep collaborative interviews fast, focused, and reliable.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              The current product centers on the shared editor workflow and the
              infrastructure that makes that experience stable for two connected users.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <FeatureCard
              icon={<Zap className="size-3.5" />}
              title="Real-time sync"
              description="Yjs CRDT updates keep both participants aligned even during concurrent edits and reconnects."
              badgeVariant="default"
              delay={0}
            />
            <FeatureCard
              icon={<Eye className="size-3.5" />}
              title="Shared visibility"
              description="Both people watch the same editor state live, which makes it easier to assess problem-solving in context."
              badgeVariant="violet"
              delay={0.08}
            />
            <FeatureCard
              icon={<Terminal className="size-3.5" />}
              title="Monaco editing"
              description="The session runs on top of Monaco, giving the experience the familiarity of a modern code editor."
              badgeVariant="outline"
              delay={0.16}
            />
            <FeatureCard
              icon={<Shield className="size-3.5" />}
              title="Protected access"
              description="Cognito-backed authentication protects the main app routes and keeps room entry inside signed-in workflows."
              badgeVariant="default"
              delay={0.24}
            />
            <FeatureCard
              icon={<Globe className="size-3.5" />}
              title="Low-friction rooms"
              description="Create a room instantly or join with a code instead of provisioning a heavy session ahead of time."
              badgeVariant="violet"
              delay={0.32}
            />
            <FeatureCard
              icon={<MonitorPlay className="size-3.5" />}
              title="Synchronized language"
              description="When one participant switches languages, the other editor updates too, keeping the room context consistent."
              badgeVariant="outline"
              delay={0.4}
            />
          </div>
        </div>
      </RevealSection>

      <RevealSection id="how-it-works" className="relative z-10 py-24 md:py-30">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Badge className="mb-4 font-mono" variant="default">
              How it works
            </Badge>
            <h2 className="text-balance font-mono text-3xl font-bold text-foreground md:text-4xl">
              Three steps from dashboard to live room.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              The product stays intentionally simple: create a code, share it, and collaborate in the same editor.
            </p>
          </div>

          <div className="relative grid gap-6 md:grid-cols-3">
            <div className="pointer-events-none absolute top-1/2 left-[16%] right-[16%] hidden -translate-y-1/2 md:block">
              <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            <StepCard
              number="01"
              title="Create room"
              description="The dashboard generates a room code client-side and sends you directly into a fresh session route."
              delay={0}
            />
            <StepCard
              number="02"
              title="Share access"
              description="Send the room code to the other participant so they can join the same collaborative editing space."
              delay={0.12}
            />
            <StepCard
              number="03"
              title="Code live"
              description="Both browsers connect to the collab server, sync the Yjs document, and keep editor state aligned."
              delay={0.24}
            />
          </div>
        </div>
      </RevealSection>

      <RevealSection className="relative z-10 py-24 md:py-30">
        <div className="mx-auto max-w-4xl px-6 md:px-10">
          <Card className="glass-panel overflow-hidden border-border/80 text-center">
            <CardHeader className="relative items-center pb-4">
              <div className="absolute -top-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
              <Badge className="relative mb-4 font-mono" variant="success">
                Ready when you are
              </Badge>
              <CardTitle className="relative text-balance font-mono text-3xl uppercase md:text-4xl">
                Move beyond screen sharing and into a real shared editor.
              </CardTitle>
              <CardDescription className="relative mx-auto max-w-2xl text-sm leading-7">
                CodeDuel is already structured around the collaborative session flow, so you can focus on the interview itself instead of setup overhead.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  size="lg"
                  className="font-mono uppercase tracking-[0.2em]"
                  onClick={ctaAction}
                >
                  {!loading && user ? "Go to dashboard" : "Get started"}
                  <ArrowRight className="size-4" />
                </Button>
                <Button asChild size="lg" variant="outline" className="font-mono uppercase tracking-[0.18em]">
                  <a href="#features">See features</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </RevealSection>

      <footer className="relative z-10 border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row md:px-10">
          <div className="flex items-center gap-2">
            <Code2 className="size-4 text-primary" />
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              CodeDuel — collaborative interview rooms
            </span>
          </div>
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            © {new Date().getFullYear()} CodeDuel
          </span>
        </div>
      </footer>
    </div>
  );
}
