// An <img> that shows a shimmering placeholder behind itself until the image has loaded. Used for
// film posters and backdrops from TMDB, which can be slow on a cold cache or a weak connection.
// The image itself stays hidden until it has fully arrived, then fades in, so a half-downloaded
// poster never paints as a strip at the top of its box.
import { useState, type ComponentProps } from 'react'

/**
 * Drop-in replacement for `<img>`: same props, plus a loader background (`image-loader` in
 * index.css) that shows until the image has loaded.
 *
 * The state is a data attribute rather than a class so the caller's `className` passes through
 * untouched. `data-loading` runs the shimmer; once the image loads the background is removed, so
 * the shimmer never keeps repainting under a finished image. If it fails, the shimmer stops and
 * the static placeholder color stays, matching the "no poster" placeholder.
 *
 * `data-loaded="fade"` marks an image that arrived while you watched: it fades in. One already in
 * the browser's cache when it mounts (`data-loaded=""`, e.g. going back to a page) shows at once,
 * so a familiar page doesn't replay the fade.
 */
export function LoadingImage({
  alt,
  className = '',
  onLoad,
  onError,
  ...props
}: ComponentProps<'img'> & {
  /** Required, as on any image: `""` for decorative ones. */
  alt: string
}) {
  // Which src finished, and how. Keyed by src so a new image (e.g. the next Tune pick in the
  // same element) starts loading again without an effect to reset the state.
  // `fade`: it loaded after mounting, so it fades in (see above).
  const [settled, setSettled] = useState<{ src: string | undefined; ok: boolean; fade?: true }>()
  const done = settled?.src === props.src
  return (
    <img
      {...props}
      alt={alt}
      // A cached image can finish before React attaches onLoad, so check on mount too.
      ref={(img) => {
        if (img?.complete && img.naturalWidth > 0 && !done) setSettled({ src: props.src, ok: true })
      }}
      className={`image-loader ${className}`}
      data-loading={done ? undefined : ''}
      data-loaded={done && settled?.ok ? (settled.fade ? 'fade' : '') : undefined}
      onLoad={(e) => {
        // The load event can follow the mount check above for a cached image: keep it instant.
        const src = props.src
        setSettled((prev) => (prev?.src === src ? prev : { src, ok: true, fade: true }))
        onLoad?.(e)
      }}
      onError={(e) => {
        setSettled({ src: props.src, ok: false })
        onError?.(e)
      }}
    />
  )
}
