// Fallback pages.
import { Link } from 'react-router'

/** Shown for unknown URLs and when a page crashes, with a way back to Search. */
export function RouteError() {
  return (
    <main id="main" className="p-6">
      {/* React 19 moves <title> into the document head. */}
      <title>Something went wrong · Deep Cuts</title>
      <h1 className="font-display text-4xl">Something went wrong</h1>
      <p className="mt-2 text-fg-muted">
        <Link to="/search" className="text-info underline">
          Back to Search
        </Link>
      </p>
    </main>
  )
}
