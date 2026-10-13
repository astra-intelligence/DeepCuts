// The account control at the right of the header (ADR-0025). Signed out it's "Sign in". Signed in
// it's the avatar + first name: on phones a link to the Account page, and from `md` a button that
// opens the account menu (who you are, My Lists, settings, sign out), which replaces the floating
// Home / My Lists tab bar there (owner decision 2026-10-12).
import { useQuery } from '@tanstack/react-query'
import {
  Button,
  Header,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  Popover,
  Separator,
} from 'react-aria-components'
import { Link, useLocation, useNavigate } from 'react-router'
import { firstName, SIGNED_IN_WITH, type Account } from '../adapters/SessionProvider'
import { useSession } from '../session/SessionContext'
import { useTagQueries } from '../session/tagQueries'
import { Icon } from './Icon'

// Shared look for both states, so the header doesn't shift when someone signs in.
const chip =
  'flex min-h-11 items-center gap-2 rounded-container border border-border-control bg-surface-raised py-1 pr-3 pl-1 text-sm font-bold whitespace-nowrap text-fg'

/** Header account control (ADR-0025): "Sign in" until signed in, then initial + first name. */
export function AccountChip() {
  const { session } = useSession()
  const { pathname, search } = useLocation()

  if (session.kind === 'account') {
    const { account } = session
    const first = firstName(account.name)
    return (
      <>
        {/* Phones: a link to the Account page, unchanged; phones keep their tab bar too. */}
        <Link
          to="/account"
          aria-label={`${first}, open your account`}
          className={`${chip} md:hidden`}
        >
          <Avatar name={account.name} />
          {first}
        </Link>
        {/* From `md`: the same chip opens the account menu instead. */}
        <AccountMenu account={account} className={`${chip} hidden md:flex`} />
      </>
    )
  }
  return (
    // Remember where sign-in started, so it can return there.
    // Phones keep the quiet chip. From `md` the header has room to spare, so signing in becomes
    // the one filled call to action next to the search, with the icon inline instead of in a tile.
    // Same 44px height either way, so signing in doesn't shift the header.
    <Link
      to="/sign-in"
      state={{ from: pathname + search }}
      className={`${chip} md:gap-1.5 md:border-transparent md:bg-button-primary-bg md:pr-4 md:pl-3.5 md:text-button-primary-fg md:hover:bg-button-primary-bg/85`}
    >
      <span className="grid size-9 place-items-center rounded-control bg-surface-overlay text-fg-muted md:size-auto md:bg-transparent md:text-inherit">
        <Icon name="user" />
      </span>
      Sign in
    </Link>
  )
}

// One row in the menu: 44px tall for touch, highlighted while focused or hovered.
const item =
  'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-control px-3 text-sm font-semibold text-fg outline-none data-focused:bg-surface-overlay'

/**
 * The account menu (from `md`): a chip-shaped button and its dropdown. React Aria's Menu gives
 * it the menu-button keyboard pattern (arrows move, Escape closes and returns focus to the chip).
 */
function AccountMenu({ account, className }: { account: Account; className: string }) {
  const first = firstName(account.name)
  return (
    <MenuTrigger>
      <Button aria-label={`${first}, account menu`} className={className}>
        <Avatar name={account.name} />
        {first}
        <Icon name="back" className="size-4 -rotate-90 text-fg-muted" />
      </Button>
      <Popover
        placement="bottom end"
        offset={6}
        className="w-72 rounded-popover border border-popover-border bg-popover-bg p-1 shadow-popover shadow-surface/90"
      >
        <AccountMenuItems account={account} />
      </Popover>
    </MenuTrigger>
  )
}

// The menu's contents. A separate component so the tagged-film count is only fetched once the menu
// opens (the popover mounts its children on open).
function AccountMenuItems({ account }: { account: Account }) {
  const { signOut } = useSession()
  const navigate = useNavigate()
  // Distinct films (a film with two tags counts once), as the Account page counted them.
  const films = new Set(useQuery(useTagQueries().all()).data?.map((r) => r.tmdbId)).size

  return (
    <Menu
      className="outline-none"
      onAction={(key) => {
        // Sign out is one press here: opening the menu is already a deliberate step, and the lists
        // stay in the account (owner decision 2026-10-12). Once signed out, `/` shows the landing
        // page, and RequireAccount sends any signed-in-only page there.
        if (key === 'sign-out') void signOut()
        else navigate(String(key))
      }}
    >
      {/* Who's signed in: a section heading, so screen readers announce it with the items. */}
      <MenuSection>
        <Header className="grid gap-0.5 px-3 pt-2.5 pb-3">
          <span className="font-display text-xl leading-tight">{account.name}</span>
          <span className="text-sm text-fg-muted">{SIGNED_IN_WITH[account.method]}</span>
          <span className="text-sm text-fg-muted">
            {films} {films === 1 ? 'film' : 'films'} tagged
          </span>
        </Header>
        <MenuItem id="/lists" className={item}>
          <Icon name="list" className="size-5 text-fg-muted" />
          My Lists
        </MenuItem>
        {/* Only passkey accounts have settings: change name and delete (ADR-0031 A2b). */}
        {account.method === 'passkey' && (
          <MenuItem id="/account" className={item}>
            <Icon name="user" className="size-5 text-fg-muted" />
            Account settings
          </MenuItem>
        )}
      </MenuSection>
      <Separator className="my-1 border-t border-border" />
      <MenuItem id="sign-out" className={item}>
        <Icon name="arrow" className="size-5 text-fg-muted" />
        Sign out
      </MenuItem>
    </Menu>
  )
}

/** A circle with the first letter of the name; decorative, the name is always nearby. */
export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full border border-accent bg-surface-selected font-bold text-fg-on-selected ${
        large ? 'size-14 text-2xl' : 'size-9 text-base'
      }`}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}
