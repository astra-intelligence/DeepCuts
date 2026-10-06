import { useQueries, useQuery } from '@tanstack/react-query'
import type { CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router'
import { z } from 'zod'
import { movieQueries } from '../api/queries'
import { certification, formatRuntime, releaseYear } from '../api/tmdb'
import { Icon } from '../components/Icon'
import { PageHeading } from '../components/PageHeading'
import { tagColor, TAGS } from '../components/tags'
import { genreTone } from '../domain/genres'
import { SYSTEM_TAGS, type SystemTag } from '../domain/tagRules'
import { useTagQueries } from '../session/tagQueries'
import { EmptyState, MovieLink } from './SearchPage'

// ?tag= is untrusted; anything unknown falls back to Want to see (ADR-0014).
const paramsSchema = z.object({ tag: z.enum(SYSTEM_TAGS).catch('watchlist').default('watchlist') })

// Literal class names so Tailwind generates them (ADR-0020 page accent).
const PAGE_ACCENT: Record<SystemTag, string> = {
  seen: 'page-accent-seen',
  watchlist: 'page-accent-watchlist',
  liked: 'page-accent-liked',
  disliked: 'page-accent-disliked',
}

export function ListsPage() {
  const [params] = useSearchParams()
  const { tag } = paramsSchema.parse(Object.fromEntries(params))
  const queries = useTagQueries()
  const counts = useQueries({ queries: TAGS.map((t) => queries.list(t.tag)) })
  const ids = counts[SYSTEM_TAGS.indexOf(tag)]?.data ?? []
  const label = TAGS.find((t) => t.tag === tag)?.label ?? ''

  return (
    <div className={PAGE_ACCENT[tag]}>
      <title>{`My Lists: ${label} · Deep Cuts`}</title>
      <PageHeading
        eyebrow="Your corner"
        title="My Lists"
        lede="Everything you’ve tagged, in one place."
      />

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
              className={`flex min-h-27 flex-col items-start rounded-lg border p-3 shadow-sm md:min-h-34 ${
                active
                  ? 'border-(--tag) bg-(--tag)/10'
                  : 'border-border bg-surface-raised hover:border-border-control'
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
        <ul className="flex flex-col gap-3">
          {ids.map((id) => (
            <ListRow key={id} id={id} />
          ))}
        </ul>
      ) : (
        <EmptyState>
          Films you tag “{label}” will appear here. Use the search above, or open any film and tap{' '}
          {label}.
        </EmptyState>
      )}
    </div>
  )
}

function ListRow({ id }: { id: number }) {
  // Each listed film needs its details once; the 24h cache makes repeat visits free (ADR-0015).
  const { data: m } = useQuery(movieQueries.detail(id))
  if (!m) {
    return (
      <li
        aria-hidden="true"
        className="h-32 animate-pulse rounded-lg border border-border bg-surface-raised"
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
      className="rounded-lg border border-border bg-surface-raised p-3 shadow-sm md:p-4"
    >
      <MovieLink movie={m} meta={meta} />
    </li>
  )
}
