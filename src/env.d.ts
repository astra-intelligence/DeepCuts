// Build-time settings the app reads from `import.meta.env` (Vite). None of them is a secret:
// everything here ends up in the public JavaScript (ADR-0008).
/** The release version (`1.2.0`), or `dev` outside a deploy; set by `define` in vite.config.ts (ADR-0049). */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** `cloudflare` selects real passkey accounts (ADR-0031); unset keeps the local mock. */
  readonly VITE_ACCOUNTS?: 'cloudflare'
}
