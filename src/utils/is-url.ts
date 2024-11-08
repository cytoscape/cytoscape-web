export function isValidUrl(input: string): boolean {
  const urlPattern =
    /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[a-zA-Z0-9-._~:\/?#[\]@!$&'()*+,;=]*)?$/

  return urlPattern.test(input)
}
