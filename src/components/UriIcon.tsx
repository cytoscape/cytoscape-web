// src/components/UriIcon.tsx
//
// A fixed-size icon from an app-supplied image URI (the `icon` of an
// 'apps-menu' entry or a 'search-bar' provider). One rule, stated to apps as
// a single sentence: SVG icons are painted in the surrounding text color;
// raster icons (PNG, JPEG, ...) are shown unchanged.
//
// An SVG is a glyph: it renders as a CSS mask over `currentColor`, so only
// its shape matters and it follows the light/dark theme and the disabled
// state of its row with no effort from the app. (An <img> cannot do this —
// it renders the SVG in its own isolated document, where `currentColor` is
// black and host CSS never reaches.) Multi-color SVG artwork therefore
// becomes a monochrome silhouette; an app that wants its colors kept ships
// a raster image instead. A cross-origin http(s) SVG needs CORS headers
// because CSS masks are fetched in CORS mode; `data:` URIs and root-relative
// host assets are unaffected.
//
// A raster image is a picture: it renders as a letterboxed <img>.

import { Box } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'

/**
 * True when the URI names an SVG: a `data:image/svg+xml` URI, or a URL /
 * root-relative path whose file name ends in `.svg` (case-insensitive,
 * query string and fragment ignored). Anything else is treated as raster.
 */
export const isSvgIconUri = (uri: string): boolean => {
  if (/^data:image\/svg\+xml[;,]/i.test(uri)) return true
  if (uri.startsWith('data:')) return false
  const path = uri.split(/[?#]/, 1)[0]
  return /\.svg$/i.test(path)
}

/**
 * Wrap a URI for a CSS `url("...")`. A raw (unencoded) SVG data URI is
 * valid and common — `data:image/svg+xml,<svg xmlns="...">` — but its
 * literal quotes would end the CSS string early. Percent-encoding the few
 * CSS-sensitive characters keeps the URI meaning intact (browsers decode
 * `%22` back to `"` in both data: and http(s) URIs) and the declaration
 * well-formed.
 */
export const cssUrl = (uri: string): string =>
  `url("${uri.replace(/["'\\\n\r()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`)}")`

interface UriIconProps {
  /** http(s) URL, data:image URI, or root-relative host asset path. */
  src: string
  /** Width and height in px. */
  size: number
  /** Accessible name; omit for a purely decorative icon. */
  label?: string
  sx?: SxProps<Theme>
  'data-testid'?: string
}

export const UriIcon = ({
  src,
  size,
  label,
  sx,
  'data-testid': dataTestId,
}: UriIconProps): JSX.Element => {
  const sxList = Array.isArray(sx) ? sx : [sx]

  if (!isSvgIconUri(src)) {
    return (
      <Box
        component="img"
        src={src}
        alt={label ?? ''}
        data-testid={dataTestId}
        sx={[
          {
            display: 'block',
            flexShrink: 0,
            width: size,
            height: size,
            objectFit: 'contain',
          },
          ...sxList,
        ]}
      />
    )
  }

  return (
    <Box
      role="img"
      aria-label={label}
      aria-hidden={label === undefined ? true : undefined}
      data-testid={dataTestId}
      sx={[
        {
          display: 'block',
          flexShrink: 0,
          width: size,
          height: size,
          backgroundColor: 'currentColor',
          maskImage: cssUrl(src),
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
        },
        ...sxList,
      ]}
    />
  )
}
