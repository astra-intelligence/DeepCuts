// The minimal layout for the account pages outside the main shell: Sign in (ADR-0025) and
// Create an account (ADR-0031). A Back button, the logo and one narrow column; no search band
// or tab bar, so nothing competes with the form.
import type { ReactNode } from 'react'
import { Button } from 'react-aria-components'
import { Link, useLocation, useNavigate } from 'react-router'
import { Icon } from '../components/Icon'
import { HOME } from '../config/features'
import { Logo } from '../components/Logo'
import { SkipLink } from './AppLayout'

/** The shared frame of the account pages: skip link, Back + logo header, and a narrow `<main>`. */
export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <div className="mx-auto min-h-svh w-full max-w-360">
      <title>{`${title} · Deep Cuts`}</title>
      <SkipLink />
      <header className="flex min-h-16 items-center justify-between gap-2.5 border-b border-border px-5 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2 md:px-8">
        {/* Back to the previous page; a page opened directly (no history) goes home. */}
        <Button
          onPress={() => (location.key === 'default' ? navigate(HOME.path) : navigate(-1))}
          className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm text-info"
        >
          <Icon name="back" /> Back
        </Button>
        <Link
          to={HOME.path}
          aria-label={`Deep Cuts, go to ${HOME.label}`}
          className="inline-flex min-h-11 items-center"
        >
          <Logo decorative className="h-7 w-auto" />
        </Link>
      </header>

      <main id="main" className="mx-auto grid w-full max-w-md gap-4 px-5 py-6">
        {children}
      </main>
    </div>
  )
}
