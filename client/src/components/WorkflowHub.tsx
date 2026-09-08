import { ReactNode } from "react";
import { TraceLogo } from "./TraceLogo";

interface Props {
  leftLabels: string[];
  rightLabels: string[];
  centerIcon?: ReactNode;
}

const ROW_Y = [15, 50, 85]; // percent, top/middle/bottom rows

/**
 * Renders three labeled pills on each side, all connected by thin lines to a
 * bordered icon box in the center. Lines are drawn with an SVG whose viewBox
 * matches the container's actual pixel box (preserveAspectRatio="none"), so
 * line endpoints and pill positions share the same percentage coordinate
 * space without any runtime measurement.
 */
export function WorkflowHub({ leftLabels, rightLabels, centerIcon }: Props) {
  return (
    <div className="relative h-[210px] w-full max-w-2xl mx-auto hidden sm:block">
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1000 210"
        preserveAspectRatio="none"
      >
        {ROW_Y.map((y, i) => (
          <line
            key={`l-${i}`}
            x1="175"
            y1={(y / 100) * 210}
            x2="500"
            y2="105"
            stroke="#121210"
            strokeOpacity="0.35"
            strokeWidth="1.5"
          />
        ))}
        {ROW_Y.map((y, i) => (
          <line
            key={`r-${i}`}
            x1="500"
            y1="105"
            x2="825"
            y2={(y / 100) * 210}
            stroke="#121210"
            strokeOpacity="0.35"
            strokeWidth="1.5"
          />
        ))}
        <circle cx="175" cy={(ROW_Y[1] / 100) * 210} r="3" fill="#EA580C" />
      </svg>

      {leftLabels.map((label, i) => (
        <div
          key={label}
          className="absolute left-0 -translate-y-1/2"
          style={{ top: `${ROW_Y[i]}%` }}
        >
          <Pill>{label}</Pill>
        </div>
      ))}

      {rightLabels.map((label, i) => (
        <div
          key={label}
          className="absolute right-0 -translate-y-1/2"
          style={{ top: `${ROW_Y[i]}%` }}
        >
          <Pill>{label}</Pill>
        </div>
      ))}

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-14 w-14 border-2 border-ink bg-panel flex items-center justify-center">
          {centerIcon ?? <TraceLogo size={26} />}
        </div>
      </div>
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block border border-ink bg-panel rounded-full px-3 py-1 text-[11px] font-mono text-ink whitespace-nowrap">
      {children}
    </span>
  );
}