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
  Chip,
  Divider,
} from '@mui/material'

import { useNetworkSummaryStore } from '../../store/NetworkSummaryStore'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import parse from 'html-react-parser'
import React from 'react'
import { dateFormatter } from '../../utils/date-format'

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
export default function NetworkInfoPanel(props: {
  height: number
}): React.ReactElement {
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const networkInfo = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )
  const properties = networkInfo?.properties ?? []

  const containsHtmlAnchor = (text: string) => {
    return /<a\s+href=/i.test(text)
  }

  const linkifyPlainTextUrls = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    return text.replace(
      urlRegex,
      (url) =>
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`,
    )
  }

  const capitalizeFirstLetter = (string: string): string => {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }

  return (
    <Box sx={{ height: props.height, overflow: 'auto', pl: 1, pr: 1 }}>
      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h6">{networkInfo?.name ?? ''}</Typography>
        {networkInfo?.visibility ? (
          <Chip sx={{ ml: 1 }} size="small" label={networkInfo?.visibility} />
        ) : null}
        {networkInfo?.version ? (
          <Chip
            sx={{ ml: 1 }}
            size="small"
            label={`Version: ${networkInfo?.version}`}
          />
        ) : null}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography
          sx={{ ml: 1, mr: 4, fontSize: 14, color: 'gray' }}
          variant="subtitle1"
        >
          {`Owner: ${networkInfo?.owner}`}
        </Typography>

        <Typography
          sx={{ mr: 4, fontSize: 14, color: 'gray' }}
          variant="subtitle1"
        >
          {`Created: ${dateFormatter(networkInfo?.creationTime ?? '')}`}
        </Typography>
        <Typography
          sx={{ mr: 4, fontSize: 14, color: 'gray' }}
          variant="subtitle1"
        >
          {`Modified: ${dateFormatter(networkInfo?.modificationTime ?? '')}`}
        </Typography>
        {networkInfo?.isNdex && (
          <Typography sx={{ mr: 1, fontSize: 14, color: 'gray' }}>
            UUID: {currentNetworkId}
          </Typography>
        )}
      </Box>
      <Divider />
      <Box sx={{ p: 1 }}>
        <Box>
          <Typography
            sx={{ fontSize: 14, fontWeight: 'bold' }}
            variant="subtitle1"
          >
            Description:
          </Typography>
          <Typography variant="body2">
            {parse(networkInfo?.description ?? '')}
            {properties
              .filter(
                (prop) =>
                  prop.predicateString.startsWith('rights') ||
                  prop.predicateString.startsWith('reference'),
              )
              .map((prop, index) => {
                let displayValue: React.ReactNode

                const valueString = prop.value.toString()

                if (containsHtmlAnchor(valueString)) {
                  displayValue = parse(valueString)
                } else {
                  displayValue = parse(linkifyPlainTextUrls(valueString))
                }

                return (
                  <div key={index} style={{ margin: '4px 0px' }}>
                    <span style={{ fontWeight: 'bold' }}>
                      {capitalizeFirstLetter(prop.predicateString)}:
                    </span>{' '}
                    {displayValue}
                  </div>
                )
              })}
          </Typography>

          <Typography
            sx={{ fontSize: 14, fontWeight: 'bold' }}
            variant="subtitle1"
          >
            Properties:
          </Typography>
          <Typography variant="body2" component="div">
            {properties
              .filter(
                (prop) =>
                  !prop.predicateString.startsWith('__') &&
                  prop.predicateString !== 'description' &&
                  prop.predicateString !== 'reference' &&
                  prop.predicateString !== 'rights' &&
                  prop.predicateString !== 'rightsHolder',
              )
              .map((prop, index) => {
                let displayValue: React.ReactNode

                const valueString = prop.value.toString()

                if (containsHtmlAnchor(valueString)) {
                  displayValue = parse(valueString)
                } else {
                  displayValue = parse(linkifyPlainTextUrls(valueString))
                }

                return (
                  <div key={index}>
                    {capitalizeFirstLetter(prop.predicateString)}:{' '}
                    {displayValue}
                  </div>
                )
              })}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
