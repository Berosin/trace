interface Props {
  size?: number;
  className?: string;
}

/**
 * The TRACE mark — the original logo artwork, background removed and
 * recolored to the theme palette (ink black, accent orange on the center
 * stem). Geometry is untouched; only color/background changed.
 */
export function TraceLogo({ size = 20, className }: Props) {
  return <img src="/logo-mark.png" alt="" width={size} height={size} className={className} style={{ objectFit: "contain" }} />;
}
