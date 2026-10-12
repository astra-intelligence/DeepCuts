// The landing page's three small illustrations, one per panel (ADR-0035): a ranked list, a fan of
// saved cassettes, and a row of picks with a match badge.
//
// Inline SVG drawn only with theme tokens (`fill-*`, `stroke-*`, and the panel's own `--panel`
// color from FeaturePanel), so the art follows the theme and needs no image files. Purely
// decorative (`aria-hidden`): the panel's heading and copy carry the meaning (ADR-0009).
import type { PanelId } from './panels'

// Shared look for the stand-in posters.
const poster = 'fill-poster-placeholder stroke-poster-border'

/** The illustration for one panel. Fills its container's width at a 240×132 aspect ratio. */
export function PanelArt({ id }: { id: PanelId }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 240 132" className="h-auto w-full max-w-80">
      {id === 'top-ten' && <RankedList />}
      {id === 'watchlist' && <SavedFan />}
      {id === 'discovery' && <PicksRow />}
    </svg>
  )
}

// Three ranked rows: a number, a poster, a title and a subtitle line. Number one is in the
// panel color.
function RankedList() {
  return (
    <g>
      {[0, 1, 2].map((i) => {
        const y = 6 + i * 42
        return (
          <g key={i}>
            <text
              x="14"
              y={y + 26}
              textAnchor="middle"
              className={`font-display text-[1.6rem] ${i === 0 ? 'fill-(--panel)' : 'fill-fg-muted'}`}
            >
              {i + 1}
            </text>
            <rect x="34" y={y} width="24" height="34" rx="3" className={poster} />
            <rect x="70" y={y + 8} width={150 - i * 26} height="8" rx="4" className="fill-fg/70" />
            <rect
              x="70"
              y={y + 22}
              width={90 - i * 14}
              height="6"
              rx="3"
              className="fill-fg-muted/50"
            />
            {i < 2 && (
              <line x1="34" x2="230" y1={y + 39} y2={y + 39} className="stroke-card-border" />
            )}
          </g>
        )
      })}
    </g>
  )
}

// Three cassettes fanned out like a stack to get to, the front one bookmarked.
function SavedFan() {
  return (
    <g>
      <rect
        x="52"
        y="22"
        width="60"
        height="92"
        rx="4"
        transform="rotate(-9 82 68)"
        className={poster}
      />
      <rect
        x="128"
        y="22"
        width="60"
        height="92"
        rx="4"
        transform="rotate(9 158 68)"
        className={poster}
      />
      <rect x="90" y="16" width="60" height="96" rx="4" className={`${poster} stroke-(--panel)`} />
      {/* The bookmark ribbon on the front cassette. */}
      <path d="M128 16h14v24l-7-5-7 5Z" className="fill-(--panel)" />
      <rect x="100" y="90" width="40" height="6" rx="3" className="fill-fg-muted/50" />
    </g>
  )
}

// A row of three picks; the middle one is lifted, outlined and badged with its match.
function PicksRow() {
  return (
    <g>
      <rect x="22" y="40" width="56" height="82" rx="4" className={poster} />
      <rect x="162" y="40" width="56" height="82" rx="4" className={poster} />
      <rect
        x="90"
        y="32"
        width="60"
        height="88"
        rx="4"
        className={`${poster} stroke-(--panel)`}
        strokeWidth="2"
      />
      <rect x="94" y="6" width="52" height="20" rx="10" className="fill-(--panel)" />
      <text x="120" y="20.5" textAnchor="middle" className="fill-surface text-[0.75rem] font-bold">
        92%
      </text>
      {/* Two small four-point sparkles: something new found for you. */}
      <path d="m196 8 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" className="fill-(--panel)" />
      <path
        d="m42 18 1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5Z"
        className="fill-(--panel)"
      />
    </g>
  )
}
