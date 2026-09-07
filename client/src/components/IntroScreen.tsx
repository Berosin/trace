import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  onComplete: () => void;
}

const BOOT_LINES = [
  "// TRACE — Ticket Reasoning & Agent Continuity Engine",
  "// verifying ledger hash chain ............ OK",
  "// initializing agents: L1 · L2 · CORRELATION · RECOVERY",
  "// don't just pass the ticket. pass the reasoning.",
];

type Phase = "grid" | "arms" | "legs" | "node" | "boot" | "wordmark" | "hold" | "exit";

const PHASE_ORDER: { phase: Phase; at: number }[] = [
  { phase: "grid", at: 0 },
  { phase: "arms", at: 250 },
  { phase: "legs", at: 750 },
  { phase: "node", at: 1300 },
  { phase: "boot", at: 1500 },
  { phase: "wordmark", at: 3000 },
  { phase: "hold", at: 3700 },
  { phase: "exit", at: 4300 },
];

const EXIT_DURATION = 550;

/**
 * One-shot animated boot sequence. Mounted once at the app root as an
 * overlay — the real app underneath is already mounting and fetching data
 * while this plays, so the "reveal" at the end shows a screen that's already
 * live, not a blank one. Respects prefers-reduced-motion by skipping straight
 * to onComplete.
 */
export function IntroScreen({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("grid");
  const [linesShown, setLinesShown] = useState(0);
  const timeouts = useRef<number[]>([]);
  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useEffect(() => {
    if (reducedMotion) {
      onComplete();
      return;
    }

    PHASE_ORDER.forEach(({ phase: p, at }) => {
      const id = window.setTimeout(() => setPhase(p), at);
      timeouts.current.push(id);
    });

    BOOT_LINES.forEach((_, i) => {
      const id = window.setTimeout(() => setLinesShown((n) => Math.max(n, i + 1)), 1550 + i * 320);
      timeouts.current.push(id);
    });

    const finalId = window.setTimeout(onComplete, 4300 + EXIT_DURATION);
    timeouts.current.push(finalId);

    return () => timeouts.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function skip() {
    timeouts.current.forEach(clearTimeout);
    setPhase("exit");
    window.setTimeout(onComplete, EXIT_DURATION);
  }

  if (reducedMotion) return null;

  const armsDrawn = ["arms", "legs", "node", "boot", "wordmark", "hold", "exit"].includes(phase);
  const legsDrawn = ["legs", "node", "boot", "wordmark", "hold", "exit"].includes(phase);
  const nodePulsed = ["node", "boot", "wordmark", "hold", "exit"].includes(phase);
  const wordmarkVisible = ["wordmark", "hold", "exit"].includes(phase);
  const exiting = phase === "exit";

  return (
    <div
      className="fixed inset-0 z-[100] bg-paper dot-grid-bg animate-grid-pulse overflow-hidden flex flex-col items-center justify-center transition-transform"
      style={{
        transform: exiting ? "translateY(-100%)" : "translateY(0)",
        transitionDuration: `${EXIT_DURATION}ms`,
        transitionTimingFunction: "cubic-bezier(0.65, 0, 0.35, 1)",
      }}
    >
      {/* scanline sweep, once, during boot */}
      <div
        className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-accent/10 to-transparent pointer-events-none animate-scan-sweep"
        style={{ left: 0 }}
      />

      <button
        onClick={skip}
        className="absolute top-6 right-6 text-[10px] font-mono uppercase tracking-[0.2em] text-muted hover:text-ink border border-ink/30 hover:border-ink px-3 py-1.5 transition-colors"
      >
        Skip →
      </button>

      {/* logo: your actual artwork, revealed via a two-stage clip-path wipe —
          top 40% (the converging arms) first, then the rest (the legs) —
          split at the real convergence point measured in the source image.
          A raster image can't be stroke-animated like a vector path, so this
          wipe is the accurate substitute: it's your exact logo, not a
          redrawn approximation. */}
      <div
        className={`origin-center ${nodePulsed ? "animate-logo-pulse" : ""}`}
        style={{
          width: 120,
          height: 120,
          clipPath: legsDrawn ? "inset(0 0 0% 0)" : armsDrawn ? "inset(0 0 60% 0)" : "inset(0 0 100% 0)",
          transition: "clip-path 0.55s cubic-bezier(0.65,0,0.35,1)",
        }}
      >
        <img src="/logo-mark.png" alt="" width={120} height={120} style={{ objectFit: "contain" }} />
      </div>


      {/* boot log */}
      <div className="mt-7 space-y-1.5 min-h-[90px]">
        {BOOT_LINES.map((line, i) => (
          <BootLine key={line} text={line} active={linesShown > i} />
        ))}
      </div>

      {/* wordmark */}
      <div
        className="mt-8 flex items-center gap-3 border-2 border-ink px-5 py-3 bg-panel"
        style={{
          opacity: wordmarkVisible ? 1 : 0,
          transform: wordmarkVisible ? "scale(1)" : "scale(0.85)",
          transition: "opacity 0.4s cubic-bezier(0.34,1.56,0.64,1), transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <span className="text-2xl font-mono font-bold tracking-[0.2em] uppercase text-ink">TRACE</span>
        <span className="h-2.5 w-2.5 bg-accent animate-blink" />
      </div>
    </div>
  );
}

function BootLine({ text, active }: { text: string; active: boolean }) {
  return (
    <div className="font-mono text-[11px] text-muted overflow-hidden whitespace-nowrap mx-auto" style={{ width: "fit-content" }}>
      <span
        className="inline-block overflow-hidden whitespace-nowrap align-top"
        style={{
          width: active ? `${text.length}ch` : "0ch",
          transition: `width ${Math.min(text.length * 18, 900)}ms steps(${text.length})`,
        }}
      >
        {text}
      </span>
    </div>
  );
}