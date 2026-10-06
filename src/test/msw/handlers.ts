import { http, HttpResponse } from 'msw'
import { movieFixture, providersFixture, searchFixture } from './fixtures'

export const handlers = [
  http.get('/api/tmdb/search/movie', ({ request }) => {
    const q = new URL(request.url).searchParams.get('query')?.toLowerCase() ?? ''
    const results = searchFixture.results.filter((m) => m.title.toLowerCase().includes(q))
    return HttpResponse.json({ ...searchFixture, results, total_results: results.length })
  }),
  http.get('/api/tmdb/discover/movie', () => HttpResponse.json(searchFixture)),
  http.get('/api/tmdb/movie/:id/watch/providers', () => HttpResponse.json(providersFixture)),
  http.get('/api/tmdb/movie/:id', ({ params }) =>
    params.id === String(movieFixture.id)
      ? HttpResponse.json(movieFixture)
      : HttpResponse.json({ error: 'not_found' }, { status: 404 }),
  ),
]
