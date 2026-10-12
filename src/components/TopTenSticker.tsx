// The Top Ten sticker (ADR-0036): the "Add to your Top 10" button on Detail, drawn as a weathered
// '80s rental-store label. Its look lives in TopTenSticker.css.
//
// A placeholder by design: it will get more visual flair later, and a Top Ten management screen
// will follow. So it knows nothing about Top Ten data. It's a button with a fixed label that
// reports presses; DetailTopTen decides when to show it and what a press does. Swapping it for a
// new design only means replacing this component.
import { useId, type Ref } from 'react'
import { Button } from 'react-aria-components'
import { Icon } from './Icon'
import './TopTenSticker.css'

/**
 * The "Add to your Top 10" sticker button.
 * @param onPress - Called when it's pressed (not while `pending`).
 * @param pending - True while the add is being saved: the sticker fades and ignores presses.
 * @param seed - Any stable number (e.g. the film's id). It picks the edge wear, so each film's
 *   sticker is worn a little differently but always the same way.
 * @param ref - Lets the caller move focus here (e.g. after the film is removed again).
 */
export function TopTenSticker({
  onPress,
  pending = false,
  seed = 0,
  className = '',
  ref,
}: {
  onPress: () => void
  pending?: boolean
  seed?: number
  className?: string
  ref?: Ref<HTMLButtonElement>
}) {
  // A unique id for this sticker's wear filter. React's ids contain characters that CSS url()
  // references don't like, so keep only letters and digits.
  const filterId = `top-ten-wear-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <Button
      ref={ref}
      // Not `isDisabled`: disabling would drop keyboard focus mid-save. A press while pending is
      // ignored here instead (the same pattern as Detail's Save button).
      aria-disabled={pending}
      onPress={() => {
        if (!pending) onPress()
      }}
      data-top-ten-sticker=""
      className={`top-ten-sticker ${className}`}
    >
      {/* Rough, worn edges: noise displaces the face's outline by a couple of pixels. */}
      <svg className="absolute size-0" aria-hidden="true" focusable="false">
        <filter id={filterId} x="-5%" y="-10%" width="110%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="2"
            seed={seed % 100}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="2.5"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
      <span className="top-ten-sticker__face" style={{ filter: `url(#${filterId})` }} />
      <span className="top-ten-sticker__frame" aria-hidden="true" />
      {/* The visible text is the accessible name: "Add to your Top 10". The space between the two
          lines keeps the words apart in that name (the column layout hides it on screen). */}
      <span className="top-ten-sticker__label">
        <span className="top-ten-sticker__kicker">Add to your</span>{' '}
        <span className="top-ten-sticker__title">
          <Icon name="star" className="size-5" />
          Top 10
        </span>
      </span>
    </Button>
  )
}
