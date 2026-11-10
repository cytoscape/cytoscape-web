import { AttributeName } from '../../../models/TableModel'
import {
  columnNameIsTaken,
  isIdColumnName,
} from '../../../models/TableModel/impl/columnNames'

/**
 * Why a name cannot be given to a new or renamed column, for the Table
 * Browser's column forms. Undefined when the name can be used.
 *
 * @param ownName The column being renamed. Changing only the case of its own
 *   name stays allowed, except for a case variant of `id`.
 */
export const columnNameProblem = (
  columns: readonly { readonly name: AttributeName }[],
  name: AttributeName,
  ownName?: AttributeName,
): string | undefined => {
  if (isIdColumnName(name)) {
    return `${name} is reserved for the element ID. Please enter a different column name`
  }
  if (name === ownName || columnNameIsTaken(columns, name, ownName)) {
    return `${name} already exists. Please enter a new unique column name`
  }
  return undefined
}
