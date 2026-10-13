// `/` (ADR-0035): the landing page when signed out, Home when signed in. Both show the same three
// panels (Top Ten, Watchlist, Discovery); the landing explains them, Home fills them.
import { useSession } from '../session/SessionContext'
import { HomePage } from './DiscoverPage'
import { LandingPage } from './LandingPage'

/** Picks the page for `/` from the session. */
export function IndexRoute() {
  const { session } = useSession()
  return session.kind === 'account' ? <HomePage /> : <LandingPage />
}
