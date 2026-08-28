interface Props {
  className?: string;
  /** When true, renders the small "handoff" glyph version used inline between agent stages. */
  compact?: boolean;
}

/**
 * The signature visual: a Dutch (split) door, glazed on top / solid on
 * bottom. It stands for TRACE's core idea — the top half (what's visible,
 * the conversation) can close while the bottom half (the persisted
 * reasoning) stays open and keeps working.
 */
export function DutchDoor({ className, compact }: Props) {
  if (compact) {
    return (
      <svg viewBox="0 0 64 80" className={className} aria-hidden="true">
        <rect x="4" y="2" width="56" height="76" rx="3" fill="none" stroke="#2E6B8A" strokeWidth="2.5" />
        <line x1="4" y1="40" x2="60" y2="40" stroke="#2E6B8A" strokeWidth="2.5" />
        <rect x="10" y="8" width="44" height="26" rx="1.5" fill="#DCEFF5" stroke="#4A93B8" strokeWidth="1.5" />
        <line x1="32" y1="8" x2="32" y2="34" stroke="#4A93B8" strokeWidth="1.2" />
        <rect x="10" y="46" width="44" height="28" rx="1.5" fill="#7FB8D6" stroke="#4A93B8" strokeWidth="1.5" />
        <circle cx="16" cy="60" r="2.4" fill="#1F3B4D" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 260 340" className={className} role="img" aria-label="Illustration of a blue Dutch door, split into a glazed top half and a solid bottom half">
      {/* frame */}
      <rect x="10" y="6" width="240" height="328" rx="6" fill="#FCFAF5" stroke="#1F3B4D" strokeWidth="3" />

      {/* top glazed half */}
      <g>
        <rect x="26" y="20" width="208" height="140" rx="4" fill="url(#skyGrad)" stroke="#4A93B8" strokeWidth="3" />
        {/* simple pine silhouette through the glass */}
        <path
          d="M130 130 L108 100 L118 100 L100 72 L112 72 L96 46 L130 46 L114 72 L126 72 L108 100 L118 100 L138 130 Z"
          fill="#5C8A63"
          opacity="0.55"
          transform="translate(0,10)"
        />
        <path d="M60 150 Q130 100 200 150" fill="none" stroke="#4A93B8" strokeWidth="2" opacity="0.5" />
        {/* muntins */}
        <line x1="26" y1="66" x2="234" y2="66" stroke="#4A93B8" strokeWidth="2.5" />
        <line x1="26" y1="113" x2="234" y2="113" stroke="#4A93B8" strokeWidth="2.5" />
        <line x1="95" y1="20" x2="95" y2="160" stroke="#4A93B8" strokeWidth="2.5" />
        <line x1="165" y1="20" x2="165" y2="160" stroke="#4A93B8" strokeWidth="2.5" />
      </g>

      {/* split rail */}
      <rect x="14" y="164" width="232" height="14" fill="#1F3B4D" />
      <rect x="24" y="168" width="20" height="6" rx="2" fill="#BFE1EE" />

      {/* bottom solid half */}
      <g>
        <rect x="26" y="188" width="208" height="132" rx="4" fill="#7FB8D6" stroke="#4A93B8" strokeWidth="3" />
        <rect x="42" y="204" width="80" height="100" rx="3" fill="none" stroke="#2E6B8A" strokeWidth="2.5" opacity="0.55" />
        <rect x="138" y="204" width="80" height="100" rx="3" fill="none" stroke="#2E6B8A" strokeWidth="2.5" opacity="0.55" />
        {/* handle */}
        <circle cx="52" cy="254" r="6" fill="#1F3B4D" />
      </g>

      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EAF6FA" />
          <stop offset="100%" stopColor="#BFE1EE" />
        </linearGradient>
      </defs>
    </svg>
  );
}
