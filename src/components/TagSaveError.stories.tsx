// Stories for TagSaveError, the alert shown when a tag change didn't save.
import type { Meta, StoryObj } from '@storybook/react-vite'
import { TagSaveError } from './TagSaveError'

const meta = {
  title: 'Components/TagSaveError',
  component: TagSaveError,
} satisfies Meta<typeof TagSaveError>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** On Detail, after Save fails: the staged picks stay selected. */
export const Staged: Story = { args: { staged: true } }
