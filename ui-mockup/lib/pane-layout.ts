/** Magnetic stops retain free positioning between landmarks. */
export function snapSpreadsheetHeight(value: number): number {
  const clamped = Math.max(0, Math.min(100, value))
  if (clamped <= 8) return 0
  if (clamped >= 92) return 100
  const stop = [33, 40, 50, 67].find((point) => Math.abs(point - clamped) <= 3)
  return stop ?? clamped
}

export function scrollToRevealRow(
  scrollTop: number,
  viewportHeight: number,
  headerHeight: number,
  rowTop: number,
  rowHeight: number,
): number {
  if (rowTop < scrollTop + headerHeight)
    return Math.max(0, rowTop - headerHeight)
  if (rowTop + rowHeight > scrollTop + viewportHeight)
    return rowTop + rowHeight - viewportHeight
  return scrollTop
}
