import { CardContent, Divider, Typography } from '@mui/material'
import { ValueType } from '../../models/TableModel'

interface GraphObjectPropertyPanelProps {
  row: Record<string, ValueType>
}

/**
 * Component to display properties
 *  - Currently used only for hierarchy viewer
 */
export const GraphObjectPropertyPanel = ({
  row,
}: GraphObjectPropertyPanelProps): JSX.Element => {
  const keys: string[] = Object.keys(row)
  const name: ValueType = row.name ?? '?'

  return (
    <CardContent>
      <Typography variant="h6">Subsystem: {name}</Typography>
      {keys.map((key) => (
        <>
          <Divider />
          <Typography key={key} variant="body2">
            {key}: {row[key]}
          </Typography>
        </>
      ))}
    </CardContent>
  )
}
