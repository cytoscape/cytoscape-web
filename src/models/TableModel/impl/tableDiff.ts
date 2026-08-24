// src/models/TableModel/impl/tableDiff.ts
//
// Row-level diffing between two table snapshots.
//
// Extracted from the app-api event bus so the renderer can share it. Two
// consumers with different needs:
//   - `initEventBus` wants one flat list of touched row ids (`data:changed`).
//   - The node-graphics render hook must tell mutated rows from deleted ones:
//     a mutated row needs the hook re-run, a deleted row needs its image
//     dropped without calling the hook at all.
//
// Diffing is by row-object reference, not by value. `InMemoryTable` clones a
// row object on every write, so reference inequality is an exact "this row was
// written" signal — but note that the column-level operations (createColumn,
// deleteColumn, setColumnName, duplicateColumn, applyValueToElements) rebuild
// EVERY row object. Callers must expect an N-sized `changed` set from a single
// column rename and coalesce accordingly.

import { IdType } from '../../IdType'
import { Table } from '../Table'

export interface RowDelta {
  /** Rows present in `curr` whose object identity differs from `prev`. */
  readonly changed: readonly IdType[]
  /** Rows present in `prev` and absent from `curr`. */
  readonly removed: readonly IdType[]
}

/**
 * Split the difference between two table snapshots into mutated-or-added rows
 * and removed rows.
 *
 * Added rows appear in `changed`: they are present in `curr` and their identity
 * cannot match a `prev` entry that does not exist.
 */
export function detectRowDelta(curr: Table, prev: Table): RowDelta {
  const changed: IdType[] = []
  const removed: IdType[] = []

  for (const [id, row] of curr.rows) {
    if (prev.rows.get(id) !== row) changed.push(id)
  }
  for (const id of prev.rows.keys()) {
    if (!curr.rows.has(id)) removed.push(id)
  }

  return { changed, removed }
}

/**
 * Returns the IDs of rows that were added, deleted, or mutated between two
 * table snapshots. An empty array indicates a schema-only change.
 *
 * Order is significant to existing callers: mutated and added rows first (in
 * `curr` iteration order), then removed rows.
 */
export function detectChangedRowIds(curr: Table, prev: Table): IdType[] {
  const { changed, removed } = detectRowDelta(curr, prev)
  return [...changed, ...removed]
}
