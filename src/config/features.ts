// Feature flags: finished-but-hidden work stays in the codebase, tested, until the owner turns it on.
export type Features = {
  /** "Tune my picks" onboarding (/tune and the header heart). Off until the flow is reworked (2026-10-06). */
  onboarding: boolean
}

export const FEATURES: Features = { onboarding: false }
