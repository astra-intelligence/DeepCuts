// @vitest-environment node
// Tests for the SemVer rules (scripts/releasePlan.ts, ADR-0048): which commits bump what, the
// changelog entry, and when the deploy pre-flight lets a version through.
import { describe, expect, it } from 'vitest'
import {
  applyBump,
  bumpFor,
  changelogEntry,
  FIRST_VERSION,
  nextVersion,
  planRelease,
  prependEntry,
  versionProblems,
  type Commit,
  type VersionState,
} from './releasePlan'

// A commit with just the parts the rules read.
const c = (subject: string, body = ''): Commit => ({ hash: subject, subject, body })

describe('bumpFor', () => {
  it.each([
    ['feat: watchlist sorting', 'minor'],
    ['feat(lists): watchlist sorting', 'minor'],
    ['fix: tag toggle focus', 'patch'],
    ['perf: smaller posters', 'patch'],
    ['design: warmer shelf', 'patch'],
    ['style: tighter footer', 'patch'],
    ['copy: friendlier empty state', 'patch'],
    ['chore(deps): bump vite', 'none'],
    ['docs: README', 'none'],
    ['test: more cases', 'none'],
    ['refactor: split hook', 'none'],
    ['ci: cache npm', 'none'],
    ['Merge pull request #3 from x', 'none'],
    ['feat!: drop the old list URLs', 'major'],
    ['fix(api)!: new tag payload', 'major'],
  ])('%s → %s', (subject, bump) => {
    expect(bumpFor(c(subject))).toBe(bump)
  })

  it('treats a BREAKING CHANGE footer as major', () => {
    expect(bumpFor(c('refactor: tags store', 'BREAKING CHANGE: old tags are dropped'))).toBe(
      'major',
    )
    expect(bumpFor(c('feat: x', 'Some text\n\nBREAKING-CHANGE: y'))).toBe('major')
  })
})

describe('applyBump', () => {
  it('bumps each part and resets the smaller ones', () => {
    expect(applyBump('1.4.2', 'major')).toBe('2.0.0')
    expect(applyBump('1.4.2', 'minor')).toBe('1.5.0')
    expect(applyBump('1.4.2', 'patch')).toBe('1.4.3')
    expect(applyBump('1.4.2', 'none')).toBe('1.4.2')
  })

  it('refuses anything but MAJOR.MINOR.PATCH', () => {
    expect(() => applyBump('1.4', 'patch')).toThrow(/MAJOR.MINOR.PATCH/)
    expect(() => applyBump('v1.4.2', 'patch')).toThrow()
  })
})

describe('nextVersion', () => {
  it('starts at 1.0.0 before any tag', () => {
    expect(nextVersion(null, [])).toBe(FIRST_VERSION)
    expect(FIRST_VERSION).toBe('1.0.0')
  })

  it('takes the biggest bump since the tag', () => {
    expect(nextVersion('1.2.3', [c('fix: a'), c('feat: b'), c('chore: c')])).toBe('1.3.0')
    expect(nextVersion('1.2.3', [c('fix: a'), c('feat!: b')])).toBe('2.0.0')
  })

  it('makes maintenance-only releases a patch, since something still ships', () => {
    expect(nextVersion('1.2.3', [c('chore(deps): bump react')])).toBe('1.2.4')
  })

  it('has nothing to release with no commits, or only release commits', () => {
    expect(nextVersion('1.2.3', [])).toBeNull()
    expect(nextVersion('1.2.3', [c('chore(release): v1.2.3')])).toBeNull()
  })
})

describe('changelogEntry', () => {
  it('groups user-facing commits and counts the rest', () => {
    const entry = changelogEntry('1.3.0', '2026-11-01', [
      c('feat(lists): watchlist sorting'),
      c('fix: tag toggle focus'),
      c('design: warmer shelf'),
      c('feat!: drop old list URLs'),
      c('chore(deps): bump vite'),
      c('test: more'),
      c('chore(release): v1.2.0'),
      c('not conventional'),
    ])
    expect(entry).toBe(
      [
        '## 1.3.0 (2026-11-01)',
        '',
        '### Breaking changes',
        '',
        '- drop old list URLs',
        '',
        '### New',
        '',
        '- watchlist sorting',
        '',
        '### Fixes',
        '',
        '- tag toggle focus',
        '',
        '### Design',
        '',
        '- warmer shelf',
        '',
        'Plus 3 maintenance changes (dependencies, tests, docs, tooling).',
        '',
      ].join('\n'),
    )
  })

  it('says "change" for one maintenance commit and skips empty sections', () => {
    const entry = changelogEntry('1.2.4', '2026-11-01', [c('chore: one')])
    expect(entry).not.toContain('###')
    expect(entry).toContain('Plus 1 maintenance change (')
  })

  it('summarizes the first release instead of listing all history', () => {
    const entry = changelogEntry('1.0.0', '2026-10-25', [c('feat: a')], true)
    expect(entry).toMatch(/^## 1\.0\.0 \(2026-10-25\)\n\nFirst versioned release/)
    expect(entry).not.toContain('- a')
  })
})

describe('planRelease', () => {
  it('plans the first release as 1.0.0', () => {
    expect(planRelease(null, [c('feat: a')], '2026-10-25')).toMatchObject({
      version: '1.0.0',
      bump: 'major',
    })
  })

  it('reports which part changed', () => {
    expect(planRelease('1.2.3', [c('fix: a')], 'd')?.bump).toBe('patch')
    expect(planRelease('1.2.3', [c('feat: a')], 'd')?.bump).toBe('minor')
    expect(planRelease('1.2.3', [c('feat!: a')], 'd')?.bump).toBe('major')
  })

  it('returns null when there is nothing to release', () => {
    expect(planRelease('1.2.3', [], 'd')).toBeNull()
  })
})

describe('prependEntry', () => {
  it('creates the file with a heading', () => {
    expect(prependEntry('', '## 1.0.0 (d)\n\nFirst.\n')).toMatch(
      /^# Changelog\n\n.*ADR-0048\.\n\n## 1\.0\.0 \(d\)\n\nFirst\.\n$/,
    )
  })

  it('puts the new entry above the old ones, keeping them intact', () => {
    const first = prependEntry('', '## 1.0.0 (a)\n\nFirst.\n')
    const second = prependEntry(first, '## 1.1.0 (b)\n\n- x\n')
    expect(second.indexOf('## 1.1.0')).toBeLessThan(second.indexOf('## 1.0.0'))
    expect(second.match(/# Changelog/g)).toHaveLength(1)
    expect(second).toContain('## 1.0.0 (a)\n\nFirst.\n')
  })

  it('handles a heading-only file', () => {
    expect(prependEntry('# Changelog\n\nIntro.\n', '## 1.0.0 (a)\n')).toMatch(/## 1\.0\.0 \(a\)\n$/)
  })
})

describe('versionProblems', () => {
  const released: VersionState = {
    packageVersion: '1.3.0',
    lastTagVersion: '1.2.0',
    packageTagCommit: null,
    head: 'h',
    commitsSinceTag: [c('feat: a'), c('chore(release): v1.3.0')],
    changelog: '# Changelog\n\n## 1.3.0 (2026-11-01)\n',
  }

  it('lets a merged release through', () => {
    expect(versionProblems(released)).toEqual([])
  })

  it('lets a redeploy of the tagged commit through', () => {
    expect(versionProblems({ ...released, packageTagCommit: 'h' })).toEqual([])
  })

  it('refuses a version already tagged elsewhere', () => {
    expect(versionProblems({ ...released, packageTagCommit: 'old' })[0]).toMatch(
      /already tagged on another commit/,
    )
  })

  it('refuses commits that landed after the release PR', () => {
    const later = { ...released, commitsSinceTag: [...released.commitsSinceTag, c('feat!: b')] }
    expect(versionProblems(later)[0]).toMatch(/make it 2\.0\.0/)
  })

  it('refuses before the first release', () => {
    const before = { ...released, packageVersion: '0.0.0', lastTagVersion: null }
    expect(versionProblems(before)[0]).toMatch(/since the start make it 1\.0\.0/)
  })

  it('refuses a missing changelog entry', () => {
    expect(versionProblems({ ...released, changelog: '' })[0]).toMatch(/no entry for 1\.3\.0/)
  })
})
