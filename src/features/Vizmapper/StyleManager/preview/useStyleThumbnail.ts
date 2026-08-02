import { useEffect, useState } from 'react'

import { logUi } from '@/debug'
import { VisualStyle } from '@/models/VisualStyleModel'
import { PreviewSample } from './previewSample'
import { renderStylePreview } from './renderStylePreview'

/** What {@link useStyleThumbnail} knows about a style's preview. */
export interface StyleThumbnail {
  /** The PNG data URL, or undefined while pending, disabled, or failed. */
  dataUrl: string | undefined
  /**
   * True once rendering failed. Distinguishes "gave up" from "still working",
   * which an undefined `dataUrl` alone cannot: the tile showed a spinner that
   * never stopped.
   */
  failed: boolean
}

/**
 * Render a style to a PNG data URL.
 *
 * Shared by the picker's grid tiles and by the Vizmapper's trigger button so
 * both go through the same cache — the active style's thumbnail is rendered
 * once and reused in both places.
 *
 * `enabled` lets a caller defer the work (the grid gates it on visibility);
 * passing an undefined style has the same effect, which is what an off-network
 * style does while its row is still being read. Neither counts as a failure.
 */
export const useStyleThumbnail = (
  visualStyle: VisualStyle | undefined,
  sample: PreviewSample,
  enabled: boolean = true,
): StyleThumbnail => {
  const [thumbnail, setThumbnail] = useState<StyleThumbnail>({
    dataUrl: undefined,
    failed: false,
  })

  useEffect(() => {
    if (!enabled || visualStyle === undefined) {
      return
    }
    let active = true
    void renderStylePreview(visualStyle, sample)
      .then((dataUrl) => {
        // A resolve landing after the style changed or the component unmounted
        // would paint a thumbnail of the wrong style.
        if (active) {
          setThumbnail({ dataUrl, failed: false })
        }
      })
      .catch((e) => {
        logUi.warn('[useStyleThumbnail]: Failed to render style preview', e)
        if (active) {
          setThumbnail({ dataUrl: undefined, failed: true })
        }
      })
    return () => {
      active = false
    }
  }, [enabled, visualStyle, sample])

  return thumbnail
}
