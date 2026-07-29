import DataEditor, {
  CellClickedEventArgs,
  DataEditorRef,
  GridColumn,
  GridMouseEventArgs,
  GridSelection,
  Item,
  Theme,
} from '@glideapps/glide-data-grid'
import React from 'react'

/**
 * Bounds for auto-sized columns (the ones `useTableData` hands over without a
 * `width`). The floor keeps a short name like "id" from collapsing to a stub;
 * the ceiling keeps one long text value from pushing every other column off
 * screen — drag wider from there and the width is remembered.
 */
const MIN_COLUMN_WIDTH = 80
const MAX_COLUMN_AUTO_WIDTH = 320

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
  /** Receives cell, header and out-of-bounds hovers as reported by the grid. */
  onItemHovered: (args: GridMouseEventArgs) => void
  /** Called when the pointer leaves the grid entirely. */
  onGridMouseLeave?: () => void
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
  onGridMouseLeave,
  onColumnResizeEnd,
  width,
  height,
  getCellContent,
  onCellEdited,
  columns,
  theme,
}) => {
  return (
    <div
      data-testid={testId}
      style={{ width: width, height: height }}
      onMouseLeave={onGridMouseLeave}
    >
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
        onItemHovered={onItemHovered}
        overscrollX={10}
        overscrollY={10}
        onColumnResizeEnd={onColumnResizeEnd}
        minColumnWidth={MIN_COLUMN_WIDTH}
        maxColumnAutoWidth={MAX_COLUMN_AUTO_WIDTH}
        width={width}
        height={height}
        getCellContent={getCellContent}
        onCellEdited={onCellEdited}
        columns={columns}
        rows={maxId - minId + 1}
        theme={theme}
      />
    </div>
  )
}
