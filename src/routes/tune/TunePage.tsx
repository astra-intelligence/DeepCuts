import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { movieQueries } from '../../api/queries'
import { imageUrl, type MovieSummary } from '../../api/tmdb'
import { Logo } from '../../components/Logo'
import { MovieSearch } from '../../components/MovieSearch'
import { useRouteFocus } from '../../hooks/useRouteFocus'
import { SignInLink, SkipLink } from '../AppLayout'
import { FavoriteStep } from './FavoriteStep'
import { GenreStep } from './GenreStep'
import { RateStep } from './RateStep'
import { useTuneState } from './useTuneState'

/** "Tune my picks": optional three-step onboarding outside the tab-bar shell (ADR-0019). */
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
      <div className="relative z-10 mx-5 mt-1 md:mx-auto md:w-full md:max-w-xl">
        <MovieSearch onPick={(m: MovieSummary) => update({ favorite: m.id }, true)} />
      </div>

      <main
        id="main"
        ref={main}
        className={`relative z-2 flex min-h-[calc(100svh-8rem)] flex-col justify-end px-5 pt-16 pb-5 md:mx-auto md:justify-center md:px-10 md:py-6 ${
          state.step === 3 ? 'md:w-full' : 'md:w-full md:max-w-2xl'
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
