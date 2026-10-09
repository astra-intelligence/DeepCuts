// Feature flags: finished-but-hidden work stays in the codebase, tested, until the owner turns it on.
// To turn a feature on or off, change its value in FEATURES below.

/** Every feature flag and what it controls. */
export type Features = {
  /** "Tune my picks" onboarding (/tune and the header heart). Off until the flow is reworked (2026-10-06). */
  onboarding: boolean
  /**
   * The design and tuning labs (/lab/vhs, /lab/weights) and Discover's "Tune the weights" link.
   * Dev server only, never on the live site (owner, 2026-10-09). It's `import.meta.env.DEV`, so
   * a production build leaves the labs' code out entirely (see router.tsx). Tests can turn it off.
   */
  labs: boolean
  /**
   * The Search page (/search, "Quick add") and its tab. Off since 2026-10-07: the owner prefers
   * Discover as the home page. The header search still opens films while it's off.
   */
  searchPage: boolean
}

/** The flags the app runs with. */
export const FEATURES: Features = {
  onboarding: false,
  labs: import.meta.env.DEV,
  searchPage: false,
}

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
