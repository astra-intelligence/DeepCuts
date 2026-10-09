// The app's pages and their URLs (React Router, data mode).
//
// Code splitting: the shell (AppLayout) is in the main bundle. Every page is `lazy`: its code is a
// separate file, fetched the first time someone opens that page. That keeps the first visit small
// (see `npm run analyze` and the bundle budget in scripts/check-bundle-size.mjs).
import { Navigate, type RouteObject } from 'react-router'
import { FEATURES, homeOf, type Features } from './config/features'
import { AppLayout } from './routes/AppLayout'
import { RouteError } from './routes/PlaceholderPages'

// Each loader imports one page module and hands React Router its component.
const search = async () => ({ Component: (await import('./routes/SearchPage')).SearchPage })
const welcome = async () => ({ Component: (await import('./routes/DiscoverPage')).HomePage })
const lists = async () => ({ Component: (await import('./routes/ListsPage')).ListsPage })
const account = async () => ({ Component: (await import('./routes/AccountPage')).AccountPage })
const signIn = async () => ({ Component: (await import('./routes/SignInPage')).SignInPage })
const register = async () => ({ Component: (await import('./routes/RegisterPage')).RegisterPage })
const detail = async () => ({
  Component: (await import('./routes/MovieDetailPage')).MovieDetailPage,
})
const tune = async () => ({ Component: (await import('./routes/tune/TunePage')).TunePage })
// Labs: design and tuning tools for the owner, on the dev server only (FEATURES.labs). In a
// production build `import.meta.env.DEV` is false, so this list is empty and the labs' code is
// left out of the bundle altogether, not just unlinked.
const vhsLab = async () => ({ Component: (await import('./routes/lab/VhsLabPage')).VhsLabPage })
const weights = async () => ({
  Component: (await import('./routes/lab/WeightsPage')).WeightsPage,
})
const LAB_ROUTES: RouteObject[] = import.meta.env.DEV
  ? [
      { path: 'lab/vhs', lazy: vhsLab },
      { path: 'lab/weights', lazy: weights },
    ]
  : []

/**
 * Builds the route table. Home is Welcome, including its recommendation area (ADR-0033).
 * Onboarding (/tune) is optional (ADR-0019 amendment) and behind a feature flag; while a page's
 * flag is off, its URL redirects home. Tests pass their own `features` to check both states.
 */
export function createRoutes(features: Features = FEATURES): RouteObject[] {
  const homePath = homeOf().path
  return [
    // Pages inside the main shell: header, search band and tab bar (AppLayout).
    {
      path: '/',
      element: <AppLayout />,
      errorElement: <RouteError />,
      children: [
        { index: true, lazy: welcome },
        // Bookmarked Discover links have one safe destination after ADR-0033: Home.
        { path: 'discover', element: <Navigate to={homePath} replace /> },
        // The weights lab's old address (it was live until 2026-10-09): to the lab on the dev
        // server, to Home everywhere else.
        {
          path: 'discover/weights',
          element: <Navigate to={features.labs ? '/lab/weights' : homePath} replace />,
        },
        features.searchPage
          ? { path: 'search', lazy: search }
          : { path: 'search', element: <Navigate to={homePath} replace /> },
        { path: 'lists', lazy: lists },
        { path: 'account', lazy: account },
        ...(features.labs ? LAB_ROUTES : []),
        // Any unknown URL shows the "not found" page inside the shell.
        { path: '*', element: <RouteError /> },
      ],
    },
    // Sign-in has its own minimal layout: back, logo and the methods (ADR-0025).
    { path: '/sign-in', lazy: signIn, errorElement: <RouteError /> },
    // Registration shares that layout (AuthLayout, ADR-0031).
    { path: '/register', lazy: register, errorElement: <RouteError /> },
    // Detail has its own full-bleed layout without the tab bar (design v2).
    { path: '/movie/:id', lazy: detail, errorElement: <RouteError /> },
    // Optional onboarding, also outside the tab-bar shell (ADR-0019 amendment).
    features.onboarding
      ? { path: '/tune', lazy: tune, errorElement: <RouteError /> }
      : {
          path: '/tune',
          element: <Navigate to={homePath} replace />,
          errorElement: <RouteError />,
        },
  ]
}

/** The routes with the real feature flags, used by the app (main.tsx). */
export const routes = createRoutes()
