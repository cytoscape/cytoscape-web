import { CardContent, Typography } from '@mui/material'
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
  // const keys: string[] = Object.keys(row)
  const name: ValueType = row.name ?? '?'

  return (
    <CardContent>
      <Typography variant="h6">Subsystem: {name}</Typography>
      <Typography variant="body2">
        {/* {keys.map((key) => (
          <div key={key}>
            {key}: {row[key]}
          </div>
        ))} */}
      </Typography>
    </CardContent>
  )
}
