// The tag panel on the Detail page: the four tag toggles, then Save and Cancel.
//
// Changes are staged: tapping a tag only changes what's shown (following the ADR-0017 rules
// through `applyTag`), and Save and Cancel appear as soon as anything differs from what's saved.
// Save writes the changes and confirms them in a message ("Saved. The Thing: Seen it, Like."),
// announced to screen readers; it then closes Detail. Cancel discards the draft and closes Detail.
// Search keeps one-tap tagging that saves at once (owner's choice, 2026-10-07).
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from 'react-aria-components'
import { Icon } from '../components/Icon'
import { TagSaveError } from '../components/TagSaveError'
import { TagToggle } from '../components/TagToggle'
import { TAGS } from '../components/tags'
import { applyTag, SYSTEM_TAGS, type SystemTag, type TagSet } from '../domain/tagRules'
import { useSetTag, useTagQueries } from '../session/tagQueries'

const NO_TAGS: TagSet = new Set()

// Whether two tag sets hold the same tags.
const sameTags = (a: TagSet, b: TagSet) => a.size === b.size && [...a].every((t) => b.has(t))

/** "Saved. The Thing: Seen it, Like." in display order, or a note that the tags were cleared. */
function savedMessage(title: string, tags: TagSet): string {
  const labels = TAGS.filter((t) => tags.has(t.tag)).map((t) => t.label)
  return labels.length
    ? `Saved. ${title}: ${labels.join(', ')}.`
    : `Saved. ${title} has no tags now.`
}

/**
 * The film's tag toggles with staged Save and Cancel.
 * @param movieId - The TMDB id the tags belong to.
 * @param title - The film's title, used in the saved message.
 * @param onDismiss - Closes the Detail route after Save or Cancel.
 */
export function DetailTags({
  movieId,
  title,
  onDismiss,
}: {
  movieId: number
  title: string
  onDismiss: () => void
}) {
  const saved = useQuery(useTagQueries().forMovie(movieId)).data ?? NO_TAGS
  const setTag = useSetTag()
  // The unsaved selection, or null when the toggles simply show what's saved.
  const [draft, setDraft] = useState<TagSet | null>(null)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  // The confirmation after a save. Cleared by the next change, so it never describes old tags.
  const [message, setMessage] = useState('')

  const shown = draft ?? saved
  // Saving and the final confirmation keep the action row mounted even after the query cache
  // catches up with the draft. It disappears only when the closing Detail route unmounts.
  const dirty = draft !== null && (!sameTags(draft, saved) || saving || message !== '')

  function toggle(tag: SystemTag, on: boolean) {
    if (saving) return
    setDraft(applyTag(shown, tag, on))
    setMessage('')
    setFailed(false)
  }

  async function save() {
    if (!draft || saving) return
    setSaving(true)
    setFailed(false)
    let succeeded = false
    try {
      // The repository changes one tag at a time. Removals go first, then additions, which lands
      // exactly on the draft: the draft already follows the rules, so an addition never clears a
      // tag the person wants to keep. Each change is diffed against what's saved now, so after a
      // failed save, Save again only sends what's still missing.
      for (const tag of SYSTEM_TAGS) {
        if (saved.has(tag) && !draft.has(tag))
          await setTag.mutateAsync({ tmdbId: movieId, tag, on: false })
      }
      for (const tag of SYSTEM_TAGS) {
        if (!saved.has(tag) && draft.has(tag))
          await setTag.mutateAsync({ tmdbId: movieId, tag, on: true })
      }
      setMessage(savedMessage(title, draft))
      succeeded = true
      // Commit the live-region text before starting the fade, so it has a real DOM update to
      // announce even though this route leaves straight afterwards. Keep the draft and Saving…
      // state mounted until then, so the action row cannot collapse during the exit transition.
      requestAnimationFrame(() => onDismiss())
    } catch {
      // The draft stays selected, so nothing the person picked is lost; the alert says to retry.
      setFailed(true)
    } finally {
      // A successful save immediately starts dismissal; unmount owns the final cleanup. On an
      // error the page stays open, so restore the controls for a retry.
      if (!succeeded) setSaving(false)
    }
  }

  function cancel() {
    // The route is about to unmount, which discards the draft. Keeping it for the 400ms fade
    // preserves the action row's dimensions and prevents the content below from jumping upward.
    onDismiss()
  }

  return (
    <>
      <div role="group" aria-label="Your tags" className="grid grid-cols-4 gap-1.5">
        {TAGS.map((t) => (
          <TagToggle
            key={t.tag}
            tag={t}
            isSelected={shown.has(t.tag)}
            onChange={(on) => toggle(t.tag, on)}
            className="min-h-17 flex-col gap-1.5 px-1 text-center"
          />
        ))}
      </div>
      {/* Reserve the complete 44px action row from first paint, so showing or hiding the buttons
          never moves the status line or streaming section. When dirty, the next Tab from a tag
          reaches Save; actions stay right-aligned (owner, 2026-10-07/09). */}
      <div data-detail-actions="" className="mt-5 flex min-h-11 justify-end gap-2">
        {dirty && (
          <>
            <Button
              onPress={save}
              // Not `isPending` or `isDisabled`: React Aria's pending announcer leaves an unlabelled
              // element that fails axe, and disabling the button would drop keyboard focus. A second
              // press while saving is ignored in `save` instead.
              aria-disabled={saving}
              className="flex min-h-11 items-center justify-center gap-2 rounded-button bg-button-primary-bg px-5 text-sm font-semibold text-button-primary-fg hover:bg-button-primary-bg/85 aria-disabled:opacity-70"
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button
              onPress={cancel}
              isDisabled={saving}
              className="flex min-h-11 items-center justify-center rounded-button border border-button-secondary-border bg-button-secondary-bg px-5 text-sm font-semibold text-button-secondary-fg hover:border-accent"
            >
              Cancel
            </Button>
          </>
        )}
      </div>
      {failed && <TagSaveError staged className="mt-2" />}
      {/* Always in the page, and never display:none (empty until a save takes no space), so
          screen readers announce the message when it appears. A live region added or unhidden at
          the same moment as its text is often missed. */}
      <p role="status" className="mt-3 flex min-h-5 items-center gap-2 text-sm">
        {message && (
          <>
            <Icon name="check" className="size-5 shrink-0 text-accent" />
            {message}
          </>
        )}
      </p>
    </>
  )
}
