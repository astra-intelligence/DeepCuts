// The signed-out landing page at `/` (ADR-0034, ADR-0035).
//
// It explains the app's three ideas in the same panels Home uses once you're signed in: Top Ten,
// Movies I want to watch, and Discovery. Each panel has a small illustration and a line of copy.
// Signing in is the header's Sign in control; the page itself has no call to action (owner,
// 2026-10-11). The sign-in page also offers the demo account for visitors without an invite
// (ADR-0025).
import { FeaturePanel } from '../components/FeaturePanel'
import { PanelArt } from '../components/PanelArt'
import { PANELS, type PanelId } from '../components/panels'
import { PageHeading } from '../components/PageHeading'
import { Ticker } from '../components/Ticker'

// The ticker's lines (ADR-0040): one real sentence per feature, nothing invented.
const TICKER = [
  'Top Ten: rank the ten films you’d defend',
  'Watchlist: save a film the moment you hear about it',
  'Discovery: picks for your taste, with the reason why',
]

// What each panel promises. Plain and specific: only what the signed-in app really does (Top Ten
// is shown as "coming", as Home shows it, until that project ships; ADR-0033).
const COPY: Record<PanelId, string> = {
  'top-ten': 'Rank the ten films you’d defend to anyone, in your order. Coming next.',
  watchlist: 'Save a film the moment you hear about it. It waits for you on Home.',
  discovery: 'Like a few films and get deep cuts picked for your taste, with the reason why.',
}

/** The landing page: heading and the three explainer panels. */
export function LandingPage() {
  return (
    <>
      <title>Deep Cuts</title>
      <Ticker items={TICKER} />
      <PageHeading
        title="Your movies, close at hand"
        lede="Keep your all-time favourites, the films you want to see, and picks made for your taste, in one place."
      />
      {/* One column on phones; three equal columns from `lg`, the same grid as Home. */}
      <ul className="grid gap-4 lg:grid-cols-3">
        {(Object.keys(COPY) as PanelId[]).map((id) => (
          <li key={id}>
            <FeaturePanel panel={PANELS[id]}>
              <div className="grid place-items-center bg-surface-raised px-4 py-5">
                <PanelArt id={id} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">{COPY[id]}</p>
            </FeaturePanel>
          </li>
        ))}
      </ul>
    </>
  )
}
