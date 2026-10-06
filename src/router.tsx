import { Navigate, type RouteObject } from 'react-router'
import { AccountPage } from './routes/AccountPage'
import { AppLayout } from './routes/AppLayout'
import { DiscoverPage } from './routes/DiscoverPage'
import { MovieDetailPage } from './routes/MovieDetailPage'
import { ListsPage } from './routes/ListsPage'
import { RouteError } from './routes/PlaceholderPages'
import { SearchPage } from './routes/SearchPage'
import { TunePage } from './routes/TunePage'

// Search is the landing page; onboarding (/tune) is optional (ADR-0019 amendment).
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/search" replace /> },
      { path: 'discover', element: <DiscoverPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'lists', element: <ListsPage /> },
      { path: 'account', element: <AccountPage /> },
      { path: '*', element: <RouteError /> },
    ],
  },
  // Detail has its own full-bleed layout without the tab bar (design v2).
  { path: '/movie/:id', element: <MovieDetailPage />, errorElement: <RouteError /> },
  // Optional onboarding, also outside the tab-bar shell (ADR-0019 amendment).
  { path: '/tune', element: <TunePage />, errorElement: <RouteError /> },
]
