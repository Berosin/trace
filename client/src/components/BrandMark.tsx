import { TraceLogo } from "./TraceLogo";

interface Props {
  className?: string;
  /** Small inline mark for the sidebar; false renders the larger wordmark block used in the hero. */
  compact?: boolean;
}

/**
 * The signature mark: the TRACE logo (your original artwork, background
 * removed, recolored to ink/accent) + tracked-out monospace wordmark.
 */
export function BrandMark({ className, compact }: Props) {
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className ?? ""}`}>
        <TraceLogo size={18} />
        <span className="text-xs font-mono font-bold tracking-[0.15em] uppercase text-ink">TRACE</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-3 border-2 border-ink px-4 py-3 bg-panel w-fit">
        <TraceLogo size={30} />
        <span className="text-lg font-mono font-bold tracking-[0.15em] uppercase text-ink">TRACE</span>
        <span className="h-2 w-2 bg-accent animate-blink" />
      </div>
    </div>
  );
}
