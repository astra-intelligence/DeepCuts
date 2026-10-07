import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { ComboBox, Input, ListBox, ListBoxItem, Popover } from 'react-aria-components'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { movieQueries } from '../api/queries'
import { imageUrl, releaseYear, type MovieSummary } from '../api/tmdb'
import { genreTone, primaryGenreName } from '../domain/genres'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useTagQueries } from '../session/tagQueries'
import { Icon } from './Icon'

const MAX_SUGGESTIONS = 8

/**
 * The persistent search (design v2) shown on every page: an accessible combobox whose suggestions
 * open the film's detail page. On /search it also drives the `?q=` results list.
 * `onPick` lets onboarding remember the chosen film before navigating.
 */
export function MovieSearch({ onPick }: { onPick?: (movie: MovieSummary) => void }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params, setParams] = useSearchParams()
  const onSearchPage = pathname === '/search'
  // An over-long ?q= is ignored rather than truncated, matching the Search page (ADR-0014).
  const [text, setText] = useState(() => {
    const q = onSearchPage ? (params.get('q') ?? '') : ''
    return q.length <= 100 ? q : ''
  })
  const query = useDebouncedValue(text.trim(), 300)
  const { data } = useQuery(movieQueries.search(query))
  const disliked = new Set(useQuery(useTagQueries().list('disliked')).data)
  const suggestions = query.length >= 2 ? (data?.results.slice(0, MAX_SUGGESTIONS) ?? []) : []

  // On the Search page the URL follows the field, so results and links stay shareable (ADR-0014).
  useEffect(() => {
    if (onSearchPage && query !== (params.get('q') ?? '')) {
      setParams(query ? { q: query } : {}, { replace: true })
    }
  }, [onSearchPage, query, params, setParams])

  function open(movie: MovieSummary) {
    setText('')
    onPick?.(movie)
    navigate(`/movie/${movie.id}`)
  }

  // "Find" opens an exact title match, otherwise the best suggestion.
  function submit(event?: FormEvent) {
    event?.preventDefault()
    const wanted = text.trim().toLowerCase()
    const target = suggestions.find((m) => m.title.toLowerCase() === wanted) ?? suggestions[0]
    if (target) open(target)
  }

  return (
    <form role="search" onSubmit={submit} className="relative w-full">
      <ComboBox
        aria-label="Find a movie to view and tag"
        items={suggestions}
        inputValue={text}
        onInputChange={(value) => setText(value.slice(0, 100))}
        onSelectionChange={(key) => {
          const movie = suggestions.find((m) => m.id === key)
          if (movie) open(movie)
        }}
        allowsCustomValue
        allowsEmptyCollection
        menuTrigger="input"
        className="focus-ring-within flex min-h-12 items-center rounded-lg border border-border-control bg-surface-raised pl-3 focus-within:border-focus"
      >
        <Icon name="search" className="size-5 shrink-0 text-accent" />
        <Input
          // Enter with a highlighted suggestion selects it (React Aria); otherwise it acts as Find.
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.currentTarget.getAttribute('aria-activedescendant'))
              submit()
          }}
          placeholder="Find a movie to tag..."
          className="min-w-0 flex-1 self-stretch bg-transparent px-3 text-sm text-fg outline-none placeholder:text-fg-placeholder"
        />
        <button
          type="submit"
          disabled={suggestions.length === 0}
          className="m-1 min-h-9 w-16 self-stretch rounded-md bg-accent text-sm font-semibold text-on-accent hover:bg-accent/85 disabled:cursor-not-allowed disabled:bg-surface-overlay disabled:text-fg-muted"
        >
          Find
        </button>
        <Popover
          offset={6}
          className="max-h-96 w-(--trigger-width) overflow-y-auto rounded-xl border border-border-control bg-surface-raised p-1 shadow-2xl shadow-surface/90"
        >
          <ListBox
            aria-label="Movie suggestions"
            renderEmptyState={() => (
              <p className="p-3.5 text-sm text-fg-muted">
                {query.length >= 2 ? 'No matching films' : 'Type at least two letters'}
              </p>
            )}
          >
            {(movie: MovieSummary) => {
              const poster = imageUrl(movie.poster_path, 'w92')
              const meta = [releaseYear(movie.release_date), primaryGenreName(movie.genre_ids)]
              return (
                <ListBoxItem
                  id={movie.id}
                  textValue={movie.title}
                  style={genreTone(movie.genre_ids)}
                  className="flex min-h-16 cursor-pointer items-center gap-2.5 border-b border-l-3 border-b-border border-l-(--tone) p-1.5 outline-none last:border-b-0 data-focused:bg-surface-overlay"
                >
                  {poster ? (
                    <img src={poster} alt="" className="h-12 w-9 shrink-0 rounded object-cover" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="h-12 w-9 shrink-0 rounded bg-surface-overlay"
                    />
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <strong className="text-sm font-semibold">{movie.title}</strong>
                    <small className="text-sm text-fg-muted">
                      {meta.filter(Boolean).join(' · ')}
                      {disliked.has(movie.id) && (
                        <span className="ml-2 text-tag-disliked">Disliked</span>
                      )}
                    </small>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold whitespace-nowrap text-info">
                    <Icon name="eye" className="size-4" /> View details
                  </span>
                </ListBoxItem>
              )
            }}
          </ListBox>
        </Popover>
      </ComboBox>
    </form>
  )
}
