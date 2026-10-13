// The Deep Cuts wordmark's letters as vector paths, shared by every logo variant (Logo.tsx and
// the holiday logos), so a costume never redraws the brand.

// Each letter is drawn on a 50×100 grid; the x offset places it in its block.
/** D, E, E, P: [x offset in the DEEP block, path]. */
export const DEEP = [
  ['14', 'M0 0H30Q50 0 50 20V80Q50 100 30 100H0Z M17 17V83H28Q33 83 33 78V22Q33 17 28 17Z'],
  ['70', 'M0 0H46V17H17V41H40V58H17V83H46V100H0Z'],
  ['122', 'M0 0H46V17H17V41H40V58H17V83H46V100H0Z'],
  ['174', 'M0 0H32Q50 0 50 18V44Q50 62 32 62H17V100H0Z M17 17V45H28Q33 45 33 40V22Q33 17 28 17Z'],
]
/** C, U, T, S: [x offset in the CUTS block, path]. */
export const CUTS = [
  [
    '252',
    'M50 34V22Q50 0 25 0Q0 0 0 22V78Q0 100 25 100Q50 100 50 78V64H33V77Q33 84 25 84Q17 84 17 77V23Q17 16 25 16Q33 16 33 23V34Z',
  ],
  ['308', 'M0 0H17V77Q17 84 25 84Q33 84 33 77V0H50V78Q50 100 25 100Q0 100 0 78Z'],
  ['364', 'M0 0H48V17H32.5V100H15.5V17H0Z'],
  [
    '418',
    'M50 30V22Q50 0 25 0Q0 0 0 22V36Q0 48 12 55L33 67V77Q33 84 25 84Q17 84 17 77V68H0V78Q0 100 25 100Q50 100 50 78V62Q50 50 38 43L17 31V23Q17 16 25 16Q33 16 33 23V30Z',
  ],
]

/** The SVG attributes every logo artwork must spread onto its root `<svg>`. */
export type LogoArtProps = {
  className?: string | undefined
  role?: 'img' | undefined
  'aria-label'?: string | undefined
  'aria-hidden'?: true | undefined
}
