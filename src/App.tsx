import { Logo } from './components/Logo'

// Stage 1 placeholder shell. Real screens arrive in Stage 2.
export function App() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-sm text-center">
        <h1>
          <Logo className="mx-auto w-full max-w-xs" />
        </h1>
        <p className="mt-4 text-fg-muted">Find the films nobody told you about.</p>
      </div>
    </main>
  )
}
