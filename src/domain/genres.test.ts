// Tests for genre names and the genre tone (card accent color).
import { describe, expect, it } from 'vitest'
import { genreTone, primaryGenre, primaryGenreName } from './genres'

describe('genres', () => {
  it('finds the first known genre, with its short sticker label', () => {
    expect(primaryGenre([999, 878])).toEqual({
      slug: 'science-fiction',
      name: 'Science Fiction',
      label: 'Sci-Fi',
    })
    expect(primaryGenre([999])).toBeUndefined()
  })

  it('names the first recognised genre', () => {
    expect(primaryGenreName([999, 27, 878])).toBe('Horror')
    expect(primaryGenreName([])).toBe('')
  })

  it('maps the first genre to its tone token, with a default', () => {
    expect(genreTone([878])).toEqual({ '--tone': 'var(--color-genre-science-fiction)' })
    expect(genreTone([999])).toEqual({ '--tone': 'var(--color-genre)' })
  })
})
