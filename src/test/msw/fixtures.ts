// Small, hand-written TMDB fixtures. Tests and Storybook never call the real API.
export const searchFixture = {
  page: 1,
  total_pages: 1,
  total_results: 2,
  results: [
    {
      id: 1091,
      title: 'The Thing',
      release_date: '1982-06-25',
      overview: 'Researchers in Antarctica discover a shape-shifting alien.',
      poster_path: '/tzGY49kseSE9QAKk47uuDGwnSCu.jpg',
      backdrop_path: '/aYRmsBEyVLAXyAy5tK2qIy0sD1B.jpg',
      genre_ids: [27, 9648, 878],
    },
    {
      id: 348,
      title: 'Alien',
      release_date: '1979-05-25',
      overview: 'The crew of a commercial spacecraft encounters a deadly lifeform.',
      poster_path: null,
      backdrop_path: null,
      genre_ids: [27, 878],
    },
  ],
}

export const movieFixture = {
  id: 1091,
  title: 'The Thing',
  tagline: 'Man is the warmest place to hide.',
  release_date: '1982-06-25',
  runtime: 109,
  overview:
    'Researchers in Antarctica discover a shape-shifting alien that assumes the appearance of the people it kills.',
  poster_path: '/tzGY49kseSE9QAKk47uuDGwnSCu.jpg',
  backdrop_path: '/aYRmsBEyVLAXyAy5tK2qIy0sD1B.jpg',
  genres: [
    { id: 27, name: 'Horror' },
    { id: 878, name: 'Science Fiction' },
  ],
  popularity: 25.3,
  vote_average: 8.1,
  vote_count: 7200,
  original_language: 'en',
  // Appended recommendations: the scorer's candidates (ADR-0026).
  recommendations: {
    results: [
      {
        id: 348,
        title: 'Alien',
        release_date: '1979-05-25',
        overview: 'The crew of a commercial spacecraft encounters a deadly lifeform.',
        poster_path: null,
        backdrop_path: null,
        genre_ids: [27, 878],
        popularity: 40.2,
        vote_average: 8.2,
        vote_count: 15000,
        original_language: 'en',
      },
      {
        id: 790,
        title: 'The Fog',
        release_date: '1980-02-08',
        overview: 'A strange fog rolls into a coastal town on its centennial.',
        poster_path: null,
        backdrop_path: null,
        genre_ids: [27],
        popularity: 9.1,
        vote_average: 6.6,
        vote_count: 1500,
        original_language: 'en',
      },
    ],
  },
  release_dates: {
    results: [
      { iso_3166_1: 'GB', release_dates: [{ certification: '18' }] },
      { iso_3166_1: 'US', release_dates: [{ certification: '' }, { certification: 'R' }] },
    ],
  },
}

export const providersFixture = {
  results: {
    US: {
      flatrate: [
        {
          provider_id: 337,
          provider_name: 'Disney Plus',
          logo_path: '/97yvRBw1GzX7fXprcF80er19ot.jpg',
        },
      ],
      rent: [
        {
          provider_id: 2,
          provider_name: 'Apple TV',
          logo_path: '/9ghgSC0MA082EL6HLCW3GalykFD.jpg',
        },
        {
          provider_id: 337,
          provider_name: 'Disney Plus',
          logo_path: '/97yvRBw1GzX7fXprcF80er19ot.jpg',
        },
      ],
    },
  },
}
