import { useQuery } from '@tanstack/react-query'
import { useEffect, useEffectEvent } from 'react'
import { Button } from 'react-aria-components'
import { Link, useNavigate } from 'react-router'
import { movieQueries } from '../../api/queries'
import { imageUrl, releaseYear } from '../../api/tmdb'
import { Eyebrow } from '../../components/Eyebrow'
import { Icon } from '../../components/Icon'
import { TagToggle } from '../../components/TagToggle'
import { TAGS } from '../../components/tags'
import { primaryGenreName } from '../../domain/genres'
import { useSetTag, useTagQueries } from '../../session/tagQueries'
import { Prompt } from './Prompt'
import { primary } from './styles'
import { PICKS, type StepProps } from './useTuneState'

/** Step 3: rate a few films with the four tags, then finish on Discover. */
export function RateStep({ state, update }: StepProps) {
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
  // useEffectEvent reads the latest `update` without making it an effect dependency.
  const pinId = !state.pick && pick ? pick.id : undefined
  const pin = useEffectEvent((id: number) => update({ pick: id }, true))
  useEffect(() => {
    if (pinId) pin(pinId)
  }, [pinId])

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
    <div className="mx-auto w-full max-w-3xl animate-enter md:max-w-4xl">
      <div className="mb-2.5 flex items-end justify-between gap-3">
        <div>
          <Eyebrow>
            Tune your picks · {state.n} of {PICKS}
          </Eyebrow>
          <h1 className="font-display text-4xl tracking-tight md:text-5xl">What do you think?</h1>
        </div>
      </div>
      <article
        aria-label={pick.title}
        className="relative flex min-h-130 flex-col justify-end overflow-hidden rounded-lg border border-border bg-surface-raised shadow-sm md:min-h-140"
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
