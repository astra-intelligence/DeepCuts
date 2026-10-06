import { Link, NavLink, Outlet } from 'react-router'
import { Icon, type IconName } from '../components/Icon'
import { Logo } from '../components/Logo'
import { useRouteFocus } from '../hooks/useRouteFocus'

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Discover', icon: 'home' },
  { to: '/search', label: 'Search', icon: 'search' },
  { to: '/lists', label: 'My Lists', icon: 'list' },
]

// Responsive shell (ADR-0021): bottom tab bar on small screens, top-right nav from `lg`.
export function AppLayout() {
  useRouteFocus()
  return (
    <div className="mx-auto min-h-dvh max-w-[1440px] pb-24 lg:pb-0">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-surface-overlay px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-surface/90 px-4 backdrop-blur lg:h-20 lg:px-8">
        <Link to="/" className="inline-flex min-h-11 items-center">
          <Logo className="h-8 w-auto lg:h-10" />
        </Link>
      </header>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:inset-x-auto lg:top-4 lg:right-8 lg:bottom-auto lg:border-0 lg:bg-transparent lg:pb-0 lg:backdrop-blur-none"
      >
        <ul className="grid grid-cols-3 lg:flex lg:gap-2">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-4 text-xs lg:min-h-11 lg:flex-row lg:gap-2 lg:text-sm ${
                    isActive ? 'text-accent' : 'text-fg-muted hover:text-fg'
                  }`
                }
              >
                <Icon name={item.icon} />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main id="main" className="px-4 pt-6 pb-8 lg:px-8">
        <Outlet />
      </main>
      <footer className="px-4 pb-6 text-xs text-fg-muted lg:px-8">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </footer>
    </div>
  )
}
