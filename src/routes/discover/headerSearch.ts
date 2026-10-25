// Reaching the header's movie search from elsewhere on the page: Home's empty slots ("Add a
// film", "Nothing on the bill yet") send people there, because search is how a film gets found.

/** Puts the cursor in the header's movie search (MovieSearch in AppLayout's header). */
export function focusHeaderSearch() {
  document.querySelector<HTMLInputElement>('header form[role="search"] input')?.focus()
}
