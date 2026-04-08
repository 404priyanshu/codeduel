import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Code2, Wifi, WifiOff } from "lucide-react";
import Editor from "@/components/Editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const LANGUAGES = [
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
  { label: "C++", value: "cpp" },
];

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [language, setLanguage] = useState("javascript");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!id) {
      navigate("/dashboard");
    }
  }, [id, navigate]);

  const handleConnectionChange = useCallback((isConnected: boolean) => {
    setConnected(isConnected);
  }, []);

  const handleLanguageChange = useCallback((nextLanguage: string) => {
    setLanguage((currentLanguage) =>
      currentLanguage === nextLanguage ? currentLanguage : nextLanguage
    );
  }, []);

  if (!id) return null;

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
              <div className="truncate font-mono text-sm text-foreground/90">{id}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-40">
              <Select value={language} onValueChange={handleLanguageChange}>
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

            <Badge className="font-mono" variant={connected ? "success" : "outline"}>
              {connected ? (
                <Wifi className="size-3.5" />
              ) : (
                <WifiOff className="size-3.5" />
              )}
              {connected ? "Live" : "Connecting"}
            </Badge>
          </div>
        </div>
      </header>

      <div className="flex-1 bg-[linear-gradient(180deg,hsl(var(--background)),hsl(224_47%_5%))]">
        <Editor
          sessionId={id}
          language={language}
          onConnectionChange={handleConnectionChange}
          onLanguageChange={handleLanguageChange}
        />
      </div>

      <footer className="border-t border-border/70 bg-card/55 px-4 py-2 md:px-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {connected
            ? "Connected. Editor and language changes sync in real time."
            : "Reconnecting to collaboration server."}
        </span>
      </footer>
    </div>
  );
}
