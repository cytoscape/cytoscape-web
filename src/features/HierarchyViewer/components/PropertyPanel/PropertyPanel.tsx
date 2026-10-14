import { Box, List, ListItem, ListItemText, Typography } from '@mui/material'

import { useTableStore } from '../../../../data/hooks/stores/TableStore'
import { useViewModelStore } from '../../../../data/hooks/stores/ViewModelStore'
import { ValueType } from '../../../../models/TableModel'
import { NetworkView } from '../../../../models/ViewModel'
import { MessagePanel } from '../../../Messages'
import { formatValueText } from '../../utils/attributeValueDisplay'
import { AttributeValue } from './AttributeValue'

interface PropertyPanelProps {
  networkId: string
}

export const PropertyPanel = ({
  networkId,
}: PropertyPanelProps): JSX.Element => {
  const tables = useTableStore((state) => state.tables)
  const tablePair = tables[networkId]

  const viewModel: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(networkId),
  )
  const { selectedNodes, selectedEdges } = viewModel ?? {}

  if (tablePair === undefined) {
    return <></>
  }
  if (selectedNodes === undefined || selectedNodes.length === 0) {
    if (selectedEdges === undefined || selectedEdges.length === 0) {
      return (
        <Box sx={{ width: '100%', height: '100%', textAlign: 'center' }}>
          <MessagePanel message="Please select a node in the network above" />
        </Box>
      )
    }
    return <></>
  } else if (selectedNodes.length > 1) {
    return (
      <Box sx={{ width: '100%', height: '100%', textAlign: 'center' }}>
        <MessagePanel message="Selected objects are displayed in the table browser" />
      </Box>
    )
  }

  const { nodeTable } = tablePair

  const selectedNodeId = selectedNodes[0]
  const { rows } = nodeTable
  const row: Record<string, ValueType> = rows.get(selectedNodeId) ?? {}

  const name: string = formatValueText(row.name) ?? selectedNodeId

  // Every column of the table, like the Nodes table, so a value the row
  // lacks shows a placeholder instead of disappearing. Row keys are kept too
  // in case a row holds an undeclared attribute.
  const keys: string[] = [
    ...new Set([
      ...nodeTable.columns.map((column) => column.name),
      ...Object.keys(row),
    ]),
  ].sort()

  return (
    <Box
      data-testid="property-panel"
      sx={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          width: '100%',
          p: 1,
          textAlign: 'center',
          color: (theme) => theme.palette.text.secondary,
          backgroundColor: (theme) => theme.palette.background.default,
        }}
      >
        {name}
      </Typography>
      <List dense={true} sx={{ width: '100%' }}>
        {keys.map(
          (key) =>
            key !== 'name' && (
              <ListItem key={key}>
                <ListItemText
                  primary={<AttributeValue value={row[key]} />}
                  secondary={key + ':'}
                  // Flip the visual stack layout
                  sx={{ display: 'flex', flexDirection: 'column-reverse' }}
                  // Match the standard Material typography styles for an overline
                  secondaryTypographyProps={{
                    variant: 'overline',
                    lineHeight: 'normal',
                  }}
                  primaryTypographyProps={{ variant: 'body1' }}
                />
              </ListItem>
            ),
        )}
      </List>
    </Box>
  )
}
