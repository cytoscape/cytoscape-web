import { IdType } from '../../../models/IdType'
import { ValueType } from '../../../models/TableModel'
import { isMissingValue } from '../../../models/TableModel/impl/valueTypeImpl'

/**
 * Name the Hierarchy Viewer shows for a subsystem: the value of the attribute
 * the node label is mapped to, else the `name` column, else the node id.
 *
 * HCX files need not have a `name` column (the repo's fixtures use `n`), and
 * CX2 values are untyped JSON, so either attribute can be missing or null.
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
  if (!isMissingValue(mapped)) {
    return String(mapped)
  }
  const name = row['name']
  if (!isMissingValue(name)) {
    return String(name)
  }
  return subsystemId
}
