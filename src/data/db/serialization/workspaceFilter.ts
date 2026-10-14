import type { DisplayMode } from '../../../models/FilterModel/DisplayMode'
import type { WorkspaceFilter } from '../../../models/FilterModel/FilterTree'
import {
  CyFilterEntry,
  parseCyFilterJson,
  toCyFilterEntry,
} from '../../../models/FilterModel/impl/cyFilterJson'
import type { IdType } from '../../../models/IdType'
import { validateWorkspaceFilterRow } from '../validator'

/**
 * A FILTER tab filter as stored in the `workspaceFilters` table. The filter
 * itself is kept as an entry of a Cytoscape Desktop filter file, so a stored
 * row goes through the same parser, limits and whitelist as an imported file.
 */
export interface WorkspaceFilterRow {
  readonly id: IdType
  readonly displayMode: DisplayMode
  readonly filter: CyFilterEntry
}

export const serializeWorkspaceFilter = (
  filter: WorkspaceFilter,
): WorkspaceFilterRow => ({
  id: filter.id,
  displayMode: filter.displayMode,
  filter: toCyFilterEntry(filter),
})

/**
 * Read a stored row back into a filter
 *
 * @throws Error when the row is malformed
 */
export const deserializeWorkspaceFilter = (row: unknown): WorkspaceFilter => {
  const { id, displayMode, filter } = validateWorkspaceFilterRow(row)
  const result = parseCyFilterJson([filter])
  if (!result.success) {
    throw new Error(result.error)
  }
  const [parsed] = result.filters
  if (parsed === undefined) {
    throw new Error(result.skipped[0]?.detail ?? 'The row holds no filter')
  }
  return { id, name: parsed.name, root: parsed.root, displayMode }
}
