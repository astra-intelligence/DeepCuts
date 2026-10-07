import { Link, NavLink, Outlet } from 'react-router'
import { FEATURES } from '../config/features'
import { AccountChip } from '../components/AccountChip'
import { Icon, type IconName } from '../components/Icon'
import { Logo } from '../components/Logo'
import { MovieSearch } from '../components/MovieSearch'
import { SignedInNotice } from '../components/SignedInNotice'
import { useRouteFocus } from '../hooks/useRouteFocus'

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/discover', label: 'Discover', icon: 'home' },
  { to: '/search', label: 'Search', icon: 'search' },
  { to: '/lists', label: 'My Lists', icon: 'list' },
]

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

// Design v2 shell (ADR-0021): sticky header + persistent search band; a bottom tab bar on
// phones that becomes a floating pill from `md`.
export function AppLayout() {
  useRouteFocus()
  return (
    <div className="mx-auto min-h-dvh w-full max-w-360 overflow-x-clip pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-28">
      <SkipLink />
      <div className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur-lg">
        <header className="flex min-h-16 items-center justify-between gap-2.5 px-5 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2 md:px-8">
          <Link
            to="/discover"
            aria-label="Deep Cuts, go to Discover"
            className="inline-flex min-h-11 items-center"
          >
            <Logo className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
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
        <div className="px-5 py-3 md:px-8 md:pb-5">
          <div className="mx-auto max-w-7xl">
            <MovieSearch />
          </div>
        </div>
      </div>

      <main id="main" className="mx-auto w-full max-w-7xl px-5 pt-5 pb-3 md:pt-6">
        <SignedInNotice />
        <Outlet />
        <p className="mt-10 text-xs text-fg-muted">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </main>

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
