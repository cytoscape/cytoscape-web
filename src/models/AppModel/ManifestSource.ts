/**
 * Describes where the app manifest should be loaded from.
 * - url: fetch from a URL (default or user-configured)
 * - inline: use raw JSON content (e.g. uploaded file)
 */
export type ManifestSource =
  | { type: 'url'; url: string }
  | { type: 'inline'; content: string }
