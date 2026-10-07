// The Account page (/account). Two versions:
// - signed out: save picks on this device, or go to sign in;
// - signed in: the account, its tagged-film count, and sign out (with a confirm step).
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Button } from 'react-aria-components'
import { Link, useNavigate } from 'react-router'
import type { Account } from '../adapters/SessionProvider'
import { Avatar } from '../components/AccountChip'
import { Eyebrow } from '../components/Eyebrow'
import { Icon } from '../components/Icon'
import { PageHeading } from '../components/PageHeading'
import { useSession } from '../session/SessionContext'
import { useTagQueries } from '../session/tagQueries'

/**
 * ADR-0022 + ADR-0025: one page for saving on this device, signing in, and the signed-in account.
 * Copy never implies cross-device sync until a real account provider exists (ADR-0013).
 */
export function AccountPage() {
  const { session } = useSession()
  return session.kind === 'account' ? <SignedIn account={session.account} /> : <SignedOut />
}

// Guest or device profile: explains where picks are kept and offers both ways to keep them.
function SignedOut() {
  const { session, createProfile } = useSession()
  const saved = session.kind === 'profile'
  const [status, setStatus] = useState('')

  // "Save my picks": moves the guest's picks into this browser, then confirms out loud.
  async function save() {
    await createProfile()
    setStatus('Your picks are saved on this device.')
  }

  return (
    <>
      <title>Account · Deep Cuts</title>
      <PageHeading
        eyebrow="Your account"
        title="Keep your cuts"
        lede="Save your picks on this device, or sign in to keep them in your account."
      />

      <div className="flex items-center gap-3 rounded-card border border-card-border bg-card-bg p-3 shadow-card">
        <span className="grid size-12 shrink-0 place-items-center rounded-prominent border border-accent bg-surface-selected text-fg-on-selected">
          <Icon name="user" className="size-6" />
        </span>
        <div>
          <strong className="text-base">You’re signed out</strong>
          <p className="mt-0.5 text-sm text-fg-muted">
            {saved
              ? 'Your picks are saved on this device.'
              : 'Your picks are not saved yet. They disappear when you close or reload this tab.'}
          </p>
        </div>
      </div>

      {/* Two side-by-side choices from md: keep picks on this device, or sign in. */}
      <div className="mt-3 grid items-stretch gap-3 md:grid-cols-2">
        <section
          aria-labelledby="local-heading"
          className="flex min-h-62 flex-col items-start rounded-card border border-card-border bg-card-bg p-4.5 shadow-card"
        >
          <span className="mb-4.5 grid size-11 place-items-center rounded-container bg-surface-selected text-accent">
            <Icon name="bookmark" />
          </span>
          <Eyebrow>On this device</Eyebrow>
          <h2 id="local-heading" className="mb-2 font-display text-3xl">
            Keep your lists locally
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-fg-muted">
            Save Seen it, Want to see, Like and Dislike on this device without registering.
          </p>
          {saved ? (
            <strong className="mt-auto flex min-h-11 items-center gap-2 rounded-button border border-accent bg-surface-selected px-3.5 text-sm font-semibold text-fg-on-selected">
              <Icon name="check" /> Saved on this device
            </strong>
          ) : (
            <Button
              onPress={save}
              className="mt-auto flex h-11 w-36 items-center justify-center gap-2 rounded-button border border-accent bg-surface-selected text-sm font-semibold text-fg-on-selected hover:bg-accent/15"
            >
              Save my picks
            </Button>
          )}
        </section>

        <section
          aria-labelledby="signin-heading"
          className="flex min-h-62 flex-col items-start rounded-card border border-card-border bg-card-bg p-4.5 shadow-card"
        >
          <span className="mb-4.5 grid size-11 place-items-center rounded-container bg-info/12 text-info">
            <Icon name="user" />
          </span>
          <Eyebrow tone="info">Your account</Eyebrow>
          <h2 id="signin-heading" className="mb-2 font-display text-3xl">
            Sign in to keep your cuts
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-fg-muted">
            Keep your lists in your account instead of a single browser.
          </p>
          {/* `from` tells the sign-in page where to return afterwards. */}
          <Link
            to="/sign-in"
            state={{ from: '/account' }}
            className="mt-auto flex h-11 w-36 items-center justify-center rounded-button border border-info bg-info/12 text-sm font-semibold text-info hover:bg-info/20"
          >
            Sign in
          </Link>
        </section>
      </div>

      <p role="status" className="mt-3 text-sm text-accent">
        {status}
      </p>
      <Link
        to="/search"
        className="mt-1 flex min-h-11 w-fit items-center gap-1.5 text-sm text-info"
      >
        <Icon name="back" /> Back to Search
      </Link>
    </>
  )
}

// Signed in: who you are, how many films you've tagged, and sign out.
function SignedIn({ account }: { account: Account }) {
  const { signOut } = useSession()
  const navigate = useNavigate()
  // Distinct films (a film with two tags counts once).
  const films = new Set(useQuery(useTagQueries().all()).data?.map((r) => r.tmdbId)).size
  // Sign out takes two presses ("Sign out", then "Yes, sign out"), so it can't happen by accident.
  const [confirming, setConfirming] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const askRef = useRef<HTMLButtonElement>(null)
  // After "Sign out", focus moves to the confirm button the press revealed.
  useEffect(() => {
    if (confirming) confirmRef.current?.focus()
  }, [confirming])

  async function confirmSignOut() {
    await signOut()
    navigate('/search')
  }

  return (
    <>
      <title>Account · Deep Cuts</title>
      <Eyebrow>Your account</Eyebrow>
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={account.name} large />
        <div>
          <h1 className="font-display text-3xl leading-tight">{account.name}</h1>
          <p className="text-sm text-fg-muted">
            {account.method === 'demo' ? 'Signed in with the demo account' : 'Signed in'}
          </p>
        </div>
      </div>

      <div className="grid items-stretch gap-3 md:grid-cols-2">
        <section
          aria-labelledby="lists-heading"
          className="grid content-start gap-2.5 rounded-card border border-card-border bg-card-bg p-4 shadow-card"
        >
          <h2 id="lists-heading" className="font-display text-2xl">
            Your lists
          </h2>
          <p className="text-sm text-fg-muted">
            {films} {films === 1 ? 'film' : 'films'} tagged across Seen it, Want to see, Like and
            Dislike.
          </p>
          {account.method === 'demo' && (
            <p className="text-sm text-fg-muted">
              Demo account: lists are kept on this device. A real account will sync them between
              devices.
            </p>
          )}
          <Link
            to="/lists"
            className="flex min-h-11 w-fit items-center gap-1.5 text-sm font-semibold text-info"
          >
            Open My Lists <Icon name="arrow" className="size-4" />
          </Link>
        </section>

        <section
          aria-labelledby="signout-heading"
          className="grid content-start gap-2.5 rounded-card border border-card-border bg-card-bg p-4 shadow-card"
        >
          <h2 id="signout-heading" className="font-display text-2xl">
            Sign out
          </h2>
          <p className="text-sm text-fg-muted">
            Your lists stay in your account. This device goes back to guest mode.
          </p>
          {confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                ref={confirmRef}
                onPress={confirmSignOut}
                className="flex h-11 items-center rounded-button border border-button-secondary-border bg-button-secondary-bg px-3.5 text-sm font-semibold text-button-secondary-fg"
              >
                Yes, sign out
              </Button>
              <Button
                onPress={() => {
                  setConfirming(false)
                  // Return focus to "Sign out" once it's back on screen (next frame).
                  requestAnimationFrame(() => askRef.current?.focus())
                }}
                className="flex h-11 items-center rounded-button px-2 text-sm font-semibold text-info"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              ref={askRef}
              onPress={() => setConfirming(true)}
              className="flex h-11 w-36 items-center justify-center rounded-button border border-button-secondary-border bg-button-secondary-bg text-sm font-semibold text-button-secondary-fg"
            >
              Sign out
            </Button>
          )}
        </section>
      </div>
    </>
  )
}
