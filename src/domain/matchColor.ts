// The match sticker's colors (owner, 2026-10-13): its fill blends from blood red at a 0% match to
// neon green at 100%, through orange and yellow, so a pick's color says roughly how good a match
// it is before you read the number. The number is always written on it too.
//
// The blend itself is CSS (`color-mix(in oklch, …)` in VhsBox.css, from the match.low/high
// tokens). This module only decides how far along the blend a match is, and which text color
// reads on it: bone on the dark red end, ink from orange on. The number is large text (24px), so
// 3:1 is enough; matchColor.test.ts checks every value from 0 to 100.

/** From this match up, ink reads better than bone on the sticker. */
export const INK_FROM = 12

/** The CSS variables for a match's sticker: how far along the blend it is, as a percentage. */
export function matchBlend(match: number) {
  const p = Math.round(Math.min(100, Math.max(0, match)))
  return { '--match': `${p}%` }
}

/** Whether a match's number is printed in ink (light fills) or bone (dark red fills). */
export const inkOnMatch = (match: number) => match >= INK_FROM
