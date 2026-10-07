// The registration page (/register, ADR-0030): the fields a real account will need (name, email,
// password), validated with Zod, laid out plainly until the owner designs it.
//
// No backend exists yet (ADR-0003 deferred), so submitting makes a *practice* account on this
// device. The page says so, and the session provider keeps only the name: the email and password
// are checked, then discarded. Like sign-in, the person's picks move into the new account and the
// page returns to where sign-in started.
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Button,
  FieldError,
  Form,
  Group,
  Input,
  Label,
  Text,
  TextField,
  ToggleButton,
} from 'react-aria-components'
import { Link, Navigate, useNavigate } from 'react-router'
import { z } from 'zod'
import { registrationSchema } from '../adapters/SessionProvider'
import { Eyebrow } from '../components/Eyebrow'
import { Icon } from '../components/Icon'
import { useReturnPath } from '../hooks/useReturnPath'
import { useRouteFocus } from '../hooks/useRouteFocus'
import { useSession } from '../session/SessionContext'
import { useTagQueries } from '../session/tagQueries'
import { AuthLayout } from './AuthLayout'

// Field errors by field name, in the shape React Aria's <Form validationErrors> expects.
type FieldErrors = Record<string, string[]>

// Shared field styles. The whole field box shows the focus ring (focus-ring-within), and turns
// the danger color while it has an error.
const fieldBox =
  'focus-ring-within flex min-h-12 items-center rounded-field border border-field-border bg-field-bg focus-within:border-field-border-focus group-data-invalid:border-fg-danger'
const inputClass =
  'min-w-0 flex-1 self-stretch bg-transparent px-3 text-base text-fg outline-none placeholder:text-fg-placeholder'

/** The registration page (ADR-0030): name, email and password, then a practice account. */
export function RegisterPage() {
  useRouteFocus()
  const { session, register } = useSession()
  const navigate = useNavigate()
  const from = useReturnPath()
  // How many films the person has tagged, to reassure them their picks come along.
  const picks = new Set(useQuery(useTagQueries().all()).data?.map((r) => r.tmdbId)).size

  const [errors, setErrors] = useState<FieldErrors>({})
  // Bumped on every rejected submit, so focus moves to the first problem even if the errors match.
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // After a rejected submit, put the cursor in the first field that needs fixing (its error
  // message is read out with it, through aria-describedby).
  useEffect(() => {
    if (attempt === 0) return
    formRef.current?.querySelector<HTMLInputElement>('input[aria-invalid="true"]')?.focus()
  }, [attempt])

  // Arriving already signed in goes to the account page (not after registering here: then the
  // page returns to where sign-in started, and `pending` stays set until it does).
  if (session.kind === 'account' && !pending) return <Navigate to="/account" replace />

  // Validates every field at once, then registers and returns to where sign-in started.
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFailed(false)
    const result = registrationSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)))
    if (!result.success) {
      setErrors(z.flattenError(result.error).fieldErrors)
      setAttempt((n) => n + 1)
      return
    }
    setErrors({})
    setPending(true)
    try {
      const { moved } = await register(result.data)
      navigate(from, { replace: true, state: { signedIn: { moved } } })
    } catch {
      setFailed(true)
      setPending(false)
    }
  }

  return (
    <AuthLayout title="Create an account">
      <div>
        <Eyebrow>Your account</Eyebrow>
        <h1 className="font-display text-4xl leading-none tracking-tight">Create an account</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Keep your lists in your account instead of a single browser.
        </p>
      </div>

      {/* ADR-0025's rule: a mock must never pass for a real account. */}
      <p className="rounded-container border border-dashed border-border-control p-3 text-sm text-fg-muted">
        <strong className="text-fg">Practice registration.</strong> No real account is created. Your
        name is kept on this device; your email and password are checked, then discarded.
      </p>

      {failed && (
        <p
          role="alert"
          className="flex gap-2.5 rounded-container border border-fg-danger bg-fg-danger/10 p-3 text-sm"
        >
          <Icon name="ban" className="size-5 shrink-0 text-fg-danger" />
          Registration didn’t finish. Nothing was changed. Try again.
        </p>
      )}

      {/* validationBehavior="aria": the browser's own popups stay off; Zod's messages show under
          each field instead, and editing a field clears its message. */}
      <Form
        ref={formRef}
        onSubmit={submit}
        validationErrors={errors}
        validationBehavior="aria"
        className="grid gap-4"
      >
        <TextField name="name" isRequired autoComplete="name" className="group grid gap-1.5">
          <Label className="text-sm font-semibold">Name</Label>
          <div className={fieldBox}>
            <Input className={inputClass} />
          </div>
          <Text slot="description" className="text-sm text-fg-muted">
            Shown in the header and on your account.
          </Text>
          <FieldError className="text-sm text-fg-danger" />
        </TextField>

        <TextField
          name="email"
          type="email"
          isRequired
          autoComplete="email"
          inputMode="email"
          className="group grid gap-1.5"
        >
          <Label className="text-sm font-semibold">Email</Label>
          <div className={fieldBox}>
            {/* No auto-capitalising or spell-check on phones: they'd mangle an address. */}
            <Input className={inputClass} autoCapitalize="none" spellCheck={false} />
          </div>
          <FieldError className="text-sm text-fg-danger" />
        </TextField>

        <TextField
          name="password"
          type={showPassword ? 'text' : 'password'}
          isRequired
          autoComplete="new-password"
          className="group grid gap-1.5"
        >
          <Label className="text-sm font-semibold">Password</Label>
          {/* A show/hide toggle instead of a "confirm password" field: people can check what
              they typed without typing it twice. */}
          <Group className={fieldBox}>
            <Input className={inputClass} autoCapitalize="none" spellCheck={false} />
            <ToggleButton
              isSelected={showPassword}
              onChange={setShowPassword}
              aria-label="Show password"
              className="m-1 min-h-10 rounded-button px-3 text-sm font-semibold text-info"
            >
              Show
            </ToggleButton>
          </Group>
          <Text slot="description" className="text-sm text-fg-muted">
            At least 15 characters. A few unrelated words work well.
          </Text>
          <FieldError className="text-sm text-fg-danger" />
        </TextField>

        <Button
          type="submit"
          isPending={pending}
          className="flex min-h-12 w-full items-center justify-center rounded-button bg-button-primary-bg text-sm font-semibold text-button-primary-fg hover:bg-button-primary-bg/85 data-pending:opacity-70"
        >
          Create account
        </Button>
      </Form>
      <p role="status" className="text-sm text-fg-muted empty:hidden">
        {pending ? 'Creating your account…' : ''}
      </p>

      {picks > 0 && (
        <p className="flex items-start gap-2.5 text-sm text-fg-muted">
          <Icon name="check" className="mt-0.5 size-4.5 shrink-0 text-accent" />
          Your {picks} {session.kind === 'profile' ? 'saved' : 'unsaved'}{' '}
          {picks === 1 ? 'pick comes' : 'picks come'} with your new account.
        </p>
      )}
      <p className="text-sm text-fg-muted">
        Already have an account?{' '}
        <Link to="/sign-in" state={{ from }} className="text-info underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
