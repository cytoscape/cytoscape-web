/**
 * Formats a timestamp into a localized date and time string.
 *
 * Formats the given timestamp using US English locale with short date and time styles.
 * The output format is typically: "M/D/YY, H:MM AM/PM" (e.g., "12/25/23, 3:45 PM")
 *
 * @param timestamp - The timestamp to format. Can be:
 *   - A string (ISO 8601 or parseable date string)
 *   - A number (Unix timestamp in milliseconds)
 *   - A Date object
 * @returns A formatted date and time string in US English locale with short styles
 *
 * @example
 * ```ts
 * dateFormatter(new Date('2023-12-25T15:30:00'))
 * // Returns: "12/25/23, 3:30 PM" (format may vary by browser)
 *
 * dateFormatter(1703525400000) // Unix timestamp in milliseconds
 * // Returns: "12/25/23, 3:30 PM"
 *
 * dateFormatter('2023-12-25T15:30:00Z')
 * // Returns: "12/25/23, 3:30 PM"
 * ```
 *
 * @throws {Error} If the input cannot be parsed as a valid date
 */
export const dateFormatter = (timestamp: string | number | Date): string =>
  new Date(timestamp).toLocaleString('en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
