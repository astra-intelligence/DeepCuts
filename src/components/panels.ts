// The app's three ideas, as the landing page and Home both present them (ADR-0035): Top Ten,
// Movies I want to watch, and Discovery. One definition, so the two pages can't drift apart in
// name, icon or color.
import type { IconName } from './Icon'

/** Which of the three panels. */
export type PanelId = 'top-ten' | 'watchlist' | 'discovery'

/** What a panel looks like, whichever page it's on. */
export interface PanelDef {
  id: PanelId
  /** The panel's heading (an `h2`). */
  title: string
  icon: IconName
  /** The panel's color: a design token, set as `--panel` and used by its icon and illustration. */
  tone: string
}

/** The three panels, in page order (also the order of the columns from `lg`). */
export const PANELS: Record<PanelId, PanelDef> = {
  'top-ten': { id: 'top-ten', title: 'Top Ten', icon: 'star', tone: 'var(--color-tag-liked)' },
  watchlist: {
    id: 'watchlist',
    title: 'Movies I want to watch',
    icon: 'bookmark',
    tone: 'var(--color-tag-watchlist)',
  },
  discovery: { id: 'discovery', title: 'Discovery', icon: 'sparkle', tone: 'var(--color-info)' },
}
