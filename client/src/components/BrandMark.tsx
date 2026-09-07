import { Terminal } from "lucide-react";

interface Props {
  className?: string;
  /** Small inline mark for the sidebar; false renders the larger wordmark block used in the hero. */
  compact?: boolean;
}

/**
 * The signature mark: a terminal glyph + tracked-out monospace wordmark.
 * No illustration — brutalist branding is typographic.
 */
export function BrandMark({ className, compact }: Props) {
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className ?? ""}`}>
        <Terminal size={16} strokeWidth={1.75} className="text-ink" />
        <span className="text-xs font-mono font-bold tracking-[0.15em] uppercase text-ink">TRACE</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-3 border-2 border-ink px-4 py-3 bg-panel w-fit">
        <Terminal size={22} strokeWidth={1.5} className="text-ink" />
        <span className="text-lg font-mono font-bold tracking-[0.15em] uppercase text-ink">TRACE</span>
        <span className="h-2 w-2 bg-accent animate-blink" />
      </div>
    </div>
  );
}