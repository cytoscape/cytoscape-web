import { Box, Table, TableBody, TableContainer } from "@mui/material"
import { ReactElement } from "react"
import { IdType } from "src/models"
import NetworkTableHeader from "./NetworkTableHeader"
import NetworkTableRow from "./NetworkTableRow"

interface NetworkTableProps {
  networks: any[]
  selectedNetworks: IdType[]
  networkIds: IdType[]
  maxNetworkFileSize: number
  maxNetworkElementsThreshold: number
  onToggleSelect: (id: IdType) => void
}

const NetworkTable = ({
  networks,
  selectedNetworks,
  networkIds,
  maxNetworkFileSize,
  maxNetworkElementsThreshold,
  onToggleSelect,
}: NetworkTableProps): ReactElement => (
  <Box>
    <TableContainer sx={{ height: 460 }}>
      <Table size="small" stickyHeader>
        <NetworkTableHeader />
        <TableBody>
          {networks.map((network) => (
            <NetworkTableRow
              key={network.externalId}
              network={network}
              selected={selectedNetworks.includes(network.externalId)}
              networkAlreadyLoaded={networkIds.includes(network.externalId)}
              maxNetworkFileSize={maxNetworkFileSize}
              maxNetworkElementsThreshold={maxNetworkElementsThreshold}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)

export default NetworkTable;