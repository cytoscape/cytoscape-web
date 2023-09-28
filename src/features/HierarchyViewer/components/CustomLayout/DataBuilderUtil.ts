import { IdType } from '../../../../models/IdType'
import { Table, ValueType } from '../../../../models/TableModel'
import { SubsystemTag } from '../../model/HcxMetaTag'

/**
 * Get the member list of the given node
 *
 * @param nodeId
 * @param table
 * @returns
 */
export const getMembers = (nodeId: IdType, table: Table): string[] => {
  if (nodeId === undefined) {
    throw new Error('Node ID is undefined')
  }

  const row: Record<string, ValueType> | undefined = table.rows.get(nodeId)
  if (row === undefined) {
    throw new Error(`Row ${nodeId} not found`)
  }
  return row[SubsystemTag.members] as string[]
}
