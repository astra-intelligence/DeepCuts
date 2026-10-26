// Zod's app-wide settings. main.tsx imports this first, before any module that builds or uses a
// schema, so the setting is in place for the first parse.
import { z } from 'zod'

// Without `jitless`, Zod 4 probes whether it may compile validators with `new Function`. Our CSP
// forbids eval (server/securityHeaders.ts), so the probe fails as intended, but the browser still
// reports it as a CSP violation (Lighthouse "Best practices": issues in DevTools). Validation is
// unchanged; Zod just never asks.
z.config({ jitless: true })
