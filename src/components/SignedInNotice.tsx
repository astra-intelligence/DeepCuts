import { useLocation } from 'react-router'
import { z } from 'zod'
import { firstName } from '../adapters/SessionProvider'
import { useSession } from '../session/SessionContext'
import { Icon } from './Icon'

// Set by the sign-in page when it navigates back; history state is untrusted, so validated.
const stateSchema = z.object({
  signedIn: z.object({ moved: z.number().int().min(0).max(100_000) }),
})

/** "Signed in as Alex. Your 3 picks are in your account." Announced once, politely. */
export function SignedInNotice() {
  const { session } = useSession()
  const parsed = stateSchema.safeParse(useLocation().state)
  if (!parsed.success || session.kind !== 'account') return null
  const { moved } = parsed.data.signedIn
  const picks = moved === 1 ? 'pick is' : 'picks are'
  return (
    <p
      role="status"
      className="mb-4 flex items-center gap-2 rounded-container border border-accent bg-surface-selected px-3 py-2.5 text-sm text-fg-on-selected"
    >
      <Icon name="check" className="size-4.5 shrink-0" />
      Signed in as {firstName(session.account.name)}.
      {moved > 0 && ` Your ${moved} ${picks} in your account.`}
    </p>
  )
}
