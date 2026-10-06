import { Link } from 'react-router'

export function TunePage() {
  return (
    <>
      <title>Tune my picks · Deep Cuts</title>
      <h1 className="font-display text-4xl">What are you into?</h1>
    </>
  )
}

export function RouteError() {
  return (
    <main id="main" className="p-6">
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
