// Stories for AccountChip, the account control in the header: signed out and signed in.
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AccountChip } from './AccountChip'

const meta = { title: 'Components/AccountChip', component: AccountChip } satisfies Meta<
  typeof AccountChip
>
export default meta
type Story = StoryObj<typeof meta>

export const SignedOut: Story = {}
/** Avatar initial + first name (ADR-0025). */
export const SignedIn: Story = {
  parameters: {
    session: { kind: 'account', account: { id: 'demo', name: 'Mike Curts', method: 'demo' } },
  },
}
