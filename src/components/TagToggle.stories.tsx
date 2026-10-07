// Stories for TagToggle: the four tag buttons, off and on, compact and detailed.
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { TAGS } from './tags'
import { TagToggle } from './TagToggle'

const [seen] = TAGS
if (!seen) throw new Error('TAGS is empty')

const meta = {
  title: 'Components/TagToggle',
  component: TagToggle,
  args: { tag: seen, isSelected: false, onChange: () => {} },
} satisfies Meta<typeof TagToggle>
export default meta
type Story = StoryObj<typeof meta>

// All four tags in a group, as on the Detail page; they toggle when pressed.
function Group({ detailed = false, initial = [] as string[] }) {
  const [on, setOn] = useState(new Set(initial))
  return (
    <div role="group" aria-label="Your tags" className="grid max-w-md grid-cols-4 gap-1.5">
      {TAGS.map((t) => (
        <TagToggle
          key={t.tag}
          tag={t}
          detailed={detailed}
          isSelected={on.has(t.tag)}
          onChange={(value) =>
            setOn((prev) => {
              const next = new Set(prev)
              if (value) next.add(t.tag)
              else next.delete(t.tag)
              return next
            })
          }
          className="min-h-17 flex-col gap-1.5 px-1 text-center"
        />
      ))}
    </div>
  )
}

/** As on the Detail page, all off. */
export const Off: Story = { render: () => <Group /> }
/** Seen it and Like on: each selected tag wears its own color. */
export const SomeOn: Story = { render: () => <Group initial={['seen', 'liked']} /> }
/** With hints, as on the onboarding rating cards. */
export const Detailed: Story = { render: () => <Group detailed initial={['watchlist']} /> }
