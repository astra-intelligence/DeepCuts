// One of the four tag buttons (Seen it, Want to see, Like, Dislike) on Detail and in Search.
import type { CSSProperties } from 'react'
import { ToggleButton } from 'react-aria-components'
import { Icon } from './Icon'
import { tagColor, type TAGS } from './tags'

/** A tag on/off button. Its state is announced by aria-pressed only, never repeated in the label. */
/**
 * @param detailed - Also show the tag's hint ("Save for later") under its label.
 */
export function TagToggle({
  tag,
  isSelected,
  onChange,
  detailed = false,
  className = '',
}: {
  tag: (typeof TAGS)[number]
  isSelected: boolean
  onChange: (on: boolean) => void
  detailed?: boolean
  className?: string
}) {
  return (
    <ToggleButton
      isSelected={isSelected}
      onChange={onChange}
      // Sets `--tag` to this tag's color; the classes below use it for the icon, hover and
      // selected state, so one component serves all four tags.
      style={tagColor(tag.tag) as CSSProperties}
      className={`flex min-w-0 items-center justify-center gap-2 border border-tag-toggle-border bg-tag-toggle-bg px-2 py-1.5 text-sm text-tag-toggle-fg hover:border-(--tag) data-selected:border-(--tag) data-selected:bg-(--tag)/12 ${className}`}
    >
      <Icon name={tag.icon} className="size-5 shrink-0 text-(--tag)" />
      <span className="flex flex-col gap-0.5">
        <strong className="font-semibold">{tag.label}</strong>
        {detailed && <small className="text-sm font-normal text-fg-muted">{tag.hint}</small>}
      </span>
    </ToggleButton>
  )
}
