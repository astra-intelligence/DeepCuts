// TMDB's movie genre ids are stable, so names and tones come from this map instead of an extra
// API call (ADR-0024). Each slug has a matching `genre-*` color token (ADR-0023).
export const GENRES = {
  28: { slug: 'action', name: 'Action' },
  12: { slug: 'adventure', name: 'Adventure' },
  16: { slug: 'animation', name: 'Animation' },
  35: { slug: 'comedy', name: 'Comedy' },
  80: { slug: 'crime', name: 'Crime' },
  99: { slug: 'documentary', name: 'Documentary' },
  18: { slug: 'drama', name: 'Drama' },
  10751: { slug: 'family', name: 'Family' },
  14: { slug: 'fantasy', name: 'Fantasy' },
  36: { slug: 'history', name: 'History' },
  27: { slug: 'horror', name: 'Horror' },
  10402: { slug: 'music', name: 'Music' },
  9648: { slug: 'mystery', name: 'Mystery' },
  10749: { slug: 'romance', name: 'Romance' },
  878: { slug: 'science-fiction', name: 'Science Fiction' },
  10770: { slug: 'tv-movie', name: 'TV Movie' },
  53: { slug: 'thriller', name: 'Thriller' },
  10752: { slug: 'war', name: 'War' },
  37: { slug: 'western', name: 'Western' },
} as const satisfies Record<number, { slug: string; name: string }>

export type GenreId = keyof typeof GENRES

const lookup = (id: number) => (GENRES as Record<number, { slug: string; name: string }>)[id]

/** The first known genre's name, or '' when TMDB gives none we recognise. */
export function primaryGenreName(ids: readonly number[]): string {
  for (const id of ids) {
    const g = lookup(id)
    if (g) return g.name
  }
  return ''
}

/** Sets `--tone` to the first genre's color token, for card accents (design v2). */
export function genreTone(ids: readonly number[]): Record<string, string> {
  const slug = ids.map(lookup).find(Boolean)?.slug
  return { '--tone': slug ? `var(--color-genre-${slug})` : 'var(--color-genre)' }
}
