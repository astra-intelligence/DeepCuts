import { useState } from 'react'
import { Button } from 'react-aria-components'
import { Link } from 'react-router'
import { Icon } from '../components/Icon'
import { PageHeading } from '../components/PageHeading'
import { useSession } from '../session/SessionContext'

// ADR-0022: one page explains saving. Copy never implies cross-device sync (ADR-0013).
export function AccountPage() {
  const { session, createProfile } = useSession()
  const saved = session.kind === 'profile'
  const [status, setStatus] = useState('')

  async function save() {
    await createProfile()
    setStatus('Your picks are saved on this device.')
  }

  return (
    <>
      <title>Account · Deep Cuts</title>
      <PageHeading
        eyebrow="Your account"
        title="Sign in to keep your cuts"
        lede="Keep your lists on this device now. Accounts that sync between devices are coming later."
      />

      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised p-3 shadow-sm">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-accent bg-surface-selected text-on-selected">
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

      <div className="mt-3 grid items-stretch gap-3 md:grid-cols-2">
        <section
          aria-labelledby="local-heading"
          className="flex min-h-62 flex-col items-start rounded-lg border border-border bg-surface-raised p-4.5 shadow-sm"
        >
          <span className="mb-4.5 grid size-11 place-items-center rounded-lg bg-surface-selected text-accent">
            <Icon name="bookmark" />
          </span>
          <p className="mb-2.5 text-sm font-bold tracking-[0.15em] text-accent uppercase">
            On this device
          </p>
          <h2 id="local-heading" className="mb-2 font-display text-3xl">
            Keep your lists locally
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-fg-muted">
            Save Seen it, Want to see, Like and Dislike on this device without registering.
          </p>
          {saved ? (
            <strong className="mt-auto flex min-h-11 items-center gap-2 rounded-md border border-accent bg-surface-selected px-3.5 text-sm font-semibold text-on-selected">
              <Icon name="check" /> Saved on this device
            </strong>
          ) : (
            <Button
              onPress={save}
              className="mt-auto flex h-11 w-36 items-center justify-center gap-2 rounded-md border border-accent bg-surface-selected text-sm font-semibold text-on-selected hover:bg-accent/15"
            >
              Save my picks
            </Button>
          )}
        </section>

        <section
          aria-labelledby="register-heading"
          className="flex min-h-62 flex-col items-start rounded-lg border border-border bg-surface-raised p-4.5 shadow-sm"
        >
          <span className="mb-4.5 grid size-11 place-items-center rounded-lg bg-info/12 text-info">
            <Icon name="heart" />
          </span>
          <p className="mb-2.5 text-sm font-bold tracking-[0.15em] text-info uppercase">
            Registration
          </p>
          <h2 id="register-heading" className="mb-2 font-display text-3xl">
            Create your Deep Cuts account
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-fg-muted">
            An account will keep your lists available when you move between devices.
          </p>
          <ul className="mb-4 list-disc pl-5 text-sm leading-loose">
            <li>Keep all four movie lists</li>
            <li>Preserve discovery preferences</li>
            <li>Return to recently viewed films</li>
          </ul>
          <Button
            isDisabled
            className="mt-auto flex h-11 w-36 cursor-not-allowed items-center justify-center rounded-md border border-info bg-info/12 text-sm font-semibold text-info"
          >
            Coming soon
          </Button>
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
