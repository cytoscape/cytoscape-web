import type { IdType } from '../../IdType'
import { DisplayMode } from '../DisplayMode'
import { NamedFilter, WorkspaceFilter } from '../FilterTree'
import {
  createWorkspaceFilter,
  isNameTaken,
  normalizeFilterName,
  uniqueFilterName,
} from './filterTreeImpl'

/**
 * The FILTER tab's filters, by id. Pure functions over this collection back
 * FilterStore's workspace filter actions.
 */
export type WorkspaceFilters = Readonly<Record<IdType, WorkspaceFilter>>

/** Name given to a new filter when none is given */
export const DEFAULT_FILTER_NAME = 'Default filter'

/**
 * Why a filter name was refused
 */
export const FilterNameError = {
  EMPTY: 'empty',
  TAKEN: 'taken',
  NOT_FOUND: 'not-found',
} as const

export type FilterNameError =
  (typeof FilterNameError)[keyof typeof FilterNameError]

export type RenameFilterResult =
  | { readonly success: true; readonly filter: WorkspaceFilter }
  | { readonly success: false; readonly error: FilterNameError }

/**
 * The filter with this id. Own keys only, so an id such as `constructor`
 * finds nothing.
 */
export const getWorkspaceFilter = (
  filters: WorkspaceFilters,
  id: IdType,
): WorkspaceFilter | undefined =>
  Object.hasOwn(filters, id) ? filters[id] : undefined

/**
 * The names in use, except the one of the filter `exceptId`
 */
export const filterNamesOf = (
  filters: WorkspaceFilters,
  exceptId?: IdType,
): string[] =>
  Object.values(filters)
    .filter((filter) => filter.id !== exceptId)
    .map((filter) => filter.name)

/**
 * A new, empty filter. The name is trimmed (a blank one becomes
 * DEFAULT_FILTER_NAME) and numbered when taken.
 */
export const newWorkspaceFilter = (
  filters: WorkspaceFilters,
  id: IdType,
  name: string,
  displayMode: DisplayMode = DisplayMode.SELECT,
): WorkspaceFilter =>
  createWorkspaceFilter(
    id,
    uniqueFilterName(
      filterNamesOf(filters),
      normalizeFilterName(name) ?? DEFAULT_FILTER_NAME,
    ),
    displayMode,
  )

/**
 * Rename a filter. Unlike a new filter, a rename to a taken name is refused
 * rather than numbered, as in Cytoscape Desktop. Names compare ignoring
 * case; changing only the case of a filter's own name is allowed.
 */
export const renameWorkspaceFilter = (
  filters: WorkspaceFilters,
  id: IdType,
  name: string,
): RenameFilterResult => {
  const filter = getWorkspaceFilter(filters, id)
  if (filter === undefined) {
    return { success: false, error: FilterNameError.NOT_FOUND }
  }
  const normalized = normalizeFilterName(name)
  if (normalized === undefined) {
    return { success: false, error: FilterNameError.EMPTY }
  }
  if (isNameTaken(filterNamesOf(filters, id), normalized)) {
    return { success: false, error: FilterNameError.TAKEN }
  }
  return { success: true, filter: { ...filter, name: normalized } }
}

/**
 * A copy of a filter under a new id, named like it and numbered ("X 2")
 */
export const copyWorkspaceFilter = (
  filters: WorkspaceFilters,
  id: IdType,
  newId: IdType,
): WorkspaceFilter | undefined => {
  const filter = getWorkspaceFilter(filters, id)
  if (filter === undefined) {
    return undefined
  }
  return {
    ...filter,
    id: newId,
    name: uniqueFilterName(filterNamesOf(filters), filter.name),
  }
}

/**
 * Workspace filters for filters read from a file. Each gets a new id and,
 * when its name is taken, a numbered one; existing filters are never
 * replaced. Imported filters start in select mode.
 *
 * @param newId Called once per filter for its id
 */
export const importWorkspaceFilters = (
  filters: WorkspaceFilters,
  imported: readonly NamedFilter[],
  newId: () => IdType,
): WorkspaceFilter[] => {
  const names = filterNamesOf(filters)
  return imported.map((filter) => {
    const name = uniqueFilterName(names, filter.name)
    names.push(name)
    return {
      id: newId(),
      name,
      root: filter.root,
      displayMode: DisplayMode.SELECT,
    }
  })
}
