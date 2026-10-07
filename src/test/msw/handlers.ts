// Fake TMDB endpoints for unit tests (Mock Service Worker), answering with the fixtures.
import { http, HttpResponse } from 'msw'
import { candidateDetailFixtures, movieFixture, providersFixture, searchFixture } from './fixtures'

/** One handler per TMDB proxy path the app uses. */
export const handlers = [
  http.get('/api/tmdb/search/movie', ({ request }) => {
    const q = new URL(request.url).searchParams.get('query')?.toLowerCase() ?? ''
    const results = searchFixture.results.filter((m) => m.title.toLowerCase().includes(q))
    return HttpResponse.json({ ...searchFixture, results, total_results: results.length })
  }),
  http.get('/api/tmdb/discover/movie', () => HttpResponse.json(searchFixture)),
  http.get('/api/tmdb/movie/:id/watch/providers', () => HttpResponse.json(providersFixture)),
  // The Thing, the films it recommends (for the scorer's re-rank), or not found.
  http.get('/api/tmdb/movie/:id', ({ params }) => {
    if (params.id === String(movieFixture.id)) return HttpResponse.json(movieFixture)
    const candidate = candidateDetailFixtures[Number(params.id)]
    return candidate
      ? HttpResponse.json(candidate)
      : HttpResponse.json({ error: 'not_found' }, { status: 404 })
  }),
]
