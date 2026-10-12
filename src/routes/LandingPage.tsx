// The signed-out landing page at `/` (ADR-0034, ADR-0035).
//
// It explains the app's three ideas in the same panels Home uses once you're signed in: Top Ten,
// Movies I want to watch, and Discovery. Each panel has a small illustration and a line of copy.
// There is one action, Sign in; the sign-in page also offers the demo account for visitors
// without an invite (ADR-0025).
import { Link } from 'react-router'
import { FeaturePanel } from '../components/FeaturePanel'
import { Icon } from '../components/Icon'
import { PanelArt } from '../components/PanelArt'
import { PANELS, type PanelId } from '../components/panels'
import { PageHeading } from '../components/PageHeading'

// What each panel promises. Plain and specific: only what the signed-in app really does (Top Ten
// is shown as "coming", as Home shows it, until that project ships; ADR-0033).
const COPY: Record<PanelId, string> = {
  'top-ten': 'Rank the ten films you’d defend to anyone, in your order. Coming next.',
  watchlist: 'Save a film the moment you hear about it. It waits for you on Home.',
  discovery: 'Like a few films and get deep cuts picked for your taste, with the reason why.',
}

/** The landing page: heading, the three explainer panels, and Sign in. */
export function LandingPage() {
  return (
    <>
      <title>Deep Cuts</title>
      <PageHeading
        title="Your movies, close at hand"
        lede="Keep your all-time favourites, the films you want to see, and picks made for your taste, in one place."
      />
      {/* One column on phones; three equal columns from `lg`, the same grid as Home. */}
      <ul className="grid gap-4 lg:grid-cols-3">
        {(Object.keys(COPY) as PanelId[]).map((id) => (
          <li key={id}>
            <FeaturePanel panel={PANELS[id]}>
              <div className="grid place-items-center rounded-container bg-surface-raised px-4 py-5">
                <PanelArt id={id} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">{COPY[id]}</p>
            </FeaturePanel>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
        {/* `from: '/'` returns here after signing in, where Home then shows. */}
        <Link
          to="/sign-in"
          state={{ from: '/' }}
          className="flex min-h-12 items-center gap-2 rounded-button bg-button-primary-bg px-6 text-sm font-semibold text-button-primary-fg hover:bg-button-primary-bg/85"
        >
          <Icon name="user" className="size-4.5" />
          Sign in
        </Link>
        <p className="text-sm text-fg-muted">No invite? Sign in has a demo account to try.</p>
      </div>
    </>
  )
}
