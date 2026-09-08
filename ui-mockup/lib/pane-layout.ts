/** Magnetic stops retain free positioning between landmarks. */
export function snapSpreadsheetHeight(value: number): number {
  const clamped = Math.max(0, Math.min(100, value))
  if (clamped <= 8) return 0
  if (clamped >= 92) return 100
  const stop = [33, 40, 50, 67].find((point) => Math.abs(point - clamped) <= 3)
  return stop ?? clamped
}
