import { FileDelimiterState } from '../DelimiterType'

/**
 * Converts UI state values to actual delimiter characters for Papa.parse
 * @param fileDelimiter - UI state value ('auto', 'custom', 'tab', 'space', or a delimiter character)
 * @param customFileDelimiter - Custom delimiter value when fileDelimiter is 'custom'
 * @returns The delimiter character to use, or undefined for auto-detection
 */
export function convertFileDelimiterToEffective(
  fileDelimiter: FileDelimiterState,
  customFileDelimiter?: string,
): string | undefined {
  switch (fileDelimiter) {
    case 'auto':
      return undefined
    case 'custom':
      return customFileDelimiter || undefined
    case 'tab':
      return '\t'
    case 'space':
      return ' '
    default:
      return fileDelimiter
  }
}

/**
 * Converts UI state values back to actual delimiter characters for storage in the Zustand store.
 *
 * This function is the inverse of the UI state representation. When a user selects a delimiter
 * in the UI (e.g., 'auto', 'tab', 'space', or a custom character), we need to convert that
 * selection into an actual delimiter character string that can be persisted in the store's
 * options object.
 *
 * The store's options.delimiter field expects a string value (e.g., ',', '\t', ';'), not
 * UI state values like 'auto' or 'tab'. This function handles that conversion:
 * - 'auto' → ',' (default delimiter, stored as comma)
 * - 'custom' → customFileDelimiter value (or ',' if not provided)
 * - 'tab' → '\t' (tab character)
 * - 'space' → ' ' (space character)
 * - Direct delimiter characters (e.g., ';', '|') → passed through as-is
 *
 * This stored value is later used when initializing the component state or when the user
 * navigates between workflow steps, ensuring the delimiter selection persists.
 *
 * @param fileDelimiter - UI state value ('auto', 'custom', 'tab', 'space', or a delimiter character)
 * @param customFileDelimiter - Custom delimiter value when fileDelimiter is 'custom'
 * @returns The delimiter character to store in the Zustand store options (defaults to ',' for 'auto')
 */
export function convertFileDelimiterToStorageValue(
  fileDelimiter: FileDelimiterState,
  customFileDelimiter?: string,
): string {
  switch (fileDelimiter) {
    case 'auto':
      return ','
    case 'custom':
      return customFileDelimiter || ','
    case 'tab':
      return '\t'
    case 'space':
      return ' '
    default:
      return fileDelimiter
  }
}
