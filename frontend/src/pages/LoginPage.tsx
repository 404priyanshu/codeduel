import { useState, type FormEvent } from "react";
import {
  confirmSignUp,
  signIn,
  signInWithRedirect,
  signUp,
} from "aws-amplify/auth";
import { Navigate, useNavigate } from "react-router-dom";
import Spline from "@splinetool/react-spline";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Code2,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { googleAuthEnabled } from "@/lib/auth";
import { useAuth } from "@/lib/useAuth";

type Mode = "login" | "signup" | "confirm";
type AuthError = {
  message?: string;
};

const modeCopy: Record<
  Mode,
  {
    eyebrow: string;
    title: string;
    description: string;
    submit: string;
    google?: string;
  }
> = {
  login: {
    eyebrow: "Secure access",
    title: "Welcome back",
    description: "Sign in to create rooms, join interviews, and keep your sessions protected.",
    submit: "Sign in",
    google: "Continue with Google",
  },
  signup: {
    eyebrow: "Create account",
    title: "Start using CodeDuel",
    description: "Create a Cognito-backed account to launch collaborative interview rooms in seconds.",
    submit: "Create account",
    google: "Sign up with Google",
  },
  confirm: {
    eyebrow: "Verify email",
    title: "Enter your confirmation code",
    description: "Check your inbox and paste the verification code to activate your account.",
    submit: "Verify account",
  },
};

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (authLoading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (event?: FormEvent) => {
    event?.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await signIn({ username: email, password });
      navigate("/dashboard");
    } catch (nextError) {
      setError((nextError as AuthError).message ?? "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (event?: FormEvent) => {
    event?.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await signUp({ username: email, password });
      setMode("confirm");
    } catch (nextError) {
      setError((nextError as AuthError).message ?? "Unable to create your account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (event?: FormEvent) => {
    event?.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      setMode("login");
    } catch (nextError) {
      setError((nextError as AuthError).message ?? "Unable to verify your account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setError("");

    try {
      await signInWithRedirect({ provider: "Google" });
    } catch (nextError) {
      setError((nextError as AuthError).message ?? "Unable to start Google sign-in.");
      setSubmitting(false);
    }
  };

  const currentMode = modeCopy[mode];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-10">
      <div className="absolute inset-0 z-0">
        <ErrorBoundary fallback={<div className="absolute inset-0 bg-background" />}>
          <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" />
        </ErrorBoundary>
      </div>
      <div className="surface-grid absolute inset-0 z-0 opacity-25" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_28%),linear-gradient(180deg,hsl(var(--background)/0.2),hsl(var(--background)/0.92)_72%)]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="glass-panel overflow-hidden border-border/90">
          <CardHeader className="space-y-6 pb-6 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/12 text-primary shadow-[0_0_30px_hsl(var(--primary)/0.18)]">
              <Code2 className="size-8" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-center">
                <Badge className="font-mono" variant="outline">
                  {currentMode.eyebrow}
                </Badge>
              </div>
              <CardTitle className="font-mono text-3xl uppercase tracking-tight">
                CODEDUEL
              </CardTitle>
              <CardDescription className="text-balance font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground/90">
                {currentMode.title}
              </CardDescription>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
                {currentMode.description}
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.form
                key={mode}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
                onSubmit={
                  mode === "login"
                    ? handleLogin
                    : mode === "signup"
                      ? handleSignup
                      : handleConfirm
                }
              >
                {error ? (
                  <Alert variant="destructive">
                    <AlertDescription className="flex items-start gap-3 font-mono text-xs">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      <span>{error}</span>
                    </AlertDescription>
                  </Alert>
                ) : null}

                {mode !== "confirm" ? (
                  <>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="h-12 pl-10 font-mono text-sm"
                        required
                      />
                    </div>

                    <div className="relative">
                      <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="h-12 pl-10 font-mono text-sm"
                        required
                      />
                    </div>
                  </>
                ) : (
                  <div className="relative">
                    <CheckCircle2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Verification code"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      className="h-12 pl-10 text-center font-mono tracking-[0.35em]"
                      required
                    />
                  </div>
                )}

                {mode !== "confirm" && googleAuthEnabled ? (
                  <div className="space-y-3 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 w-full font-mono tracking-[0.16em] uppercase"
                      disabled={submitting}
                      onClick={handleGoogleSignIn}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.2-1.8 2.9l3 2.3c1.7-1.6 2.7-3.9 2.7-6.7 0-.6-.1-1.2-.2-1.8H12Z" />
                        <path fill="#34A853" d="M12 21c2.4 0 4.4-.8 5.9-2.1l-3-2.3c-.8.6-1.8 1-2.9 1-2.2 0-4.1-1.5-4.8-3.5l-3.1 2.4C5.6 19.3 8.6 21 12 21Z" />
                        <path fill="#4A90E2" d="M7.2 14.1c-.2-.6-.3-1.3-.3-2.1s.1-1.4.3-2.1l-3.1-2.4C3.4 8.9 3 10.4 3 12s.4 3.1 1.1 4.5l3.1-2.4Z" />
                        <path fill="#FBBC05" d="M12 6.4c1.3 0 2.5.5 3.4 1.3l2.5-2.5C16.3 3.7 14.3 3 12 3 8.6 3 5.6 4.7 4.1 7.5l3.1 2.4c.7-2 2.6-3.5 4.8-3.5Z" />
                      </svg>
                      {currentMode.google}
                    </Button>

                    <div className="flex items-center gap-3">
                      <Separator className="flex-1" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                        or
                      </span>
                      <Separator className="flex-1" />
                    </div>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  className="h-12 w-full font-mono tracking-[0.18em] uppercase"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      {currentMode.submit}
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </motion.form>
            </AnimatePresence>

            <div className="space-y-3 pt-2 text-center">
              <Separator />
              <p className="font-mono text-xs text-muted-foreground">
                {mode === "login"
                  ? "Need an account?"
                  : mode === "signup"
                    ? "Already registered?"
                    : "Want to return to sign in?"}
                <Button
                  type="button"
                  variant="link"
                  className="ml-1 h-auto px-0 font-mono text-xs uppercase tracking-[0.16em]"
                  onClick={() =>
                    setMode(
                      mode === "login" ? "signup" : "login"
                    )
                  }
                >
                  {mode === "login"
                    ? "Create one"
                    : mode === "signup"
                      ? "Sign in"
                      : "Back to login"}
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
