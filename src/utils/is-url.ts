export function isValidUrl(input: string): boolean {
  try {
    const url = new URL(input)
    return url != null
  } catch (e) {
    return false
  }
}
