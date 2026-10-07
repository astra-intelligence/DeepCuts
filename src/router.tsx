// The app's pages and their URLs (React Router, data mode).
//
// Code splitting: the shell (AppLayout) and the landing page (Search) are in the main bundle, so
// the first screen needs one download. Every other page is `lazy`: its code is a separate file,
// fetched the first time someone opens that page. That keeps the first visit small (see
// `npm run analyze` and the bundle budget in scripts/check-bundle-size.mjs).
import { Navigate, type RouteObject } from 'react-router'
import { FEATURES, type Features } from './config/features'
import { AppLayout } from './routes/AppLayout'
import { RouteError } from './routes/PlaceholderPages'
import { SearchPage } from './routes/SearchPage'

// Each loader imports one page module and hands React Router its component.
const discover = async () => ({ Component: (await import('./routes/DiscoverPage')).DiscoverPage })
const weights = async () => ({ Component: (await import('./routes/WeightsPage')).WeightsPage })
const lists = async () => ({ Component: (await import('./routes/ListsPage')).ListsPage })
const account = async () => ({ Component: (await import('./routes/AccountPage')).AccountPage })
const signIn = async () => ({ Component: (await import('./routes/SignInPage')).SignInPage })
const register = async () => ({ Component: (await import('./routes/RegisterPage')).RegisterPage })
const detail = async () => ({
  Component: (await import('./routes/MovieDetailPage')).MovieDetailPage,
})
const tune = async () => ({ Component: (await import('./routes/tune/TunePage')).TunePage })

/**
 * Builds the route table. Search is the landing page; onboarding (/tune) is optional
 * (ADR-0019 amendment) and behind a feature flag. While it's off, /tune redirects to Search.
 * Tests pass their own `features` to check both states of a flag.
 */
export function createRoutes(features: Features = FEATURES): RouteObject[] {
  return [
    // Pages inside the main shell: header, search band and tab bar (AppLayout).
    {
      path: '/',
      element: <AppLayout />,
      errorElement: <RouteError />,
      children: [
        { index: true, element: <Navigate to="/search" replace /> },
        { path: 'discover', lazy: discover },
        features.weightsLab
          ? { path: 'discover/weights', lazy: weights }
          : { path: 'discover/weights', element: <Navigate to="/discover" replace /> },
        { path: 'search', element: <SearchPage /> },
        { path: 'lists', lazy: lists },
        { path: 'account', lazy: account },
        // Any unknown URL shows the "not found" page inside the shell.
        { path: '*', element: <RouteError /> },
      ],
    },
    // Sign-in has its own minimal layout: back, logo and the methods (ADR-0025).
    { path: '/sign-in', lazy: signIn, errorElement: <RouteError /> },
    // Registration shares that layout (AuthLayout, ADR-0030).
    { path: '/register', lazy: register, errorElement: <RouteError /> },
    // Detail has its own full-bleed layout without the tab bar (design v2).
    { path: '/movie/:id', lazy: detail, errorElement: <RouteError /> },
    // Optional onboarding, also outside the tab-bar shell (ADR-0019 amendment).
    features.onboarding
      ? { path: '/tune', lazy: tune, errorElement: <RouteError /> }
      : { path: '/tune', element: <Navigate to="/search" replace />, errorElement: <RouteError /> },
  ]
}

/** The routes with the real feature flags, used by the app (main.tsx). */
export const routes = createRoutes()
