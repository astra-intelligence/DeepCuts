import { Link } from 'react-router'

export function DiscoverPage() {
  return (
    <>
      <title>Discover · Deep Cuts</title>
      <h1 className="font-display text-4xl">Found for you</h1>
      <p className="mt-2 text-fg-muted">
        Recommendations arrive in a later stage. For now,{' '}
        <Link to="/search" className="text-info underline">
          search for a film
        </Link>
        .
      </p>
    </>
  )
}

export function ListsPage() {
  return (
    <>
      <title>My Lists · Deep Cuts</title>
      <h1 className="font-display text-4xl">My Lists</h1>
      <p className="mt-2 text-fg-muted">Your tagged films will live here.</p>
    </>
  )
}

export function AccountPage() {
  return (
    <>
      <title>Account · Deep Cuts</title>
      <h1 className="font-display text-4xl">Your account</h1>
    </>
  )
}

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
