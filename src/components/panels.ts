// The app's three ideas, in the order the landing page's program and Home's shelves present them
// (ADR-0035, ADR-0040): Top Ten, Movies I want to watch, and Discovery. One definition, so the two
// pages can't drift apart in name or order.

/** Which of the three ideas. */
export type PanelId = 'top-ten' | 'watchlist' | 'discovery'

/** One idea: its id and its heading. */
export interface PanelDef {
  id: PanelId
  title: string
}

/** The three ideas, in page order ("Feature Nº 1" to "Nº 3"). */
export const PANELS: Record<PanelId, PanelDef> = {
  'top-ten': { id: 'top-ten', title: 'Top Ten' },
  watchlist: { id: 'watchlist', title: 'Movies I want to watch' },
  discovery: { id: 'discovery', title: 'Discovery' },
}
