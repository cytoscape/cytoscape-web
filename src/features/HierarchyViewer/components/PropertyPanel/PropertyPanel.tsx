import {
  Box,
  List,
  ListItem,
  ListItemText,
  Theme,
  Typography,
  useTheme,
} from '@mui/material'
import { ValueType } from '../../../../models/TableModel'
import { useTableStore } from '../../../../store/TableStore'
import { useViewModelStore } from '../../../../store/ViewModelStore'
import { MessagePanel } from '../../../../components/Messages'
import { NetworkView } from '../../../../models/ViewModel'

interface PropertyPanelProps {
  networkId: string
}

export const PropertyPanel = ({
  networkId,
}: PropertyPanelProps): JSX.Element => {
  const theme: Theme = useTheme()
  const tables = useTableStore((state) => state.tables)
  const tablePair = tables[networkId]

  const viewModel: NetworkView | undefined = useViewModelStore(
    (state) => state.getViewModel(networkId),
  )
  const { selectedNodes, selectedEdges } = viewModel ?? {}

  if (tablePair === undefined) {
    return <></>
  }
  if (selectedNodes === undefined || selectedNodes.length === 0) {
    if (selectedEdges === undefined || selectedEdges.length === 0) {
      return (
        <MessagePanel message="Please select a node in the network above" />
      )
    }
    return <></>
  } else if (selectedNodes.length > 1) {
    return (
      <MessagePanel message="(Selected objects are displayed in the table browser)" />
    )
  }


  const { nodeTable } = tablePair

  const selectedNodeId = selectedNodes[0]
  const { rows } = nodeTable
  const row: Record<string, ValueType> = rows.get(selectedNodeId) ?? {}

  const name: ValueType = row.name ?? selectedNodeId

  const keys: string[] = Object.keys(row).sort()

  return (
    <Box
      sx={{
        width: '100%',
        height: 'calc(100% - 48px)',
        overflow: 'auto',
        bgcolor: theme.palette.grey[50],
        padding: theme.spacing(1),
      }}
    >
      <Typography
        sx={{ background: 'white', padding: theme.spacing(1) }}
        variant={'subtitle2'}
      >
        {name}
      </Typography>
      <List dense={true} sx={{ width: '100%' }}>
        {keys.map((key) => (
          <ListItem key={key}>
            <ListItemText primary={row[key]} secondary={key} />
          </ListItem>
        ))}
      </List>
    </Box>
  )
}
