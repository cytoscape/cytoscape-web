/**
 * Represents a single app entry from the manifest catalog.
 * Used to display available apps and resolve remote entry URLs.
 */
export interface AppCatalogEntry {
  /** Module Federation scope name */
  id: string
  /** Human-readable display name (falls back to id) */
  name?: string
  /** Full remote entry URL */
  url: string
  /** Developer or organization name */
  author: string
  /** Short description */
  description?: string
  /** Semantic version string */
  version?: string
  /** Category tags for filtering */
  tags?: string[]
  /** URL to app icon image */
  icon?: string
  /** SPDX license identifier */
  license?: string
  /** Source code repository URL */
  repository?: string
  /** Semver range of compatible host versions */
  compatibleHostVersions?: string
  /** App IDs that must be loaded first (reserved for future use) */
  dependencies?: string[]
}
