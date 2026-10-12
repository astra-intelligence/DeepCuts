// The confirmation shown once after signing in, at the top of the page sign-in returned to.
import { useLocation } from 'react-router'
import { z } from 'zod'
import { firstName } from '../adapters/SessionProvider'
import { useSession } from '../session/SessionContext'
import { Icon } from './Icon'

// Set by the sign-in page when it navigates back; history state is untrusted, so validated.
const stateSchema = z.object({ signedIn: z.literal(true) })

/** "Signed in as Mike." Announced once, politely. */
export function SignedInNotice() {
  const { session } = useSession()
  const parsed = stateSchema.safeParse(useLocation().state)
  // Only right after signing in (the navigation carries `signedIn`), and only while signed in.
  if (!parsed.success || session.kind !== 'account') return null
  return (
    <p
      // role=status: screen readers announce it without interrupting.
      role="status"
      className="mb-4 flex items-center gap-2 rounded-container border border-accent bg-surface-selected px-3 py-2.5 text-sm text-fg-on-selected"
    >
      <Icon name="check" className="size-4.5 shrink-0" />
      Signed in as {firstName(session.account.name)}.
    </p>
  )
}
