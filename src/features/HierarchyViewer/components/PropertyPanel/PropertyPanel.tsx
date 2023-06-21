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

interface PropertyPanelProps {
  networkId: string
}

export const PropertyPanel = ({
  networkId,
}: PropertyPanelProps): JSX.Element => {
  const theme: Theme = useTheme()
  const tables = useTableStore((state) => state.tables)
  const tablePair = tables[networkId]

  const { selectedNodes, selectedEdges } =
    useViewModelStore((state) => state.viewModels[networkId]) ?? {}

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
  }

  const { nodeTable } = tablePair

  const selectedNodeId = selectedNodes[0]
  const { rows } = nodeTable
  const row: Record<string, ValueType> = rows.get(selectedNodeId) ?? {}

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        bgcolor: theme.palette.grey[100],
        padding: theme.spacing(1),
        paddingBottom: theme.spacing(15),
        border: '4px solid red',
      }}
    >
      <Typography variant="h6">Node Properties</Typography>
      <List
        dense={true}
        sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}
      >
        {Object.keys(row).map((key) => (
          <ListItem key={key}>
            <ListItemText primary={row[key]} secondary={key} />
          </ListItem>
        ))}
      </List>
    </Box>
  )
}
