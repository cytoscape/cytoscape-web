/**
 * Column name rules shared by the Table Browser, the App API and the import
 * paths (#951).
 *
 * Cytoscape Desktop compares column names case-insensitively, by lower-casing
 * them (`CyTableImpl.normalizeColumnName`), and never has two columns whose
 * names differ only by case.
 *
 * Column names come from files, so they can be anything, `__proto__` and
 * `constructor` included. Lookups here use a `Map`, never a plain object.
 */
import { AttributeName } from '../AttributeName'
import { ValueType } from '../ValueType'
import { ValueTypeName } from '../ValueTypeName'

/** A column as a file or a table declares it */
export interface DeclaredColumn {
  readonly name: AttributeName
  readonly type: ValueTypeName
}

/** The form two column names are compared in */
export const normalizeColumnName = (name: AttributeName): string =>
  name.toLowerCase()

export const columnNamesMatch = (a: AttributeName, b: AttributeName): boolean =>
  normalizeColumnName(a) === normalizeColumnName(b)

/**
 * Whether a name collides with the element's `id` key. Creating or renaming
 * a column to it is rejected, in any letter case. Importing a CX2 attribute
 * of that name is not (#949).
 */
export const isIdColumnName = (name: AttributeName): boolean =>
  normalizeColumnName(name) === 'id'

/**
 * Whether another column already has this name, ignoring case.
 *
 * @param ownName The column being renamed. It does not count, so changing
 *   only the case of its own name stays allowed.
 */
export const columnNameIsTaken = (
  columns: readonly { readonly name: AttributeName }[],
  name: AttributeName,
  ownName?: AttributeName,
): boolean => {
  const normalized = normalizeColumnName(name)
  const ownIndex =
    ownName === undefined ? -1 : columns.findIndex((c) => c.name === ownName)
  return columns.some(
    (c, index) =>
      index !== ownIndex && normalizeColumnName(c.name) === normalized,
  )
}

/**
 * The column a name refers to: the exact spelling when there is one, else
 * the first column that matches ignoring case.
 */
export const findColumnByName = <T extends { readonly name: AttributeName }>(
  columns: readonly T[],
  name: AttributeName,
): T | undefined => {
  const exact = columns.find((c) => c.name === name)
  if (exact !== undefined) return exact
  const normalized = normalizeColumnName(name)
  return columns.find((c) => normalizeColumnName(c.name) === normalized)
}

/** The outcome of merging declared columns that share a name */
export interface ColumnMerge<T extends DeclaredColumn = DeclaredColumn> {
  /** One column per name: the first declared, in declaration order */
  readonly columns: readonly T[]
  /** Whether at least two declarations share a name */
  readonly hasDuplicates: boolean
  /** The column kept for a spelling, undefined for an undeclared name */
  readonly keptColumn: (spelling: AttributeName) => T | undefined
  /** Whether a spelling belongs to a name declared more than once */
  readonly isMerged: (spelling: AttributeName) => boolean
}

/**
 * Merge declared columns as Cytoscape Desktop does: each name keeps the
 * spelling and type of its first declaration.
 */
export const mergeDeclaredColumns = <T extends DeclaredColumn>(
  declared: readonly T[],
): ColumnMerge<T> => {
  const kept = new Map<string, T>()
  const counts = new Map<string, number>()
  declared.forEach((column) => {
    const normalized = normalizeColumnName(column.name)
    if (!kept.has(normalized)) kept.set(normalized, column)
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  })
  return {
    columns: [...kept.values()],
    hasDuplicates: kept.size < declared.length,
    keptColumn: (spelling) => kept.get(normalizeColumnName(spelling)),
    isMerged: (spelling) =>
      (counts.get(normalizeColumnName(spelling)) ?? 0) > 1,
  }
}

/**
 * Thrown when a value would be written to a merged column of another
 * declared type. Cytoscape Desktop fails the import in this case.
 */
export class ColumnTypeConflictError extends Error {
  readonly columnName: AttributeName
  readonly columnType: ValueTypeName
  readonly spelling: AttributeName
  readonly spellingType: ValueTypeName

  constructor(kept: DeclaredColumn, spelling: DeclaredColumn) {
    super(
      `Column "${spelling.name}" (${spelling.type}) has a value, but it has ` +
        `the same name as column "${kept.name}" (${kept.type}), ignoring ` +
        `case, and a different type`,
    )
    this.name = 'ColumnTypeConflictError'
    this.columnName = kept.name
    this.columnType = kept.type
    this.spelling = spelling.name
    this.spellingType = spelling.type
  }
}

/**
 * @throws ColumnTypeConflictError when a value declared as `spelling` cannot
 *   be written to the kept column
 */
export const assertSameColumnType = (
  kept: DeclaredColumn,
  spelling: DeclaredColumn,
): void => {
  if (kept.type !== spelling.type) {
    throw new ColumnTypeConflictError(kept, spelling)
  }
}

/**
 * Write a cell to a row. A plain assignment to `__proto__` would replace the
 * row's prototype instead of storing the value.
 */
export const setCellValue = (
  row: Record<AttributeName, ValueType>,
  name: AttributeName,
  value: ValueType,
): void => {
  if (name === '__proto__') {
    Object.defineProperty(row, name, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    })
    return
  }
  row[name] = value
}
