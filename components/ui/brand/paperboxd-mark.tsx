import * as React from "react";

type PaperboxdMarkProps = React.ComponentPropsWithoutRef<"svg"> & {
  /**
   * Colour of the inset panels — the "cut" that reads as the box interior.
   * Defaults to the page background so the mark inverts with the theme
   * without any client-side theme detection.
   */
  cutColor?: string;
};

/**
 * PaperBoxd mark — variant 3a, "lid ajar, 33°".
 *
 * Orthographic box at yaw 42° / pitch 26° / roll 12°, lid hinged on the top
 * edge of the rear wall, with a bracketed serif P sheared onto the front
 * plane. Ink is `currentColor`; set the size with a className.
 */
export function PaperboxdMark({
  cutColor = "var(--background)",
  ...props
}: PaperboxdMarkProps) {
  return (
    <svg viewBox="0 0 400 400" aria-hidden="true" {...props}>
      {/* box body */}
      <g
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="24"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M56.3 180.9L177.8 100.4L309.6 133.1L343.7 293.5L222.2 374L90.4 341.2Z" />
      </g>
      <g fill={cutColor} stroke={cutColor} strokeWidth="12" strokeLinejoin="round">
        <path d="M198.2 218.8L303.9 148.8L333.5 288.3L227.9 358.3Z" />
      </g>
      {/* lid, tipped back over the mouth */}
      <g
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="24"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M56.3 180.9L125.4 52.6L244.6 82.2L175.5 210.5Z" />
      </g>
      <g fill={cutColor} stroke={cutColor} strokeWidth="12" strokeLinejoin="round">
        <path d="M69.3 174.1L128.9 63.5L231.6 89L172 199.6Z" />
      </g>
      {/* P, sheared onto the front plane */}
      <path
        transform="matrix(0.9511,-0.6305,0.2669,1.2557,205,222.3)"
        fill="currentColor"
        fillRule="evenodd"
        d="M15 86L15 76L26 76L26 24L15 24L15 14L58 14C75 14 86 23 86 35.5C86 48 75 57 58 57L46 57L46 76L57 76L57 86ZM46 24L46 47L56 47C64 47 69 42 69 35.5C69 29 64 24 56 24Z"
      />
    </svg>
  );
}
