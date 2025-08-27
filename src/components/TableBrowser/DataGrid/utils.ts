import { GridCellKind } from '@glideapps/glide-data-grid'
import { ValueTypeName } from '../../../models/TableModel'

export const getCellKind = (type: ValueTypeName): GridCellKind => {
  const valueTypeName2CellTypeMap: Record<ValueTypeName, GridCellKind> = {
    [ValueTypeName.String]: GridCellKind.Text,
    [ValueTypeName.Long]: GridCellKind.Number,
    [ValueTypeName.Integer]: GridCellKind.Number,
    [ValueTypeName.Double]: GridCellKind.Number,
    [ValueTypeName.Boolean]: GridCellKind.Boolean,
    [ValueTypeName.ListString]: GridCellKind.Text,
    [ValueTypeName.ListLong]: GridCellKind.Text,
    [ValueTypeName.ListInteger]: GridCellKind.Text,
    [ValueTypeName.ListDouble]: GridCellKind.Text,
    [ValueTypeName.ListBoolean]: GridCellKind.Text,
  }
  return valueTypeName2CellTypeMap[type] ?? GridCellKind.Text
}
