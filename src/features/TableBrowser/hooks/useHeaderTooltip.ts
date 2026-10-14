import { GridMouseEventArgs, Rectangle } from '@glideapps/glide-data-grid'
import * as React from 'react'

/** How long the pointer must rest on a header before the tooltip appears. */
export const HEADER_TOOLTIP_DELAY_MS = 400

export interface HeaderTooltipTarget {
  /** Index into the column list handed to the grid (row markers excluded). */
  columnIndex: number
  /** Header cell rectangle in viewport coordinates, used to anchor the popper. */
  bounds: Rectangle
}

export interface UseHeaderTooltipResult {
  target: HeaderTooltipTarget | null
  /** Feed every grid hover event here; non-header hovers dismiss the tooltip. */
  onItemHovered: (args: GridMouseEventArgs) => void
  clearTooltip: () => void
}

/**
 * Tracks which table browser column header the pointer is resting on.
 *
 * The grid renders headers into a canvas, so the column name is clipped
 * whenever it is longer than the column width and there is no DOM node to hang
 * a native title on. This hook turns the grid's hover events into a debounced
 * target the tooltip component can anchor to.
 */
export const useHeaderTooltip = (
  delayMs: number = HEADER_TOOLTIP_DELAY_MS,
): UseHeaderTooltipResult => {
  const [target, setTarget] = React.useState<HeaderTooltipTarget | null>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  // Pending column index, tracked separately so a hover that is still counting
  // down is not restarted by every mouse move within the same header.
  const pendingColumnRef = React.useRef<number | null>(null)

  const cancelTimer = React.useCallback((): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const clearTooltip = React.useCallback((): void => {
    cancelTimer()
    pendingColumnRef.current = null
    setTarget(null)
  }, [cancelTimer])

  const onItemHovered = React.useCallback(
    (args: GridMouseEventArgs): void => {
      if (args.kind !== 'header') {
        clearTooltip()
        return
      }

      const columnIndex = args.location[0]
      if (pendingColumnRef.current === columnIndex) {
        return
      }

      cancelTimer()
      pendingColumnRef.current = columnIndex
      setTarget(null)
      const { bounds } = args
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        setTarget({ columnIndex, bounds })
      }, delayMs)
    },
    [cancelTimer, clearTooltip, delayMs],
  )

  React.useEffect(() => cancelTimer, [cancelTimer])

  return { target, onItemHovered, clearTooltip }
}
