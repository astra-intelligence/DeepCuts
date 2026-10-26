// The SemVer rules behind `npm run release` and the deploy pre-flight (ADR-0048). Pure functions
// over plain facts (the last tag, the commits since it), so they're unit-tested here and the scripts
// only gather the facts and act on the answer.
//
// What each bump means for a website (ADR-0048):
// - major: a returning user loses something or must redo it (`type!:` or a `BREAKING CHANGE:` footer)
// - minor: something new a user can see or do (`feat`)
// - patch: fixes and refinements (`fix`, `perf`, `design`, `style`, `copy`)
// - none: nothing a user sees (`chore`, `docs`, `test`, `refactor`, `ci`, `build`). Those ship with
//   the next bump; a release made of only these is a patch, because something still ships.

/** The version every release starts from: the site was in production before versioning began. */
export const FIRST_VERSION = '1.0.0'

/** The size of a change, smallest first. */
export type Bump = 'none' | 'patch' | 'minor' | 'major'

/** One commit as `git log` gives it. */
export type Commit = { hash: string; subject: string; body: string }

/** What `npm run release` will do. */
export type ReleasePlan = { version: string; bump: Bump; entry: string }

const ORDER: Bump[] = ['none', 'patch', 'minor', 'major']
const PATCH_TYPES = new Set(['fix', 'perf', 'design', 'style', 'copy'])
// `type(scope)!: subject`. The scope and the `!` are optional.
const HEADER = /^(?<type>[a-z]+)(?:\([^)]*\))?(?<bang>!)?:\s*(?<text>.+)$/
// The release commit itself never counts toward the next release.
const RELEASE_SUBJECT = /^chore\(release\):/

/** Reads a Conventional Commit header; null when it doesn't follow the format. */
function parse(commit: Commit) {
  const m = HEADER.exec(commit.subject.trim())
  if (!m?.groups) return null
  const breaking = Boolean(m.groups.bang) || /^BREAKING[ -]CHANGE:/m.test(commit.body)
  return { type: m.groups.type, text: m.groups.text, breaking }
}

/** The bump one commit asks for (see the table at the top of this file). */
export function bumpFor(commit: Commit): Bump {
  const c = parse(commit)
  if (!c) return 'none'
  if (c.breaking) return 'major'
  if (c.type === 'feat') return 'minor'
  return PATCH_TYPES.has(c.type) ? 'patch' : 'none'
}

/** `1.4.2` + `minor` = `1.5.0`. */
export function applyBump(version: string, bump: Bump): string {
  const parts = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!parts) throw new Error(`"${version}" isn't a MAJOR.MINOR.PATCH version`)
  const [major, minor, patch] = parts.slice(1).map(Number)
  if (bump === 'major') return `${major + 1}.0.0`
  if (bump === 'minor') return `${major}.${minor + 1}.0`
  if (bump === 'patch') return `${major}.${minor}.${patch + 1}`
  return version
}

/** Commits that belong in the next release: everything except earlier release commits. */
const releasable = (commits: Commit[]) => commits.filter((c) => !RELEASE_SUBJECT.test(c.subject))

/**
 * The version the next release must have.
 * @param lastTagVersion - The newest `vX.Y.Z` tag without its `v`, or null before the first release.
 * @param commits - The commits since that tag (merge commits left out).
 * @returns The version, or null when there's nothing to release.
 */
export function nextVersion(lastTagVersion: string | null, commits: Commit[]): string | null {
  if (lastTagVersion === null) return FIRST_VERSION
  const list = releasable(commits)
  if (list.length === 0) return null
  const biggest = list.map(bumpFor).reduce((a, b) => (ORDER.indexOf(b) > ORDER.indexOf(a) ? b : a))
  // Only maintenance commits: still a patch, because what ships has changed.
  return applyBump(lastTagVersion, biggest === 'none' ? 'patch' : biggest)
}

// The changelog's sections, in the order they're shown.
const SECTIONS: {
  title: string
  matches: (c: NonNullable<ReturnType<typeof parse>>) => boolean
}[] = [
  { title: 'Breaking changes', matches: (c) => c.breaking },
  { title: 'New', matches: (c) => c.type === 'feat' },
  { title: 'Fixes', matches: (c) => c.type === 'fix' || c.type === 'perf' },
  { title: 'Design', matches: (c) => ['design', 'style', 'copy'].includes(c.type) },
]

/**
 * The CHANGELOG.md entry for a release: user-facing commits by section, maintenance as a count.
 * @param version - The new version.
 * @param date - The release date, `YYYY-MM-DD`.
 * @param commits - The commits since the last tag; ignored for the first release.
 * @param first - Whether this is the first versioned release.
 */
export function changelogEntry(
  version: string,
  date: string,
  commits: Commit[],
  first = false,
): string {
  const lines = [`## ${version} (${date})`, '']
  if (first) {
    // The full history before versioning is hundreds of commits; the log already has it.
    lines.push(
      'First versioned release (ADR-0048). The site has been live since 2026-10-08; everything',
      'before this is in the commit history.',
      '',
    )
    return lines.join('\n')
  }
  const parsed = releasable(commits).map((c) => parse(c))
  let maintenance = 0
  const grouped = new Map<string, string[]>()
  for (const c of parsed) {
    // Each commit goes in the first section it matches, so a breaking feat is listed once.
    const section = c && SECTIONS.find((s) => s.matches(c))
    if (!c || !section) {
      maintenance++
      continue
    }
    grouped.set(section.title, [...(grouped.get(section.title) ?? []), `- ${c.text}`])
  }
  for (const { title } of SECTIONS) {
    const items = grouped.get(title)
    if (items) lines.push(`### ${title}`, '', ...items, '')
  }
  if (maintenance)
    lines.push(
      `Plus ${maintenance} maintenance ${maintenance === 1 ? 'change' : 'changes'} (dependencies, tests, docs, tooling).`,
      '',
    )
  return lines.join('\n')
}

/**
 * Everything `npm run release` needs to know, or null when there's nothing to release.
 * @param lastTagVersion - See {@link nextVersion}.
 * @param commits - See {@link nextVersion}.
 * @param date - Today, `YYYY-MM-DD`.
 */
export function planRelease(
  lastTagVersion: string | null,
  commits: Commit[],
  date: string,
): ReleasePlan | null {
  const version = nextVersion(lastTagVersion, commits)
  if (!version) return null
  const first = lastTagVersion === null
  const bump = first ? 'major' : diffBump(lastTagVersion, version)
  return { version, bump, entry: changelogEntry(version, date, commits, first) }
}

// Which part of the version changed between two releases.
function diffBump(from: string, to: string): Bump {
  const [a, b] = [from, to].map((v) => v.split('.').map(Number))
  if (b[0] !== a[0]) return 'major'
  return b[1] !== a[1] ? 'minor' : 'patch'
}

/**
 * Adds a release's entry to the top of CHANGELOG.md, under its heading.
 * @param changelog - The current file, or '' when it doesn't exist yet.
 */
export function prependEntry(changelog: string, entry: string): string {
  const heading =
    '# Changelog\n\nUser-facing changes in each release. Versions follow SemVer as defined in ' +
    'ADR-0048.\n\n'
  // Keep the earlier entries (everything from the first `## ` heading on), not the old intro.
  const firstEntry = changelog.indexOf('\n## ')
  const rest = firstEntry === -1 ? '' : changelog.slice(firstEntry)
  return heading + entry.trimEnd() + '\n' + (rest.trim() ? '\n' + rest.trimStart() : '')
}

/** The facts the deploy pre-flight checks the version against. */
export type VersionState = {
  /** `version` in package.json. */
  packageVersion: string
  /** The newest `vX.Y.Z` tag without its `v`, or null before the first release. */
  lastTagVersion: string | null
  /** The commit the tag `v<packageVersion>` points to, or null when it doesn't exist. */
  packageTagCommit: string | null
  /** The commit being deployed. */
  head: string
  /** The commits since the last tag (merge commits left out). */
  commitsSinceTag: Commit[]
  /** The text of CHANGELOG.md, or '' when it doesn't exist. */
  changelog: string
}

/**
 * Every reason the version stops a deploy, in plain words for the owner. Empty means go.
 * A deploy either repeats a tagged release from its own commit, or ships the release that
 * `npm run release` would make right now, with its changelog entry (ADR-0048).
 */
export function versionProblems(s: VersionState): string[] {
  // Redeploying exactly what a tag already names is always fine.
  if (s.packageTagCommit === s.head) return []
  if (s.packageTagCommit !== null)
    return [
      `v${s.packageVersion} is already tagged on another commit. Run \`npm run release\` and merge its PR.`,
    ]
  const expected = nextVersion(s.lastTagVersion, s.commitsSinceTag)
  const problems: string[] = []
  if (expected !== s.packageVersion)
    problems.push(
      `package.json says ${s.packageVersion}, but the commits since ` +
        `${s.lastTagVersion ? `v${s.lastTagVersion}` : 'the start'} make it ${expected}. ` +
        'Run `npm run release` and merge its PR.',
    )
  else if (!s.changelog.includes(`\n## ${s.packageVersion} `))
    problems.push(`CHANGELOG.md has no entry for ${s.packageVersion}. Run \`npm run release\`.`)
  return problems
}
