// The Top Ten slot on the Detail page (ADR-0036): the top-left corner of the film's details.
//
// It shows one of three things, depending on the person's Top Ten:
// - the film is in it:      "This is one of your top 10!" with a small Remove button
// - there's room for it:    the "Add to your Top 10" sticker
// - the list is full:       "Your Top Ten is full." (choosing a film to replace it comes with the
//                           Top Ten management screen, ADR-0033)
// Unlike the tags, a press saves at once: there's nothing to stage, and Remove undoes it.
//
// This file owns the behavior; TopTenSticker and TopTenNotice only draw. Replacing either design
// later means swapping one component here.
import { useEffect, useRef, useState } from 'react'
import { TopTenNotice } from '../components/TopTenNotice'
import { TopTenSticker } from '../components/TopTenSticker'
import { isTopTenFull, TopTenFullError } from '../domain/topTen'
import { useChangeTopTen, useTopTen } from '../session/topTenQueries'

/**
 * The Top Ten sticker or notice for one film.
 * @param movieId - The TMDB id of the film on this Detail page.
 */
export function DetailTopTen({ movieId, className = '' }: { movieId: number; className?: string }) {
  const topTen = useTopTen()
  const change = useChangeTopTen()
  // A failed save other than "full" (the network, the server). Cleared by the next press.
  const [failed, setFailed] = useState(false)
  // After a press, the pressed control is replaced by the other one, which would drop keyboard
  // focus to the page. So remember to move focus to whatever replaces it.
  const focusNext = useRef(false)
  const stickerRef = useRef<HTMLButtonElement>(null)
  const noticeRef = useRef<HTMLParagraphElement>(null)

  const list = topTen.data ?? []
  // Which of the three things to show (null until the list has loaded).
  const shown = !topTen.isSuccess
    ? null
    : list.includes(movieId)
      ? 'member'
      : isTopTenFull(list)
        ? 'full'
        : 'sticker'

  useEffect(() => {
    if (!focusNext.current) return
    focusNext.current = false
    // A notice's message gets focus, so a screen reader reads it ("This is one of your top 10!");
    // after a removal, the sticker does. Whichever is rendered now holds its ref.
    ;(noticeRef.current ?? stickerRef.current)?.focus()
  }, [shown])

  function save(on: boolean) {
    setFailed(false)
    // Set before the change starts, so it's in place whenever the new list lands in the cache.
    focusNext.current = true
    change.mutate(
      { tmdbId: movieId, on },
      {
        onError: (error) => {
          // A full list isn't an error to report: the re-fetched list shows the "full" notice,
          // which then takes focus. Anything else keeps the sticker (and focus) and shows the alert.
          if (error instanceof TopTenFullError) return
          focusNext.current = false
          setFailed(true)
        },
      },
    )
  }

  // Until the list loads (or if it can't), show nothing rather than a control that might be wrong.
  // The slot keeps its height either way, so the title below never jumps.
  const content =
    shown === 'member' ? (
      <TopTenNotice ref={noticeRef} onRemove={() => save(false)} pending={change.isPending}>
        This is one of your top 10!
      </TopTenNotice>
    ) : shown === 'full' ? (
      <TopTenNotice ref={noticeRef}>Your Top Ten is full.</TopTenNotice>
    ) : shown === 'sticker' ? (
      <TopTenSticker
        ref={stickerRef}
        seed={movieId}
        onPress={() => save(true)}
        pending={change.isPending}
      />
    ) : null

  return (
    <div data-detail-top-ten="" className={`flex min-h-14 flex-col items-start ${className}`}>
      {content}
      {failed && (
        <p role="alert" className="mt-1 text-sm text-fg-danger">
          Couldn’t update your Top Ten. Please try again.
        </p>
      )}
    </div>
  )
}
