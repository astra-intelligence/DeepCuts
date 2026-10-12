// The route guard for every signed-in page (ADR-0034).
//
// Signed out, the app is the landing page plus Sign in and Register. Any other page sends the
// visitor to Sign in, carrying where they were going in history state (`from`, read back by
// useReturnPath, which accepts only same-app paths), so signing in lands them on that page.
//
// Signing out (or deleting the account) on a guarded page is different: the person chose to
// leave, so they go to the landing page, not to a sign-in prompt for the page they just left.
import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { HOME } from '../config/features'
import { useSession } from '../session/SessionContext'

/** A layout route: renders its child route when signed in, otherwise redirects (see above). */
export function RequireAccount() {
  const { session } = useSession()
  const { pathname, search } = useLocation()
  // Whether this guard first rendered signed in. If so, a signed-out session now means the
  // person signed out here (the guard stays mounted while its child pages change).
  const [startedSignedIn] = useState(session.kind === 'account')
  if (session.kind === 'account') return <Outlet />
  if (startedSignedIn) return <Navigate to={HOME.path} replace />
  // `replace`: Back from Sign in shouldn't bounce straight into this redirect again.
  return <Navigate to="/sign-in" replace state={{ from: pathname + search }} />
}
