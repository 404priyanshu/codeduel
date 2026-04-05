import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import Spline from "@splinetool/react-spline";
import {
    Code2,
    ArrowRight,
    Zap,
    Shield,
    Globe,
    Users,
    Terminal,
    Eye,
    ChevronDown,
    Play,
    Sparkles,
    MonitorPlay,
} from "lucide-react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { useAuth } from "../lib/useAuth";

/* ------------------------------------------------------------------ */
/*  Animated code block that types itself                              */
/* ------------------------------------------------------------------ */
const CODE_LINES = [
    { text: "function", cls: "text-purple-400" },
    { text: " twoSum", cls: "text-green-400" },
    { text: "(nums, target) {", cls: "text-gray-300" },
    { text: "  const map = ", cls: "text-gray-300" },
    { text: "new", cls: "text-purple-400" },
    { text: " Map();", cls: "text-gray-300" },
    { text: "  for (let i = 0; i < nums.length; i++) {", cls: "text-gray-300" },
    { text: "    const comp = target - nums[i];", cls: "text-gray-300" },
    { text: "    if (map.has(comp)) ", cls: "text-gray-300" },
    { text: "return", cls: "text-purple-400" },
    { text: " [map.get(comp), i];", cls: "text-green-400" },
    { text: "    map.set(nums[i], i);", cls: "text-gray-300" },
    { text: "  }", cls: "text-gray-500" },
    { text: "}", cls: "text-gray-500" },
];

function AnimatedCodeBlock() {
    return (
        <div className="font-mono text-xs sm:text-sm leading-6 select-none">
            {CODE_LINES.map((line, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.12, duration: 0.3 }}
                >
                    <span className="text-gray-600 mr-4 select-none inline-block w-5 text-right">
                        {i + 1}
                    </span>
                    <span className={line.cls}>{line.text}</span>
                    {/* blinking cursor on last visible line */}
                    {i === CODE_LINES.length - 1 && (
                        <span className="inline-block w-[7px] h-4 bg-green-400 ml-1 animate-pulse rounded-sm align-middle" />
                    )}
                </motion.div>
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper with scroll-triggered reveal                      */
/* ------------------------------------------------------------------ */
function RevealSection({
    children,
    className = "",
    id,
}: {
    children: React.ReactNode;
    className?: string;
    id?: string;
}) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <motion.section
            ref={ref}
            id={id}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className={className}
        >
            {children}
        </motion.section>
    );
}

/* ------------------------------------------------------------------ */
/*  Feature card                                                       */
/* ------------------------------------------------------------------ */
interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    accent: string; // tailwind color token like "green" or "purple"
    delay?: number;
}

function FeatureCard({ icon, title, description, accent, delay = 0 }: FeatureCardProps) {
    const borderHover = accent === "green" ? "hover:border-green-500/40" : accent === "purple" ? "hover:border-purple-500/40" : "hover:border-cyan-500/40";
    const iconBg = accent === "green" ? "bg-green-500/10 text-green-400 border-green-500/20" : accent === "purple" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay, duration: 0.5, ease: "easeOut" }}
            className={`glass-panel rounded-2xl p-6 md:p-8 border border-white/5 ${borderHover} transition-all duration-300 group`}
        >
            <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center mb-5 border group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
            <h3 className="text-white font-mono font-bold text-base mb-2">{title}</h3>
            <p className="text-gray-400 font-mono text-sm leading-relaxed">{description}</p>
        </motion.div>
    );
}

/* ------------------------------------------------------------------ */
/*  Step card (How it works)                                           */
/* ------------------------------------------------------------------ */
function StepCard({
    number,
    title,
    description,
    delay = 0,
}: {
    number: string;
    title: string;
    description: string;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.5 }}
            className="relative flex flex-col items-center text-center"
        >
            <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-5 text-green-400 font-mono font-bold text-xl shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                {number}
            </div>
            <h3 className="text-white font-mono font-bold text-base mb-2">{title}</h3>
            <p className="text-gray-400 font-mono text-sm leading-relaxed max-w-xs">{description}</p>
        </motion.div>
    );
}

/* ================================================================== */
/*  LANDING PAGE                                                       */
/* ================================================================== */
export default function LandingPage() {
    const navigate = useNavigate();
    const { user, loading } = useAuth();
    const heroRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll();
    const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.96]);

    const ctaAction = () => {
        if (!loading && user) {
            navigate("/dashboard");
        } else {
            navigate("/login");
        }
    };

    return (
        <div className="relative min-h-screen w-full bg-gray-950 overflow-x-hidden">
            {/* ============ NAVBAR ============ */}
            <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-gray-950/60 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6 md:px-12">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/30">
                            <Code2 size={18} />
                        </div>
                        <span className="text-white font-mono font-bold text-lg tracking-wide">
                            CODEDUEL
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <a
                            href="#features"
                            className="hidden md:inline-block text-gray-400 hover:text-white font-mono text-xs tracking-wide transition-colors px-3 py-1"
                        >
                            FEATURES
                        </a>
                        <a
                            href="#how-it-works"
                            className="hidden md:inline-block text-gray-400 hover:text-white font-mono text-xs tracking-wide transition-colors px-3 py-1"
                        >
                            HOW IT WORKS
                        </a>
                        <button
                            onClick={ctaAction}
                            className="bg-green-500 hover:bg-green-400 text-black font-mono font-bold text-xs py-2 px-5 rounded-lg transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)] hover:shadow-[0_0_25px_rgba(34,197,94,0.4)]"
                        >
                            {!loading && user ? "DASHBOARD" : "GET STARTED"}
                        </button>
                    </div>
                </div>
            </nav>

            {/* ============ HERO ============ */}
            <motion.div
                ref={heroRef}
                style={{ opacity: heroOpacity, scale: heroScale }}
                className="relative min-h-screen flex items-center justify-center pt-16"
            >
                {/* Spline 3D background */}
                <div className="absolute inset-0 z-0">
                    <ErrorBoundary fallback={<div className="absolute inset-0 bg-gray-950" />}>
                        <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" />
                    </ErrorBoundary>
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-gray-950/40 via-gray-950/60 to-gray-950 z-[1] pointer-events-none" />

                <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-20 px-6 md:px-12 py-20">
                    {/* Left: Copy */}
                    <div className="flex-1 text-center lg:text-left">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.1 }}
                        >
                            <span className="inline-flex items-center gap-2 bg-green-500/10 text-green-400 font-mono text-xs tracking-widest px-4 py-1.5 rounded-full border border-green-500/20 mb-6">
                                <Sparkles size={14} />
                                REAL-TIME COLLABORATIVE CODING
                            </span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.25 }}
                            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white font-mono font-bold leading-[1.1] mb-6"
                        >
                            Code together.{" "}
                            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                                Hire smarter.
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.4 }}
                            className="text-gray-400 font-mono text-sm md:text-base leading-relaxed max-w-lg mx-auto lg:mx-0 mb-10"
                        >
                            A zero-friction live coding environment built for technical interviews.
                            Watch candidates think in real time — no downloads, no setup, no distractions.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.55 }}
                            className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
                        >
                            <button
                                onClick={ctaAction}
                                className="group bg-green-500 hover:bg-green-400 text-black font-mono font-bold text-sm py-3.5 px-8 rounded-xl transition-all shadow-[0_0_25px_rgba(34,197,94,0.25)] hover:shadow-[0_0_35px_rgba(34,197,94,0.5)] flex items-center"
                            >
                                <Play size={16} fill="currentColor" className="mr-2" />
                                START FOR FREE
                                <ArrowRight
                                    size={16}
                                    className="ml-2 group-hover:translate-x-1 transition-transform"
                                />
                            </button>
                            <a
                                href="#features"
                                className="text-gray-400 hover:text-white font-mono text-sm flex items-center gap-2 transition-colors"
                            >
                                Learn more
                                <ChevronDown size={16} className="animate-bounce" />
                            </a>
                        </motion.div>
                    </div>

                    {/* Right: Animated code editor preview */}
                    <motion.div
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className="flex-1 max-w-xl w-full"
                    >
                        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/50">
                            {/* Window chrome */}
                            <div className="flex items-center gap-2 px-4 py-3 bg-black/40 border-b border-white/5">
                                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                <span className="ml-3 text-gray-500 font-mono text-xs">
                                    solution.js — CODEDUEL
                                </span>
                                <div className="ml-auto flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                    <span className="text-gray-500 font-mono text-[10px]">LIVE</span>
                                </div>
                            </div>
                            {/* Code area */}
                            <div className="p-5 bg-[#0d1117]">
                                <AnimatedCodeBlock />
                            </div>
                            {/* Status bar */}
                            <div className="flex items-center justify-between px-4 py-2 bg-black/30 border-t border-white/5">
                                <span className="text-gray-600 font-mono text-[10px]">
                                    JavaScript • UTF-8
                                </span>
                                <span className="text-green-500/70 font-mono text-[10px] flex items-center gap-1">
                                    <Users size={10} /> 2 connected
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Scroll indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
                >
                    <ChevronDown size={24} className="text-gray-600 animate-bounce" />
                </motion.div>
            </motion.div>

            {/* ============ FEATURES ============ */}
            <RevealSection id="features" className="relative z-10 py-24 md:py-32">
                <div className="max-w-7xl mx-auto px-6 md:px-12">
                    <div className="text-center mb-16">
                        <span className="text-green-400 font-mono text-xs tracking-widest font-bold mb-3 block">
                            FEATURES
                        </span>
                        <h2 className="text-3xl md:text-4xl text-white font-mono font-bold mb-4">
                            Everything you need to assess talent
                        </h2>
                        <p className="text-gray-400 font-mono text-sm max-w-lg mx-auto">
                            Designed from the ground up for a seamless, distraction-free interview experience.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureCard
                            icon={<Zap size={22} />}
                            title="Real-Time Sync"
                            description="Sub-100ms WebSocket latency. Every keystroke arrives instantly — no lag, no drift, no stale state."
                            accent="green"
                            delay={0}
                        />
                        <FeatureCard
                            icon={<Eye size={22} />}
                            title="Live Observer Mode"
                            description="Watch candidates code in real time. See their thought process unfold as they work through problems."
                            accent="purple"
                            delay={0.1}
                        />
                        <FeatureCard
                            icon={<Terminal size={22} />}
                            title="Monaco Editor"
                            description="Full VS Code editing experience. Syntax highlighting, autocomplete, and multi-language support built in."
                            accent="cyan"
                            delay={0.2}
                        />
                        <FeatureCard
                            icon={<Shield size={22} />}
                            title="Secure Sessions"
                            description="Unique room codes, authenticated access, and encrypted WebSocket connections keep sessions private."
                            accent="green"
                            delay={0.3}
                        />
                        <FeatureCard
                            icon={<Globe size={22} />}
                            title="Zero Setup"
                            description="No downloads. No extensions. No configuration. Share a link, and your candidate is coding in seconds."
                            accent="purple"
                            delay={0.4}
                        />
                        <FeatureCard
                            icon={<MonitorPlay size={22} />}
                            title="Multi-Language"
                            description="JavaScript, TypeScript, Python, Java, C++ — candidates pick their language of choice without restriction."
                            accent="cyan"
                            delay={0.5}
                        />
                    </div>
                </div>
            </RevealSection>

            {/* ============ HOW IT WORKS ============ */}
            <RevealSection id="how-it-works" className="relative z-10 py-24 md:py-32">
                <div className="max-w-5xl mx-auto px-6 md:px-12">
                    <div className="text-center mb-16">
                        <span className="text-green-400 font-mono text-xs tracking-widest font-bold mb-3 block">
                            HOW IT WORKS
                        </span>
                        <h2 className="text-3xl md:text-4xl text-white font-mono font-bold mb-4">
                            Three steps to a better interview
                        </h2>
                        <p className="text-gray-400 font-mono text-sm max-w-lg mx-auto">
                            From room creation to live collaboration in under 30 seconds.
                        </p>
                    </div>

                    <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
                        {/* Connecting line (desktop only) */}
                        <div className="hidden md:block absolute top-7 left-[16.5%] right-[16.5%] h-[1px] bg-gradient-to-r from-green-500/30 via-green-500/20 to-green-500/30" />

                        <StepCard
                            number="01"
                            title="Create a Room"
                            description="Hit 'Start New Room' from your dashboard. A unique session code is generated instantly."
                            delay={0}
                        />
                        <StepCard
                            number="02"
                            title="Share the Code"
                            description="Send the 8-character room code to your candidate. They enter it and connect in one click."
                            delay={0.15}
                        />
                        <StepCard
                            number="03"
                            title="Code Together"
                            description="Both of you see every keystroke in real time. Ask questions, watch their approach, assess live."
                            delay={0.3}
                        />
                    </div>
                </div>
            </RevealSection>

            {/* ============ CTA ============ */}
            <RevealSection className="relative z-10 py-24 md:py-32">
                <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
                    <motion.div
                        className="glass-panel rounded-3xl p-10 md:p-16 border border-white/10 relative overflow-hidden"
                        whileHover={{ borderColor: "rgba(34,197,94,0.3)" }}
                    >
                        {/* Subtle glow */}
                        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

                        <h2 className="relative text-3xl md:text-4xl text-white font-mono font-bold mb-4">
                            Ready to interview smarter?
                        </h2>
                        <p className="relative text-gray-400 font-mono text-sm mb-8 max-w-md mx-auto">
                            Join teams who have already moved beyond screen-sharing and hacky setups. Start running real-time coding interviews today.
                        </p>
                        <button
                            onClick={ctaAction}
                            className="relative group bg-green-500 hover:bg-green-400 text-black font-mono font-bold text-sm py-3.5 px-10 rounded-xl transition-all shadow-[0_0_25px_rgba(34,197,94,0.3)] hover:shadow-[0_0_35px_rgba(34,197,94,0.5)] flex items-center mx-auto"
                        >
                            {!loading && user ? "GO TO DASHBOARD" : "GET STARTED — IT'S FREE"}
                            <ArrowRight
                                size={16}
                                className="ml-2 group-hover:translate-x-1 transition-transform"
                            />
                        </button>
                    </motion.div>
                </div>
            </RevealSection>

            {/* ============ FOOTER ============ */}
            <footer className="relative z-10 border-t border-white/5 py-8">
                <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Code2 size={16} className="text-green-400" />
                        <span className="text-gray-500 font-mono text-xs">
                            CODEDUEL — Real-time technical interviews
                        </span>
                    </div>
                    <span className="text-gray-600 font-mono text-xs">
                        © {new Date().getFullYear()} CodeDuel. All rights reserved.
                    </span>
                </div>
            </footer>
        </div>
    );
}
