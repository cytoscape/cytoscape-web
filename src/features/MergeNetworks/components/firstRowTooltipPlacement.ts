export interface FirstRowTooltipPlacements {
  rowPlacement: 'top' | 'bottom'
  matchInfoPlacement: 'top' | 'bottom'
}

/**
 * The first node row of the matching table can show two tooltips at once: a
 * row-level error/conflict tooltip (when the row is flagged) and the cell-level
 * "this attribute is used to match nodes" info tooltip. Both defaulted to
 * placement="top", so they overlapped when the first row was also flagged
 * (CW-523).
 *
 * This keeps the error tooltip on top and pushes the info tooltip below the
 * field only when the row is flagged, so the two never occupy the same space.
 * When the row is not flagged, only the info tooltip is active and it keeps its
 * natural top placement.
 */
export const getFirstRowTooltipPlacements = (
  rowHasMessage: boolean,
): FirstRowTooltipPlacements => ({
  rowPlacement: 'top',
  matchInfoPlacement: rowHasMessage ? 'bottom' : 'top',
})
