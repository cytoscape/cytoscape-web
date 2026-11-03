import { IdType } from '../../../models/IdType'
import { ValueType } from '../../../models/TableModel'
import { isMissingValue } from '../../../models/TableModel/impl/valueTypeImpl'

const hasNoName = (value: ValueType | undefined): boolean =>
  isMissingValue(value) ||
  (Array.isArray(value) && (value as unknown[]).every(isMissingValue))

/**
 * Name the Hierarchy Viewer shows for a subsystem: the value of the attribute
 * the node label is mapped to, else the `name` column, else the node id.
 *
 * HCX files need not have a `name` column (the repo's fixtures use `n`), and
 * CX2 values are untyped JSON, so either attribute can be missing or null.
 * A list with no non-blank item counts as missing too.
 *
 * @param row - The subsystem's row in the hierarchy's node table
 * @param nodeLabelAttr - Attribute the node label is mapped to, if any
 * @param subsystemId - ID of the subsystem node
 */
export const getSubsystemName = (
  row: Record<string, ValueType>,
  nodeLabelAttr: string | undefined,
  subsystemId: IdType,
): string => {
  const mapped = nodeLabelAttr === undefined ? undefined : row[nodeLabelAttr]
  if (!hasNoName(mapped)) {
    return String(mapped)
  }
  const name = row['name']
  if (!hasNoName(name)) {
    return String(name)
  }
  return subsystemId
}
