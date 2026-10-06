import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, type ReactNode } from 'react'
import { Button, ToggleButton } from 'react-aria-components'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { movieQueries } from '../api/queries'
import { imageUrl, releaseYear, type MovieSummary } from '../api/tmdb'
import { Icon } from '../components/Icon'
import { Logo } from '../components/Logo'
import { MovieSearch } from '../components/MovieSearch'
import { TagToggle } from '../components/TagToggle'
import { TAGS } from '../components/tags'
import { GENRES, primaryGenreName } from '../domain/genres'
import { useRouteFocus } from '../hooks/useRouteFocus'
import { useSetTag, useTagQueries } from '../session/tagQueries'
import { SignInLink, SkipLink } from './AppLayout'

const PICKS = 3
const ids = z
  .string()
  .regex(/^\d{1,6}(,\d{1,6}){0,9}$/)
  .transform((s) => s.split(',').map(Number))
// Onboarding state lives in the URL, so Detail → back restores it (ADR-0019 amendment).
const paramsSchema = z.object({
  step: z.coerce.number().int().min(1).max(3).catch(1).default(1),
  genres: ids.catch([]).default([]),
  favorite: z.coerce.number().int().positive().max(99_999_999).optional().catch(undefined),
  // The film on the rating card (a TMDB id) and how many cards have been shown (1..PICKS).
  pick: z.coerce.number().int().positive().max(99_999_999).optional().catch(undefined),
  n: z.coerce.number().int().min(1).max(PICKS).catch(1).default(1),
})
type TuneState = z.infer<typeof paramsSchema>

function useTuneState() {
  const [params, setParams] = useSearchParams()
  const state = paramsSchema.parse(Object.fromEntries(params))
  const update = (patch: Partial<TuneState>, replace = false) => {
    const next = { ...state, ...patch }
    const out: Record<string, string> = { step: String(next.step) }
    if (next.genres.length) out.genres = next.genres.join(',')
    if (next.favorite) out.favorite = String(next.favorite)
    if (next.pick) out.pick = String(next.pick)
    if (next.n > 1) out.n = String(next.n)
    setParams(out, { replace })
  }
  return [state, update] as const
}

export function TunePage() {
  useRouteFocus()
  const [state, update] = useTuneState()
  const background = useQuery(movieQueries.discover(state.genres)).data?.results[0]
  const image = imageUrl(background?.backdrop_path ?? null, 'w1280')

  // Each step change moves focus to its heading, instead of a page-wide live region.
  const main = useRef<HTMLElement>(null)
  const firstStep = useRef(true)
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false
      return
    }
    const h1 = main.current?.querySelector('h1')
    if (h1) {
      h1.tabIndex = -1
      h1.focus()
    }
  }, [state.step])

  return (
    <div className="relative mx-auto min-h-svh w-full max-w-360 overflow-x-clip">
      <title>Tune my picks · Deep Cuts</title>
      <SkipLink />
      {image && (
        <img
          src={image}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-80 saturate-75"
        />
      )}
      <div
        className={`absolute inset-0 ${
          state.step === 3
            ? 'bg-surface/80 backdrop-blur-sm'
            : 'bg-linear-to-b from-surface/10 via-surface/70 via-55% to-surface to-90% md:bg-radial md:from-surface/50 md:via-surface/80 md:to-surface'
        }`}
      />
      <header className="relative z-10 flex min-h-16 items-center justify-between gap-2.5 px-5 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2 md:px-8">
        <Link
          to="/discover"
          aria-label="Deep Cuts, go to Discover"
          className="inline-flex min-h-11 items-center"
        >
          <Logo className="h-7 w-auto" />
        </Link>
        <SignInLink />
      </header>
      <div className="relative z-10 mx-5 mt-1 md:mx-auto md:w-[min(46vw,33.75rem)]">
        <MovieSearch onPick={(m: MovieSummary) => update({ favorite: m.id }, true)} />
      </div>

      <main
        id="main"
        ref={main}
        className={`relative z-2 flex min-h-[calc(100svh-8rem)] flex-col justify-end px-5 pt-[7vh] pb-5 md:mx-auto md:justify-center md:px-10 md:py-[3vh] ${
          state.step === 3 ? 'md:w-full' : 'md:w-[min(100%,42.5rem)]'
        }`}
      >
        <p className="mb-3 text-sm font-semibold tracking-wide text-fg-muted">
          Step {state.step} of 3
        </p>
        {state.step === 1 && <GenreStep state={state} update={update} />}
        {state.step === 2 && <FavoriteStep state={state} update={update} />}
        {state.step === 3 && <RateStep state={state} update={update} />}
      </main>
    </div>
  )
}

type StepProps = { state: TuneState; update: ReturnType<typeof useTuneState>[1] }

function Prompt({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <div className="animate-[enter_0.4s_ease_both]">
      <p className="mb-2.5 text-sm font-bold tracking-[0.15em] text-accent uppercase">{eyebrow}</p>
      <h1 className="max-w-md font-display text-5xl leading-none tracking-tight text-balance md:text-6xl">
        {title}
      </h1>
      {children}
    </div>
  )
}

const primary =
  'ml-auto flex h-11 w-36 items-center justify-center gap-2 rounded-md bg-accent font-semibold text-on-accent hover:bg-accent/85 disabled:cursor-not-allowed disabled:border disabled:border-border disabled:bg-surface-overlay disabled:text-fg-muted'

function GenreStep({ state, update }: StepProps) {
  const toggle = (id: number, on: boolean) =>
    update(
      { genres: on ? [...state.genres, id].slice(0, 10) : state.genres.filter((g) => g !== id) },
      true,
    )
  return (
    <Prompt eyebrow="Make it yours" title="What are you into?">
      <p className="mt-3 mb-4 max-w-md leading-relaxed text-fg-muted">
        Choose a few. We’ll find the films hiding between the obvious picks.
      </p>
      <div role="group" aria-label="Genres" className="mb-4 flex flex-wrap gap-2">
        {Object.entries(GENRES).map(([id, g]) => {
          const selected = state.genres.includes(Number(id))
          return (
            <ToggleButton
              key={id}
              isSelected={selected}
              onChange={(on) => toggle(Number(id), on)}
              className="flex min-h-11 items-center gap-1.5 rounded-full border border-border-control bg-surface-raised/80 px-4 text-sm data-selected:border-accent data-selected:bg-surface-selected data-selected:text-on-selected"
            >
              {selected && <Icon name="check" className="size-4" />}
              {g.name}
            </ToggleButton>
          )
        })}
      </div>
      <Button
        isDisabled={state.genres.length === 0}
        onPress={() => update({ step: 2 })}
        className={primary}
      >
        Continue <Icon name="arrow" />
      </Button>
    </Prompt>
  )
}

function FavoriteStep({ state, update }: StepProps) {
  const favorite = useQuery({
    ...movieQueries.detail(state.favorite ?? 0),
    enabled: !!state.favorite,
  }).data
  return (
    <>
      <Button
        onPress={() => update({ step: 1 })}
        className="mb-3.5 -ml-2 flex min-h-11 w-fit items-center gap-1 px-2 text-sm text-fg-muted"
      >
        <Icon name="back" /> Back
      </Button>
      <Prompt eyebrow="One more signal" title="What’s your favorite movie?">
        <p className="mt-3 mb-4 max-w-md leading-relaxed text-fg-muted">
          Use the search above to find a favorite. You can tag it there and come right back.
        </p>
        {favorite && (
          <p className="mb-3 ml-auto flex w-fit items-center gap-2 rounded-lg border border-accent bg-surface-selected px-3 py-1.5 text-on-selected">
            <Icon name="check" />
            <span className="flex flex-col">
              <small className="text-sm text-fg-muted">Your pick</small>
              <strong className="text-sm">{favorite.title}</strong>
            </span>
          </p>
        )}
        <Button
          isDisabled={!favorite}
          onPress={() => update({ step: 3, pick: undefined, n: 1 })}
          className={primary}
        >
          Find my taste <Icon name="arrow" />
        </Button>
        <Button
          onPress={() => update({ step: 3, pick: undefined, n: 1 })}
          className="mt-1 ml-auto block min-h-11 px-3 text-sm text-fg-muted"
        >
          Skip favorite movie
        </Button>
      </Prompt>
    </>
  )
}

function RateStep({ state, update }: StepProps) {
  const navigate = useNavigate()
  const queries = useTagQueries()
  const results = useQuery(movieQueries.discover(state.genres)).data?.results
  const excluded = useQuery(queries.feedExclusions()).data
  const setTag = useSetTag()
  // The card is tracked by film id, so tagging it (even Dislike) never shifts the sequence.
  // Films you had already disliked are never offered (ADR-0017).
  const pool = (results ?? []).filter((m) => m.id !== state.favorite)
  const current = state.pick
    ? pool.findIndex((m) => m.id === state.pick)
    : pool.findIndex((m) => !excluded?.has(m.id))
  const pick = pool[current]
  const tags = useQuery({ ...queries.forMovie(pick?.id ?? 0), enabled: !!pick }).data
  // Pin the first card's id in the URL, so tagging it can't change which card is shown.
  const pinId = !state.pick && pick ? pick.id : undefined
  useEffect(() => {
    if (pinId) update({ pick: pinId }, true)
  }, [pinId]) // eslint-disable-line react-hooks/exhaustive-deps -- update is recreated each render

  function next() {
    const after = pool.findIndex((m, i) => i > current && !excluded?.has(m.id))
    if (state.n >= PICKS || after === -1) {
      navigate(state.genres.length ? `/discover?genres=${state.genres.join(',')}` : '/discover')
    } else {
      update({ pick: pool[after]?.id, n: state.n + 1 }, true)
    }
  }

  if (!results) return <p role="status">Finding films for you…</p>
  if (!pick) {
    return (
      <Prompt eyebrow="Tune your picks" title="That’s everything for now">
        <Link to="/discover" className={`${primary} mt-4`}>
          Go to Discover <Icon name="arrow" />
        </Link>
      </Prompt>
    )
  }

  const image = imageUrl(pick.backdrop_path ?? pick.poster_path, 'w1280')
  const meta = [releaseYear(pick.release_date), primaryGenreName(pick.genre_ids)].filter(Boolean)
  return (
    <div className="mx-auto w-full max-w-3xl animate-[enter_0.4s_ease_both] md:max-w-4xl">
      <div className="mb-2.5 flex items-end justify-between gap-3">
        <div>
          <p className="mb-2.5 text-sm font-bold tracking-[0.15em] text-accent uppercase">
            Tune your picks · {state.n} of {PICKS}
          </p>
          <h1 className="font-display text-4xl tracking-tight md:text-5xl">What do you think?</h1>
        </div>
      </div>
      <article
        aria-label={pick.title}
        className="relative flex min-h-130 flex-col justify-end overflow-hidden rounded-lg border border-border bg-surface-raised shadow-sm md:h-[min(66svh,38.75rem)]"
      >
        {image && <img src={image} alt="" className="absolute inset-0 size-full object-cover" />}
        <div className="absolute inset-0 bg-linear-to-b from-transparent from-20% via-surface/30 via-45% to-surface to-70%" />
        <div className="relative px-4.5 pb-3">
          <p className="mb-1 text-sm text-info">{meta.join(' · ')}</p>
          <h2
            className={`font-display ${pick.title.length > 55 ? 'text-3xl' : 'text-4xl'} leading-tight`}
          >
            {pick.title}
          </h2>
        </div>
        <div
          role="group"
          aria-label={`Your tags for ${pick.title}`}
          className="relative grid grid-cols-2 gap-2 p-3 md:grid-cols-5"
        >
          {TAGS.map((t) => (
            <TagToggle
              key={t.tag}
              tag={t}
              detailed
              isSelected={tags?.has(t.tag) ?? false}
              onChange={(on) => setTag.mutate({ tmdbId: pick.id, tag: t.tag, on })}
              className="min-h-15 md:min-h-21"
            />
          ))}
          <Button
            onPress={next}
            className="col-span-2 flex h-11 w-36 items-center justify-center gap-2 self-center justify-self-center rounded-md bg-accent px-3.5 font-semibold text-on-accent hover:bg-accent/85 md:col-span-1"
          >
            <Icon name="arrow" /> Next film
          </Button>
        </div>
      </article>
    </div>
  )
}
