import {
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { useNetworkSummaryStore } from '../../store/NetworkSummaryStore'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import parse from 'html-react-parser'
import React from 'react'

export function NetworkPropertyTable(): React.ReactElement {
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const networkInfo = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )
  const properties = networkInfo?.properties ?? []
  return (
    <TableContainer component={Paper} sx={{ height: 200, overflow: 'scroll' }}>
      <Table sx={{ minWidth: 650 }} size="small" aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>Key</TableCell>
            <TableCell>Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {properties.map((row) => (
            <TableRow
              key={row.predicateString}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell>{row.predicateString}</TableCell>
              <TableCell>{row.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default function NetworkInfoPanel(): React.ReactElement {
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const networkInfo = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  return (
    <Box sx={{ height: '100%', overflow: 'scroll', pl: 1, pr: 1 }}>
      <Typography variant="h6">{networkInfo?.name ?? ''}</Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ maxHeight: 450, overflow: 'scroll' }}>
          {parse(networkInfo?.description ?? '')}
        </Box>
        {/* {networkInfo?.properties.length > 0 ? <NetworkPropertyTable /> : null} */}
      </Box>
    </Box>
  )
}
