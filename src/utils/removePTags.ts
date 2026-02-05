export function removePTags(inputString: string): string {
  // The regular expression matches '<p>' tags, '</p>' tags and '<p ...>' tags.
  const pTagRegEx = /<\/?p[^>]*>/g

  // Replaces all '<p>', '</p>', and '<p ...>' tags with an empty string.
  const outputString = inputString.replace(pTagRegEx, '')

  return outputString
}
