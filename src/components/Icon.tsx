// Stroke icons from the v2 design. Each is one SVG path, so they stay tiny and need no icon library.
// To add an icon, add its 24×24 path data here; the name then becomes a valid `IconName`.
const PATHS = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  back: 'm15 18-6-6 6-6',
  forward: 'm9 18 6-6-6-6',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  eye: 'M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6ZM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
  bookmark: 'M6 4h12v16l-6-3.5L6 20V4Z',
  heart:
    'M20.8 5.7a5.2 5.2 0 0 0-7.4 0L12 7.1l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 21l8.8-7.9a5.2 5.2 0 0 0 0-7.4Z',
  ban: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM6.5 6.5l11 11',
  check: 'm5 12 4 4L19 6',
  user: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4.5 21a7.5 7.5 0 0 1 15 0',
  star: 'm12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z',
} as const

/** The name of any icon above, e.g. `'search'`. */
export type IconName = keyof typeof PATHS

/** Decorative icon; the accessible name always comes from adjacent text. */
export function Icon({ name, className = 'size-5' }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      // Drawn in the surrounding text color, so `text-*` classes color the icon.
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
