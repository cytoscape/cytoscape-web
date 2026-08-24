/**
 * Drops the first `count` lines from raw file text.
 *
 * Papa.parse takes the first line of its input as the header row, so metadata
 * lines have to go before the parse. Slicing the parsed rows instead let a
 * metadata line become the column names and pushed the real header row into
 * the data.
 */
export function dropLeadingLines(text: string, count: number): string {
  if (count <= 0) {
    return text
  }
  return text
    .split(/\r\n|\n|\r/)
    .slice(count)
    .join('\n')
}
