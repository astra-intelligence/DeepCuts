import type { ReactNode } from 'react'
import { Eyebrow } from '../../components/Eyebrow'

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
    <div className="animate-enter">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="max-w-md font-display text-5xl leading-none tracking-tight text-balance md:text-6xl">
        {title}
      </h1>
      {children}
    </div>
  )
}
