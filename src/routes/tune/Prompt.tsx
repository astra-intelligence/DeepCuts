import type { ReactNode } from 'react'

/** Eyebrow + large heading shared by the onboarding steps. */
export function Prompt({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <div className="animate-[enter_0.4s_ease_both]">
      <p className="mb-2.5 text-sm font-bold tracking-[0.15em] text-accent uppercase">{eyebrow}</p>
      <h1 className="max-w-md font-display text-5xl leading-none tracking-tight text-balance md:text-6xl">
        {title}
      </h1>
      {children}
    </div>
  )
}
