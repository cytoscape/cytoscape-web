import { Checkbox, TableCell, TableRow, Tooltip } from "@mui/material"
import { ReactElement } from "react"
import { IdType } from "src/models"
import { formatBytes } from '../../../../utils/byte-conversion'
import { dateFormatter } from '../../../../utils/date-format'

interface NetworkTableRowProps {
  network: {
    externalId: IdType
    name: string
    owner: string
    nodeCount: number
    edgeCount: number
    modificationTime: any
    cx2FileSize: number
    subnetworkIds: any[]
  }
  selected: boolean
  networkAlreadyLoaded: boolean
  maxNetworkFileSize: number
  maxNetworkElementsThreshold: number
  onToggleSelect: (id: IdType) => void
}

const NetworkTableRow = ({
  network,
  selected,
  networkAlreadyLoaded,
  maxNetworkFileSize,
  maxNetworkElementsThreshold,
  onToggleSelect,
}: NetworkTableRowProps): ReactElement => {
  const {
    externalId,
    name,
    owner,
    nodeCount,
    edgeCount,
    modificationTime,
    cx2FileSize,
    subnetworkIds,
  } = network

  const networkIsSmallEnough =
    +nodeCount + +edgeCount < maxNetworkElementsThreshold &&
    cx2FileSize < maxNetworkFileSize
  const networkCanBeSelected =
    !networkAlreadyLoaded && networkIsSmallEnough && subnetworkIds.length === 0

  const dateDisplay = dateFormatter(modificationTime)
  const cellSx = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }

  const renderTableRow = (disabled: boolean = false) => (
    <TableRow
      sx={{
        backgroundColor: disabled ? '#d9d9d9' : 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      key={externalId}
      hover={!disabled}
      selected={!disabled && selected}
      onClick={() => !disabled && onToggleSelect(externalId)}
    >
      <TableCell padding="checkbox">
        <Checkbox
          disabled={disabled}
          onClick={() => !disabled && onToggleSelect(externalId)}
          checked={selected}
        />
      </TableCell>
      <TableCell sx={{ maxWidth: 400, ...cellSx }}>{name}</TableCell>
      <TableCell sx={{ maxWidth: 100, ...cellSx }}>{owner}</TableCell>
      <TableCell sx={{ maxWidth: 10, ...cellSx }}>{nodeCount}</TableCell>
      <TableCell sx={{ maxWidth: 10, ...cellSx }}>{edgeCount}</TableCell>
      <TableCell sx={{ maxWidth: 10, ...cellSx }}>{dateDisplay}</TableCell>
    </TableRow>
  )

  if (networkCanBeSelected) {
    return renderTableRow()
  }

  const tooltipMessage = networkAlreadyLoaded
    ? 'Network already loaded in the workspace'
    : subnetworkIds.length > 0
    ? 'Collections cannot be imported into Cytoscape Web'
    : `Networks must be smaller than ${formatBytes(
        maxNetworkFileSize,
      )} and contain less than ${maxNetworkElementsThreshold} nodes/edges.`

  return (
    <Tooltip key={externalId} title={tooltipMessage}>
      {renderTableRow(true)}
    </Tooltip>
  )
}

export default NetworkTableRow;