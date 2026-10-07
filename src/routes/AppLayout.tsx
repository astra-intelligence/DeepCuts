// The app shell around Discover, Search, My Lists and Account: header, search band, the page,
// and the tab bar. (Detail and Sign in have their own layouts.)
import { Link, NavLink, Outlet } from 'react-router'
import { FEATURES } from '../config/features'
import { AccountChip } from '../components/AccountChip'
import { Icon, type IconName } from '../components/Icon'
import { Logo } from '../components/Logo'
import { MovieSearch } from '../components/MovieSearch'
import { SignedInNotice } from '../components/SignedInNotice'
import { useRouteFocus } from '../hooks/useRouteFocus'

// The three tabs in the tab bar, in order.
const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/discover', label: 'Discover', icon: 'home' },
  { to: '/search', label: 'Search', icon: 'search' },
  { to: '/lists', label: 'My Lists', icon: 'list' },
]

/**
 * "Skip to content": hidden until a keyboard user tabs to it, then jumps past the header to
 * <main> (WCAG 2.4.1). Also used by the Detail and Sign-in layouts.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only z-50 rounded-control bg-surface-overlay px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
    >
      Skip to content
    </a>
  )
}

/**
 * Design v2 shell (ADR-0021): sticky header + persistent search band; a bottom tab bar on
 * phones that becomes a floating pill from `md`.
 */
export function AppLayout() {
  useRouteFocus()
  return (
    // Bottom padding keeps the last content clear of the fixed tab bar (and the iPhone home bar).
    <div className="mx-auto min-h-dvh w-full max-w-360 overflow-x-clip pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-28">
      <SkipLink />
      {/* The "Sky rise" backdrop (index.css → page-backdrop): pinned to the whole window, behind
          everything, and purely decorative. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 page-backdrop" />
      {/* Header and search stay pinned to the top while the page scrolls.
          Below `lg`: two rows (logo + account, then a full-width search). From `lg`: one row with
          the search centred between logo and account, which halves the header's height on desktop.
          The DOM order (logo, search, account) is the desktop reading order; below `lg`,
          `order-last` moves the search to its own row, so keyboard focus goes logo → search →
          account there. `md` keeps the phone rhythm with wider gutters and a roomier bottom. */}
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-x-2.5 gap-y-5 border-b border-border bg-surface/95 px-5 pt-[max(0.625rem,env(safe-area-inset-top))] pb-3 backdrop-blur-lg md:px-8 md:pb-5 lg:flex-nowrap lg:gap-x-6 lg:pt-[max(0.75rem,env(safe-area-inset-top))] lg:pb-3">
        {/* 46px tall below `lg`, matching the old 64px first row minus its padding, so the phone
            layout is pixel-identical to before; the usual 44px in the one-row `lg` header. */}
        <Link
          to="/discover"
          aria-label="Deep Cuts, go to Discover"
          className="inline-flex min-h-11.5 shrink-0 items-center lg:min-h-11"
        >
          <Logo className="h-7 w-auto md:h-8" />
        </Link>
        {/* Grows to fill the row up to a readable width; the auto margins then centre it.
            `min-w-0` lets it shrink below the input's built-in width (else it overflows at 320px). */}
        <div className="order-last min-w-0 basis-full lg:order-none lg:mx-auto lg:max-w-lg lg:flex-1 lg:basis-auto">
          <MovieSearch />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* "Tune my picks" onboarding is hidden behind a feature flag for now. */}
          {FEATURES.onboarding && (
            <Link
              to="/tune"
              aria-label="Tune my picks"
              title="Tune my picks"
              className="grid size-11 place-items-center rounded-container border border-border-control bg-surface-raised text-accent hover:border-accent hover:bg-surface-selected"
            >
              <Icon name="heart" />
            </Link>
          )}
          <AccountChip />
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-7xl px-5 pt-5 pb-3 md:pt-6">
        <SignedInNotice />
        {/* The current page renders here. */}
        <Outlet />
        {/* Attribution required by TMDB's terms of use. */}
        <p className="mt-10 text-xs text-fg-muted">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </main>

      {/* The tab bar. NavLink marks the current tab (and gives it aria-current="page"). */}
      <nav
        aria-label="Main"
        className="fixed bottom-0 left-1/2 z-20 w-full max-w-360 -translate-x-1/2 border-t border-nav-border bg-nav-bg/95 px-3.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:bottom-4 md:w-md md:rounded-nav md:border md:p-1 md:shadow-nav md:shadow-surface/80"
      >
        <ul className="grid grid-cols-3">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-1 rounded-nav-item text-sm md:flex-row md:gap-2 ${
                    isActive
                      ? 'text-nav-item-fg-current'
                      : 'text-nav-item-fg hover:text-nav-item-fg-hover'
                  }`
                }
              >
                <Icon name={item.icon} className="size-5.5" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
