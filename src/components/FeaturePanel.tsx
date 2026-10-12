// The shared frame for the app's three ideas (ADR-0035). The landing page fills it with an
// illustration and a line of copy; Home fills it with the real content. Same card, same header,
// same color per idea, so the landing page previews exactly what signing in gives you.
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon } from './Icon'
import type { PanelDef } from './panels'

/**
 * A full-height card with a colored icon tile, the panel's `h2`, an optional link on the right,
 * and its content. Put it in a grid cell: `h-full` lines panels in one row up to the same height.
 * @param panel - Which idea this is (`PANELS[...]`): title, icon and color.
 * @param action - A link in the header, e.g. "See all" to the full list.
 */
export function FeaturePanel({
  panel,
  action,
  children,
}: {
  panel: PanelDef
  action?: { to: string; label: string }
  children: ReactNode
}) {
  const headingId = `panel-${panel.id}`
  return (
    <section
      aria-labelledby={headingId}
      // `--panel` colors the icon tile and anything inside that uses `(--panel)`.
      style={{ '--panel': panel.tone } as CSSProperties}
      className="flex h-full min-w-0 flex-col rounded-card border border-card-border bg-card-bg p-4 shadow-card md:p-5"
    >
      <div className="mb-3 flex items-center gap-3">
        {/* The tile's tint is the panel color at low opacity, so it reads in both themes. */}
        <span className="grid size-10 shrink-0 place-items-center rounded-container bg-(--panel)/15 text-(--panel)">
          <Icon name={panel.icon} />
        </span>
        <h2 id={headingId} className="min-w-0 flex-1 font-display text-2xl leading-tight">
          {panel.title}
        </h2>
        {action && (
          <Link
            to={action.to}
            className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-info underline"
          >
            {action.label}
          </Link>
        )}
      </div>
      {/* `flex-1` lets content push a footer (e.g. a hint) to the bottom of a stretched panel. */}
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  )
}
