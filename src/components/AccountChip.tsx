import { Link, useLocation } from 'react-router'
import { firstName } from '../adapters/SessionProvider'
import { useSession } from '../session/SessionContext'
import { Icon } from './Icon'

const chip =
  'flex min-h-11 items-center gap-2 rounded-lg border border-border-control bg-surface-raised py-1 pr-3 pl-1 text-sm font-bold whitespace-nowrap text-fg'

/** Header account control (ADR-0025): "Sign in" until signed in, then initial + first name. */
export function AccountChip() {
  const { session } = useSession()
  const { pathname, search } = useLocation()

  if (session.kind === 'account') {
    const first = firstName(session.account.name)
    return (
      <Link to="/account" aria-label={`${first}, open your account`} className={chip}>
        <Avatar name={session.account.name} />
        {first}
      </Link>
    )
  }
  return (
    // Remember where sign-in started, so it can return there.
    <Link to="/sign-in" state={{ from: pathname + search }} className={chip}>
      <span className="grid size-9 place-items-center rounded-md bg-surface-overlay text-fg-muted">
        <Icon name="user" />
      </span>
      Sign in
    </Link>
  )
}

/** A circle with the first letter of the name; decorative, the name is always nearby. */
export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full border border-accent bg-surface-selected font-bold text-fg-on-selected ${
        large ? 'size-14 text-2xl' : 'size-9 text-base'
      }`}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}
