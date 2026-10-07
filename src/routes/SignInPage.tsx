import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from 'react-aria-components'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import type { SignInMethodId } from '../adapters/SessionProvider'
import { Eyebrow } from '../components/Eyebrow'
import { Icon } from '../components/Icon'
import { Logo } from '../components/Logo'
import { useRouteFocus } from '../hooks/useRouteFocus'
import { useSession } from '../session/SessionContext'
import { useTagQueries } from '../session/tagQueries'
import { SkipLink } from './AppLayout'

// Where to return after signing in. History state is untrusted: only same-app paths are allowed.
const fromSchema = z.object({ from: z.string().regex(/^\/(?!\/)[^\s]*$/) })

/** The sign-in page (ADR-0025, approved design): every method the session adapter offers. */
export function SignInPage() {
  useRouteFocus()
  const { session, signInMethods, signIn } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const parsed = fromSchema.safeParse(location.state)
  const from = parsed.success && parsed.data.from !== '/sign-in' ? parsed.data.from : '/search'
  const picks = new Set(useQuery(useTagQueries().all()).data?.map((r) => r.tmdbId)).size
  const [pending, setPending] = useState<SignInMethodId | null>(null)
  const [failed, setFailed] = useState(false)

  // Arriving already signed in goes to the account page. (Not after signing in here: then the
  // page returns to where sign-in started, and `pending` stays set until it does.)
  if (session.kind === 'account' && pending === null) return <Navigate to="/account" replace />

  async function start(method: SignInMethodId) {
    setFailed(false)
    setPending(method)
    try {
      const { moved } = await signIn(method)
      navigate(from, { replace: true, state: { signedIn: { moved } } })
    } catch {
      setFailed(true)
      setPending(null)
    }
  }

  return (
    <div className="mx-auto min-h-svh w-full max-w-360">
      <title>Sign in · Deep Cuts</title>
      <SkipLink />
      <header className="flex min-h-16 items-center justify-between gap-2.5 border-b border-border px-5 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2 md:px-8">
        <Button
          onPress={() => (location.key === 'default' ? navigate('/search') : navigate(-1))}
          className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm text-info"
        >
          <Icon name="back" /> Back
        </Button>
        <Link
          to="/search"
          aria-label="Deep Cuts, go to Search"
          className="inline-flex min-h-11 items-center"
        >
          <Logo className="h-7 w-auto" />
        </Link>
      </header>

      <main id="main" className="mx-auto grid w-full max-w-md gap-4 px-5 py-6">
        <div>
          <Eyebrow>Your account</Eyebrow>
          <h1 className="font-display text-4xl leading-none tracking-tight">
            Sign in to Deep Cuts
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            Keep your lists in your account instead of a single browser.
          </p>
        </div>

        {failed && (
          <p
            role="alert"
            className="flex gap-2.5 rounded-container border border-fg-danger bg-fg-danger/10 p-3 text-sm"
          >
            <Icon name="ban" className="size-5 shrink-0 text-fg-danger" />
            Sign-in didn’t finish. Nothing was changed. Try again.
          </p>
        )}

        <ul className="grid gap-3">
          {signInMethods.map((m) => (
            <li key={m.id}>
              <Button
                onPress={() => start(m.id)}
                isPending={pending !== null}
                className="flex min-h-13 w-full items-center gap-3 rounded-button border border-button-secondary-border bg-button-secondary-bg px-3.5 text-left text-sm font-semibold hover:border-accent data-pending:opacity-70"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-control bg-surface-selected text-accent">
                  <Icon name="user" className="size-4.5" />
                </span>
                <span>
                  {m.label}
                  <small className="block text-sm font-normal text-fg-muted">{m.description}</small>
                </span>
              </Button>
            </li>
          ))}
        </ul>
        <p role="status" className="text-sm text-fg-muted empty:hidden">
          {pending ? 'Signing you in…' : ''}
        </p>

        <p className="rounded-container border border-dashed border-border-control p-3 text-sm text-fg-muted">
          <strong className="text-fg">More ways to sign in are coming.</strong> Google, GitHub, an
          emailed code or a passkey will appear here once they’re chosen.
        </p>

        {picks > 0 && (
          <p className="flex items-start gap-2.5 text-sm text-fg-muted">
            <Icon name="check" className="mt-0.5 size-4.5 shrink-0 text-accent" />
            Your {picks} {session.kind === 'profile' ? 'saved' : 'unsaved'}{' '}
            {picks === 1 ? 'pick comes' : 'picks come'} with you when you sign in.
          </p>
        )}
        {session.kind === 'guest' && (
          <p className="text-sm text-fg-muted">
            Prefer not to sign in?{' '}
            <Link to="/account" className="text-info underline">
              Keep your picks on this device
            </Link>
            .
          </p>
        )}
      </main>
    </div>
  )
}
