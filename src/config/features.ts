// Feature flags: finished-but-hidden work stays in the codebase, tested, until the owner turns it on.
// To turn a feature on or off, change its value in FEATURES below.

/** Every feature flag and what it controls. */
export type Features = {
  /** "Tune my picks" onboarding (/tune and the header heart). Off until the flow is reworked (2026-10-06). */
  onboarding: boolean
  /** The scorer weights lab (/discover/weights), linked from Discover. On while the owner tunes (2026-10-06). */
  weightsLab: boolean
  /**
   * The Search page (/search, "Quick add") and its tab. Off since 2026-10-07: the owner prefers
   * Discover as the home page. The header search still opens films while it's off.
   */
  searchPage: boolean
}

/** The flags the app runs with. */
export const FEATURES: Features = { onboarding: false, weightsLab: true, searchPage: false }

/**
 * Where "home" is: the page the app opens on, and where Back, sign-out and error pages go when
 * there's nowhere better. Search while its page is on, otherwise Discover.
 */
export function homeOf(features: Features = FEATURES) {
  return features.searchPage
    ? ({ path: '/search', label: 'Search' } as const)
    : ({ path: '/discover', label: 'Discover' } as const)
}

/** Home for the app's real flags (see `homeOf`). */
export const HOME = homeOf()
