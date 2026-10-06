import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { z } from 'zod'
import { movieQueries } from '../api/queries'
import { imageUrl, releaseYear, type MovieSummary } from '../api/tmdb'
import { Icon } from '../components/Icon'
import { PageHeading } from '../components/PageHeading'
import { genreTone, primaryGenreName } from '../domain/genres'
import { useTagQueries } from '../session/tagQueries'
import { EmptyState } from './SearchPage'

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

// Until a scorer exists (Stage 5), Discover is TMDB-popular films minus disliked ones (ADR-0017).
export function DiscoverPage() {
  const [params] = useSearchParams()
  const { genres } = paramsSchema.parse(Object.fromEntries(params))
  const { data, isPending, isError } = useQuery(movieQueries.discover(genres))
  const excluded = useQuery(useTagQueries().feedExclusions()).data
  const films = (data?.results ?? []).filter((m) => !excluded?.has(m.id))
  const [feature, ...rest] = films

  return (
    <>
      <title>Discover · Deep Cuts</title>
      <PageHeading
        eyebrow={`${WEEKDAY.format(new Date())}’s edit`}
        title="Found for you"
        lede={
          genres.length ? 'Tuned to the genres you picked.' : 'Popular films worth staying up for.'
        }
      />
      {isPending && <p role="status">Finding films…</p>}
      {isError && (
        <EmptyState>Discover is unavailable right now. Try again in a moment.</EmptyState>
      )}
      {data && !feature && (
        <EmptyState>
          No films left in your feed. Films you dislike stay on the Disliked list in My Lists.
        </EmptyState>
      )}
      {feature && <FeatureCard movie={feature} />}
      {rest.length > 0 && (
        <section aria-labelledby="deeper" className="mt-6">
          <h2 id="deeper" className="text-lg font-semibold">
            Go a little deeper
          </h2>
          <p className="mb-2.5 text-sm text-fg-muted">Picked from beyond the obvious</p>
          {/* 16 tiles fill 2- and 4-column rows; the 16th hides at 5 columns (lg). */}
          <ul className="grid grid-cols-2 gap-x-4 gap-y-5.5 md:grid-cols-4 lg:grid-cols-5">
            {rest.slice(0, 16).map((m, i) => (
              <li key={m.id} className={i === 15 ? 'flex lg:hidden' : 'flex'}>
                <PosterCard movie={m} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

function FeatureCard({ movie }: { movie: MovieSummary }) {
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
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </picture>
      )}
      <div className="absolute inset-0 bg-linear-to-b from-transparent from-35% via-surface/40 via-60% to-surface" />
      <div className="absolute right-5 bottom-5.5 left-5">
        <p className="mb-1 text-sm tracking-[0.12em] text-fg-muted uppercase">
          Today’s featured deep cut
        </p>
        <h2 className="mb-2 font-display text-4xl leading-none text-balance md:text-5xl">
          {movie.title}
        </h2>
        <span className="block text-sm text-fg-muted">{meta.join(' · ')}</span>
        <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-info">
          <Icon name="eye" className="size-4" /> View details
        </span>
      </div>
    </Link>
  )
}

function PosterCard({ movie }: { movie: MovieSummary }) {
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
      <h3 className="mt-2 mb-1 line-clamp-3 min-h-[4.2em] text-sm leading-snug font-semibold">
        {movie.title}
      </h3>
      <p className="min-h-[1.4em] text-sm text-fg-muted">{meta.join(' · ')}</p>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-2.5 text-sm font-semibold text-info">
        <Icon name="eye" className="size-4" /> View details
      </span>
    </Link>
  )
}
