/**
 * ॐ logo. Drop-in replacement for the lucide `Boxes` icon.
 *
 * Uses `currentColor` for the glyph, so it inherits text color exactly like a
 * lucide icon — e.g. `className="h-7 w-7 text-primary"` colors it, `text-white`
 * makes it white, etc. Size is controlled by the className (h-* / w-*).
 */
export function OmLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <text
        x="12"
        y="13"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="20"
        fill="currentColor"
        fontFamily="'Noto Sans Devanagari','Kohinoor Devanagari','Devanagari Sangam MN',sans-serif"
      >
        ॐ
      </text>
    </svg>
  );
}
