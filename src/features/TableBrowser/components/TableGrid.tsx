import DataEditor, {
  CellClickedEventArgs,
  DataEditorRef,
  GridColumn,
  GridSelection,
  Item,
  Theme,
} from '@glideapps/glide-data-grid'
import React from 'react'

export interface TableGridProps {
  testId: string
  editorRef: React.RefObject<DataEditorRef>
  selection: GridSelection
  onGridSelectionChange: (selection: GridSelection) => void
  minId: number
  maxId: number
  onCellContextMenu: (
    cell: readonly [number, number],
    event: CellClickedEventArgs,
  ) => void
  onCellActivated: (cell: Item) => void
  onPaste: (
    target: readonly [number, number],
    values: readonly (readonly string[])[],
  ) => boolean
  onColumnMoved: (startIndex: number, endIndex: number) => void
  onItemHovered: (args: Item) => void
  onColumnResizeEnd: (
    column: GridColumn,
    newSize: number,
    colIndex: number,
  ) => void
  width: number
  height: number
  getCellContent: (cell: readonly [number, number]) => any
  onCellEdited: (cell: readonly [number, number], newValue: any) => void
  columns: any[]
  theme: Partial<Theme>
  headerIcons: any
  drawHeader: any
}

export const TableGrid: React.FC<TableGridProps> = ({
  testId,
  editorRef,
  selection,
  onGridSelectionChange,
  minId,
  maxId,
  onCellContextMenu,
  onCellActivated,
  onPaste,
  onColumnMoved,
  onItemHovered,
  onColumnResizeEnd,
  width,
  height,
  getCellContent,
  onCellEdited,
  columns,
  theme,
  headerIcons,
  drawHeader,
}) => {
  return (
    <div data-testid={testId} style={{ width: width, height: height }}>
      <DataEditor
        ref={editorRef}
        gridSelection={selection}
        onGridSelectionChange={onGridSelectionChange}
        rowSelectionBlending="mixed"
        rangeSelectionBlending="mixed"
        columnSelectionBlending="mixed"
        rangeSelect="rect"
        rowSelect={'multi'}
        rowMarkers={'checkbox'}
        rowMarkerWidth={35}
        rowMarkerStartIndex={minId}
        onCellContextMenu={onCellContextMenu}
        onCellActivated={onCellActivated}
        onPaste={onPaste}
        getCellsForSelection={true}
        onColumnMoved={onColumnMoved}
        onItemHovered={(e) => onItemHovered(e.location)}
        overscrollX={10}
        overscrollY={10}
        onColumnResizeEnd={onColumnResizeEnd}
        width={width}
        height={height}
        getCellContent={getCellContent}
        onCellEdited={onCellEdited}
        columns={columns}
        rows={maxId - minId + 1}
        theme={theme}
        headerIcons={headerIcons}
        drawHeader={drawHeader}
      />
    </div>
  )
}
