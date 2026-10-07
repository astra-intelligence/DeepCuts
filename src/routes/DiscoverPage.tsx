import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { z } from 'zod'
import { movieQueries } from '../api/queries'
import { imageUrl, releaseYear, type MovieSummary } from '../api/tmdb'
import { FEATURES } from '../config/features'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { PageHeading } from '../components/PageHeading'
import { genreTone, primaryGenreName } from '../domain/genres'
import { useTagQueries } from '../session/tagQueries'
import { useRecommendations } from '../session/useRecommendations'

// ?genres= comes from "Tune my picks" (comma-separated TMDB ids); untrusted, so validated.
const paramsSchema = z.object({
  genres: z
    .string()
    .regex(/^\d{1,6}(,\d{1,6}){0,9}$/)
    .transform((s) => s.split(',').map(Number))
    .catch([])
    .default([]),
})

const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'long' })

// With likes, Discover ranks films with the scorer (ADR-0026). Without likes it shows popular films
// minus disliked ones, and says how to tune it.
export function DiscoverPage() {
  const [params] = useSearchParams()
  const { genres } = paramsSchema.parse(Object.fromEntries(params))
  const tuned = useRecommendations(17)
  const popular = useQuery(movieQueries.discover(genres))
  const excluded = useQuery(useTagQueries().feedExclusions()).data

  const usePicks = tuned.hasLikes && (tuned.loading || tuned.recommendations.length > 0)
  const items: Item[] = usePicks
    ? tuned.recommendations.map((r) => ({ movie: r.movie, match: r.match, because: r.because }))
    : (popular.data?.results ?? []).filter((m) => !excluded?.has(m.id)).map((movie) => ({ movie }))
  const loading = usePicks ? tuned.loading : popular.isPending
  const [feature, ...rest] = items

  return (
    <>
      <title>Discover · Deep Cuts</title>
      <PageHeading
        eyebrow={`${WEEKDAY.format(new Date())}’s edit`}
        title="Found for you"
        lede={
          usePicks
            ? 'Picked from the films you liked, beyond the obvious.'
            : genres.length
              ? 'Tuned to the genres you picked.'
              : 'Popular films worth staying up for. Like a few films to tune this feed to you.'
        }
      />
      {loading && <p role="status">Finding films…</p>}
      {!usePicks && popular.isError && (
        <EmptyState>Discover is unavailable right now. Try again in a moment.</EmptyState>
      )}
      {!loading && !feature && !(!usePicks && popular.isError) && (
        <EmptyState>
          No films left in your feed. Films you dislike stay on the Disliked list in My Lists.
        </EmptyState>
      )}
      {feature && <FeatureCard item={feature} />}
      {rest.length > 0 && (
        <section aria-labelledby="deeper" className="mt-6">
          <h2 id="deeper" className="text-lg font-semibold">
            Go a little deeper
          </h2>
          <p className="mb-2.5 text-sm text-fg-muted">Picked from beyond the obvious</p>
          {/* 16 tiles fill 2- and 4-column rows; the 16th hides at 5 columns (lg). */}
          <ul className="grid grid-cols-2 gap-x-4 gap-y-5.5 md:grid-cols-4 lg:grid-cols-5">
            {rest.slice(0, 16).map((item, i) => (
              <li key={item.movie.id} className={i === 15 ? 'flex lg:hidden' : 'flex'}>
                <PosterCard item={item} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {usePicks && FEATURES.weightsLab && (
        <p className="mt-6 text-sm text-fg-muted">
          Curious how these are ranked?{' '}
          <Link to="/discover/weights" className="text-info underline">
            Tune the weights
          </Link>
        </p>
      )}
    </>
  )
}

/** A film in the feed, with its match and reasons when it came from the scorer. */
interface Item {
  movie: MovieSummary
  match?: number
  because?: string[]
}

/** "Because you liked Alien and The Thing" */
function Because({ titles }: { titles: string[] | undefined }) {
  if (!titles?.length) return null
  return (
    <span className="mt-1 block text-sm text-fg-muted">
      Because you liked <cite className="text-fg not-italic">{titles.join(' and ')}</cite>
    </span>
  )
}

function FeatureCard({ item }: { item: Item }) {
  const { movie } = item
  const poster = imageUrl(movie.poster_path, 'w780')
  const backdrop = imageUrl(movie.backdrop_path, 'w1280')
  const meta = [releaseYear(movie.release_date), primaryGenreName(movie.genre_ids)].filter(Boolean)
  return (
    <Link
      to={`/movie/${movie.id}`}
      style={genreTone(movie.genre_ids)}
      className="group relative block aspect-4/5 w-full overflow-hidden rounded-lg border border-(--tone) bg-surface-raised shadow-sm md:aspect-auto md:h-110"
    >
      {(poster || backdrop) && (
        <picture>
          {backdrop && <source media="(min-width: 768px)" srcSet={backdrop} />}
          <img
            src={poster ?? backdrop ?? undefined}
            alt=""
            className="size-full object-cover transition-transform duration-500 group-hover:scale-102"
          />
        </picture>
      )}
      <div className="absolute inset-0 bg-linear-to-b from-transparent from-35% via-surface/40 via-60% to-surface" />
      <div className="absolute right-5 bottom-5.5 left-5">
        <p className="mb-1 text-sm tracking-widest text-fg-muted uppercase">
          {item.match !== undefined && (
            <span className="mr-2 font-bold tracking-normal text-accent normal-case">
              {item.match}% match ·
            </span>
          )}
          Today’s featured deep cut
        </p>
        <h2 className="mb-2 font-display text-4xl leading-none text-balance md:text-5xl">
          {movie.title}
        </h2>
        <span className="block text-sm text-fg-muted">{meta.join(' · ')}</span>
        <Because titles={item.because} />
        <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-info">
          <Icon name="eye" className="size-4" /> View details
        </span>
      </div>
    </Link>
  )
}

function PosterCard({ item }: { item: Item }) {
  const { movie } = item
  const poster = imageUrl(movie.poster_path, 'w342')
  const meta = [releaseYear(movie.release_date), primaryGenreName(movie.genre_ids)].filter(Boolean)
  return (
    <Link
      to={`/movie/${movie.id}`}
      style={genreTone(movie.genre_ids)}
      className="flex min-w-0 flex-1 flex-col rounded-md"
    >
      {poster ? (
        <img
          src={poster}
          alt=""
          loading="lazy"
          className="aspect-2/3 w-full rounded-md border border-b-3 border-border-control border-b-(--tone) object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="aspect-2/3 w-full rounded-md border border-b-3 border-border-control border-b-(--tone) bg-surface-overlay"
        />
      )}
      <h3 className="mt-2 mb-1 line-clamp-3 min-h-15 text-sm leading-snug font-semibold">
        {movie.title}
      </h3>
      <p className="min-h-5 text-sm text-fg-muted">{meta.join(' · ')}</p>
      {item.match !== undefined && (
        <p className="text-sm font-bold text-accent">{item.match}% match</p>
      )}
      <Because titles={item.because?.slice(0, 1)} />
      <span className="mt-auto inline-flex items-center gap-1.5 pt-2.5 text-sm font-semibold text-info">
        <Icon name="eye" className="size-4" /> View details
      </span>
    </Link>
  )
}
