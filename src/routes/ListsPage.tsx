// My Lists (/lists): the films on each of the four tag lists.
//
// Four tiles pick the list (`?tag=`, so it's linkable); the page accent switches to that tag's
// color (ADR-0020). Each film loads its details from TMDB, cached for a day. Phones list the films
// as rows; from `md` they're cassettes, sized like Home's picks (owner, 2026-10-09: phones
// unchanged).
import { useQueries, useQuery } from '@tanstack/react-query'
import type { CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router'
import { z } from 'zod'
import { movieQueries } from '../api/queries'
import { certification, creditsOf, formatRuntime, releaseYear, summaryOf } from '../api/tmdb'
import { CassetteCard } from '../components/CassetteCard'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { MovieLink } from '../components/MovieLink'
import { PageHeading } from '../components/PageHeading'
import { tagColor, TAGS } from '../components/tags'
import { genreTone } from '../domain/genres'
import { SYSTEM_TAGS, type SystemTag } from '../domain/tagRules'
import { MD_UP, useMediaQuery } from '../hooks/useMediaQuery'
import { useTagQueries } from '../session/tagQueries'

// ?tag= is untrusted; anything unknown falls back to Want to see (ADR-0014).
const paramsSchema = z.object({ tag: z.enum(SYSTEM_TAGS).catch('watchlist').default('watchlist') })

// Literal class names so Tailwind generates them (ADR-0020 page accent).
const PAGE_ACCENT: Record<SystemTag, string> = {
  seen: 'page-accent-seen',
  watchlist: 'page-accent-watchlist',
  liked: 'page-accent-liked',
  disliked: 'page-accent-disliked',
}

/** The My Lists page. */
export function ListsPage() {
  const [params] = useSearchParams()
  const { tag } = paramsSchema.parse(Object.fromEntries(params))
  const queries = useTagQueries()
  // All four lists load at once, for the counts on the tiles.
  const counts = useQueries({ queries: TAGS.map((t) => queries.list(t.tag)) })
  const ids = counts[SYSTEM_TAGS.indexOf(tag)]?.data ?? []
  const label = TAGS.find((t) => t.tag === tag)?.label ?? ''
  const cassettes = useMediaQuery(MD_UP)

  return (
    <div className={PAGE_ACCENT[tag]}>
      <title>{`My Lists: ${label} · Deep Cuts`}</title>
      <PageHeading
        eyebrow="Your corner"
        title="My Lists"
        lede="Everything you’ve tagged, in one place."
      />

      {/* The four list tiles. The current one is marked with aria-current and its tag color. */}
      <nav aria-label="Lists" className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {TAGS.map((t, i) => {
          const n = counts[i]?.data?.length ?? 0
          const active = t.tag === tag
          return (
            <Link
              key={t.tag}
              to={`?tag=${t.tag}`}
              aria-current={active ? 'true' : undefined}
              style={tagColor(t.tag) as CSSProperties}
              className={`flex min-h-27 flex-col items-start rounded-card border p-3 shadow-card md:min-h-34 ${
                active
                  ? 'border-(--tag) bg-(--tag)/10'
                  : 'border-card-border bg-card-bg hover:border-border-control'
              }`}
            >
              <Icon name={t.icon} className="mb-auto size-5 text-(--tag)" />
              <strong className="mt-3 text-sm font-semibold">{t.label}</strong>
              <span className="mt-0.5 text-sm text-fg-muted">
                {n} {n === 1 ? 'film' : 'films'}
              </span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-4.5 mb-3 flex justify-between gap-4 border-b border-border pb-2 text-sm text-fg-muted">
        <h2>
          Filtered by <strong className="text-contextual">{label}</strong>
        </h2>
        <span role="status">
          {ids.length} {ids.length === 1 ? 'result' : 'results'}
        </span>
      </div>

      {ids.length > 0 ? (
        cassettes ? (
          <ul className="grid grid-cols-4 gap-x-4 gap-y-5.5 lg:grid-cols-5">
            {ids.map((id) => (
              <ListCassette key={id} id={id} />
            ))}
          </ul>
        ) : (
          <ul className="flex flex-col gap-3">
            {ids.map((id) => (
              <ListRow key={id} id={id} />
            ))}
          </ul>
        )
      ) : (
        <EmptyState>
          Films you tag “{label}” will appear here. Use the search above, or open any film and tap{' '}
          {label}.
        </EmptyState>
      )}
    </div>
  )
}

// One film on the list. Shows a pulsing placeholder until its details arrive.
function ListRow({ id }: { id: number }) {
  // Each listed film needs its details once; the 24h cache makes repeat visits free (ADR-0015).
  const { data: m } = useQuery(movieQueries.detail(id))
  if (!m) {
    return (
      <li
        aria-hidden="true"
        className="h-32 animate-pulse rounded-card border border-card-border bg-card-bg"
      />
    )
  }
  const meta = [
    releaseYear(m.release_date),
    m.genres[0]?.name ?? '',
    formatRuntime(m.runtime),
    certification(m, 'US'),
  ].filter(Boolean)
  return (
    <li
      style={genreTone(m.genres.map((g) => g.id))}
      className="rounded-card border border-card-border bg-card-bg p-3 shadow-card md:p-4"
    >
      <MovieLink movie={m} meta={meta} />
    </li>
  )
}

// One film on the list as a cassette (from `md`), with its director and writer. Shows a
// cassette-shaped placeholder until its details arrive, so the grid doesn't jump.
function ListCassette({ id }: { id: number }) {
  const { data: m } = useQuery(movieQueries.detail(id))
  if (!m) {
    return (
      <li aria-hidden="true" className="flex">
        <div className="aspect-[0.547] w-full animate-pulse rounded-subtle border border-card-border bg-card-bg" />
      </li>
    )
  }
  return (
    <li className="flex">
      <CassetteCard item={{ movie: summaryOf(m), credits: creditsOf(m) }} />
    </li>
  )
}
