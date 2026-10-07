import { Button, ToggleButton } from 'react-aria-components'
import { Icon } from '../../components/Icon'
import { GENRES } from '../../domain/genres'
import { Prompt } from './Prompt'
import { primary } from './styles'
import type { StepProps } from './useTuneState'

/** Step 1: choose genres. */
export function GenreStep({ state, update }: StepProps) {
  const toggle = (id: number, on: boolean) =>
    update(
      { genres: on ? [...state.genres, id].slice(0, 10) : state.genres.filter((g) => g !== id) },
      true,
    )
  return (
    <Prompt eyebrow="Make it yours" title="What are you into?">
      <p className="mt-3 mb-4 max-w-md leading-relaxed text-fg-muted">
        Choose a few. We’ll find the films hiding between the obvious picks.
      </p>
      <div role="group" aria-label="Genres" className="mb-4 flex flex-wrap gap-2">
        {Object.entries(GENRES).map(([id, g]) => {
          const selected = state.genres.includes(Number(id))
          return (
            <ToggleButton
              key={id}
              isSelected={selected}
              onChange={(on) => toggle(Number(id), on)}
              className="flex min-h-11 items-center gap-1.5 rounded-full border border-border-control bg-surface-raised/80 px-4 text-sm data-selected:border-accent data-selected:bg-surface-selected data-selected:text-on-selected"
            >
              {selected && <Icon name="check" className="size-4" />}
              {g.name}
            </ToggleButton>
          )
        })}
      </div>
      <Button
        isDisabled={state.genres.length === 0}
        onPress={() => update({ step: 2 })}
        className={primary}
      >
        Continue <Icon name="arrow" />
      </Button>
    </Prompt>
  )
}
