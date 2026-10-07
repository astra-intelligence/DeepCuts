// Build-time settings the app reads from `import.meta.env` (Vite). None of them is a secret:
// everything here ends up in the public JavaScript (ADR-0008).
interface ImportMetaEnv {
  /** `cloudflare` selects real passkey accounts (ADR-0031); unset keeps the local mock. */
  readonly VITE_ACCOUNTS?: 'cloudflare'
}
