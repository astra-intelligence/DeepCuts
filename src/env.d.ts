// Build-time settings the app reads from `import.meta.env` (Vite). None of them is a secret:
// everything here ends up in the public JavaScript (ADR-0008).
/** The release version from package.json (ADR-0048), baked in by `define` in vite.config.ts. */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** `cloudflare` selects real passkey accounts (ADR-0031); unset keeps the local mock. */
  readonly VITE_ACCOUNTS?: 'cloudflare'
}
