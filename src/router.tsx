import type { RouteObject } from 'react-router'
import { AppLayout } from './routes/AppLayout'
import { MovieDetailPage } from './routes/MovieDetailPage'
import { DiscoverPage, ListsPage, RouteError } from './routes/PlaceholderPages'
import { SearchPage } from './routes/SearchPage'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <DiscoverPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'movie/:id', element: <MovieDetailPage /> },
      { path: 'lists', element: <ListsPage /> },
      { path: '*', element: <RouteError /> },
    ],
  },
]
