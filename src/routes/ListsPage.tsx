// My Lists (/lists): the films on each of the four tag lists.
//
// Four tiles pick the list (`?tag=`, so it's linkable); the page accent switches to that tag's
// color (ADR-0020). Each film loads its details from TMDB, cached for a day. The films are VHS
// boxes on the same shelf grid as Home, at every width (ADR-0040 §6, §11).
import { useQueries, useQuery } from '@tanstack/react-query'
import type { CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router'
import { z } from 'zod'
import { movieQueries } from '../api/queries'
import { creditsOf, summaryOf } from '../api/tmdb'
import { CassetteCard } from '../components/CassetteCard'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { PageHeading } from '../components/PageHeading'
import { SHELF_GRID } from '../components/ShelfSection'
import { tagColor, TAGS } from '../components/tags'
import { SYSTEM_TAGS, type SystemTag } from '../domain/tagRules'
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
              className={`flex min-h-27 flex-col items-start border p-3 md:min-h-34 ${
                active
                  ? 'border-(--tag) bg-(--tag)/10'
                  : 'border-card-border bg-card-bg hover:border-border-control'
              }`}
            >
              <Icon name={t.icon} className="mb-auto size-5 text-(--tag)" />
              <strong className="mt-3 text-sm font-bold">{t.label}</strong>
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
        <ul className={SHELF_GRID}>
          {ids.map((id) => (
            <ListCassette key={id} id={id} />
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

// One film on the list as a VHS box, with its director and writer. Shows a box-shaped halftone
// placeholder until its details arrive, so the grid doesn't jump.
function ListCassette({ id }: { id: number }) {
  const { data: m } = useQuery(movieQueries.detail(id))
  if (!m) {
    return (
      <li aria-hidden="true" className="flex">
        <div className="aspect-2/3 w-full bg-surface-raised halftone" />
      </li>
    )
  }
  return (
    <li className="flex">
      <CassetteCard item={{ movie: summaryOf(m), credits: creditsOf(m) }} />
    </li>
  )
}
