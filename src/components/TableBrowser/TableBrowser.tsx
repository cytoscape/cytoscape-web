import { Group, Space } from '@mantine/core'
import { Box, Popover, Tooltip, Button, Divider } from '@mui/material'
import { IconAlertCircle } from '@tabler/icons-react'
import { PrimeReactProvider } from 'primereact/api'
import { Column } from 'primereact/column'
import { DataTable, DataTableValue } from 'primereact/datatable'
import {
  ValueTypeNameRender,
  ValueTypeForm,
} from '../../features/TableDataLoader/components/ValueTypeNameForm'
import { valueTypeName2Label } from '../../features/TableDataLoader/model/impl/CreateNetworkFromTable'
import { IdType, NetworkView, Table } from '../../models'
import { columns } from '../../models/TableModel/impl/InMemoryTable'
import { useTableStore } from '../../store/TableStore'
import { useViewModelStore } from '../../store/ViewModelStore'
import { useVisualStyleStore } from '../../store/VisualStyleStore'
import { useUiStateStore } from '../../store/UiStateStore'

export default function TableBrowser(props: {
  currentNetworkId: IdType
  setHeight: (height: number) => void
  height: number // current height of the panel that contains the table browser -- needed to sync to the dataeditor
  width: number // current width of the panel that contains the table browser -- needed to sync to the dataeditor
}) {
  const ui = useUiStateStore((state) => state.ui)
  const networkId = props.currentNetworkId
  const visualStyle = useVisualStyleStore(
    (state) => state.visualStyles[props.currentNetworkId],
  )
  const setMapping = useVisualStyleStore((state) => state.setMapping)

  const viewModel: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(networkId),
  )
  const selectedNodes = useViewModelStore(
    (state) => viewModel?.selectedNodes ?? [],
  )
  const selectedEdges = useViewModelStore(
    (state) => viewModel?.selectedEdges ?? [],
  )

  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)
  const setCellValue = useTableStore((state) => state.setValue)
  const tables: Record<IdType, { nodeTable: Table; edgeTable: Table }> =
    useTableStore((state) => state.tables)
  const duplicateColumn = useTableStore((state) => state.duplicateColumn)
  const setColumnName = useTableStore((state) => state.setColumnName)
  const addColumn = useTableStore((state) => state.createColumn)
  const deleteColumn = useTableStore((state) => state.deleteColumn)
  const applyValueToElemenets = useTableStore(
    (state) => state.applyValueToElements,
  )
  const moveColumn = useTableStore((state) => state.moveColumn)
  const currentTabIndex = ui.tableUi.activeTabIndex

  const nodeTable = tables[networkId]?.nodeTable
  const edgeTable = tables[networkId]?.edgeTable
  const currentTable = currentTabIndex === 0 ? nodeTable : edgeTable
  const nodeIds = Array.from(nodeTable?.rows.keys() ?? new Map()).map((v) => +v)
  const edgeIds = Array.from(edgeTable?.rows.keys() ?? new Map()).map(
    (v) => +v.slice(1),
  )
  const rows = Array.from((currentTable?.rows ?? new Map()).values())

  console.log(rows, currentTable?.columns)
  return (
    <PrimeReactProvider>
      <DataTable
        value={rows as DataTableValue[]}
        stripedRows
        showGridlines
        size="small"
        tableStyle={{ minWidth: '50rem' }}
        scrollable
        scrollHeight={'200px'}
        // virtualScrollerOptions={{
        // itemSize: 10,
        // }}
      >
        {currentTable?.columns.map((h, i) => {
          console.log(h)
          return (
            <Column
              key={h.name}
              field={h.name}
              body={(value, opts) => value[h.name]}
              header={
                h.name
                // <Popover
                //   zIndex={2001}
                //   position="bottom"
                //   withArrow
                //   arrowSize={20}
                //   shadow="md"
                // >
                //   <Popover.Target>
                //     <Box style={{ minWidth: 200 }}>
                //       <Group>
                //         <Text size="sm" c="gray" fw={500}>
                //           {h.name}
                //         </Text>
                //         {h.invalidValues.length > 0 ? (
                //           <Tooltip
                //             zIndex={2001}
                //             label={`Column '${h.name}' has ${h.invalidValues.length} values that cannot be parsed as type ${valueTypeName2Label[h.dataType]}`}
                //           >
                //             <IconAlertCircle size={20} color="red" />
                //           </Tooltip>
                //         ) : null}
                //       </Group>
                //       <Space h="sm" />
                //       <Box onClick={() => handleColumnClick(h)}>
                //         <Button.Group ml={1} orientation="vertical">
                //           <ValueTypeNameRender value={h.dataType} />
                //           <ColumnAssignmentTypeRender value={h.meaning} />
                //         </Button.Group>
                //       </Box>
                //     </Box>
                //   </Popover.Target>
                //   <Popover.Dropdown bg="var(--mantine-color-body)">
                //     <Box>
                //       <Box>
                //         <Text size={'xs'}>Meaning</Text>
                //         <Space h="xs" />
                //         <ColumnAssignmentTypeForm
                //           value={h.meaning}
                //           onChange={(value) =>
                //             onColumnAssignmentTypeChange(i, value)
                //           }
                //           validValues={validColumnTypes}
                //         />
                //       </Box>
                //       <Divider my="md" />
                //       <Box>
                //         <Text size={'xs'}>Data Type</Text>
                //         <Space h="xs" />
                //         <ValueTypeForm
                //           value={h.dataType}
                //           delimiter={h.delimiter}
                //           onChange={(value, delimiter) =>
                //             onValueTypeChange(i, value, delimiter)
                //           }
                //           validValues={validValueTypeNames}
                //         />
                //       </Box>
                //     </Box>
                //   </Popover.Dropdown>
                // </Popover>
              }
            ></Column>
          )
        })}
      </DataTable>
    </PrimeReactProvider>
  )
}
