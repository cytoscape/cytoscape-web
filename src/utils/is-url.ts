export function isValidUrl(input: string): boolean {
  try {
    const url = new URL(input)
    return url != null
  } catch (e) {
    console.log(input, 'invlaid')
    return false
  }
}
