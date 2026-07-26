import React from 'react'
import { Item } from '@glideapps/glide-data-grid'

export const useIsContextCellVirtual = (
  contextMenu: { cell: Item } | null,
  allColumns: any[],
) => {
  return React.useMemo(() => {
    return (
      contextMenu !== null &&
      allColumns[contextMenu.cell[0]] != null &&
      (allColumns[contextMenu.cell[0]] as any).isVirtual === true
    )
  }, [contextMenu, allColumns])
}
