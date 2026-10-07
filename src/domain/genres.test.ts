import { describe, expect, it } from 'vitest'
import { genreTone, primaryGenreName } from './genres'

describe('genres', () => {
  it('names the first recognised genre', () => {
    expect(primaryGenreName([999, 27, 878])).toBe('Horror')
    expect(primaryGenreName([])).toBe('')
  })

  it('maps the first genre to its tone token, with a default', () => {
    expect(genreTone([878])).toEqual({ '--tone': 'var(--color-genre-science-fiction)' })
    expect(genreTone([999])).toEqual({ '--tone': 'var(--color-genre)' })
  })
})
