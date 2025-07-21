import React from 'react'
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
import parse from 'html-react-parser'

import { useNetworkSummaryStore } from '../../store/NetworkSummaryStore'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
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

  // Helpers
  const containsHtmlAnchor = (text: string) => /<a\s+href=/i.test(text)
  const linkifyPlainTextUrls = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    return text.replace(
      urlRegex,
      (url) =>
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`,
    )
  }
  const capitalizeFirstLetter = (str: string): string =>
    str.charAt(0).toUpperCase() + str.slice(1)

  // Define the exact display order for these special props
  const specialOrder = ['rights', 'rightsHolder', 'reference'] as const

  // Build specialProps in that exact sequence (exact match)
  const specialProps = specialOrder
    .map((key) =>
      properties.find(
        (p) => p.predicateString.toLowerCase() === key.toLowerCase(),
      ),
    )
    .filter((p): p is typeof properties[number] => Boolean(p))

  // All other props
  const otherProps = properties.filter(
    (p) =>
      !specialOrder.some(
        (key) => p.predicateString.toLowerCase() === key.toLowerCase(),
      ) &&
      !p.predicateString.startsWith('__') &&
      p.predicateString !== 'description',
  )

  return (
    <Box sx={{ height: props.height, overflow: 'auto', pl: 1, pr: 1 }}>
      {/* Header with name, visibility, version */}
      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h6">{networkInfo?.name ?? ''}</Typography>
        {networkInfo?.visibility && (
          <Chip sx={{ ml: 1 }} size="small" label={networkInfo.visibility} />
        )}
        {networkInfo?.version && (
          <Chip
            sx={{ ml: 1 }}
            size="small"
            label={`Version: ${networkInfo.version}`}
          />
        )}
      </Box>

      {/* Metadata line */}
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
        {!networkInfo?.isNdex ? (
          <Typography
            sx={{ ml: 1, mr: 4, fontSize: 14, color: 'gray' }}
            variant="subtitle1"
          >
            {`Imported: ${dateFormatter(networkInfo?.creationTime ?? '')}`}
          </Typography>
        ) : (
          <>
            <Typography
              sx={{ ml: 1, mr: 4, fontSize: 14, color: 'gray' }}
              variant="subtitle1"
            >
              {`Owner: ${networkInfo.owner}`}
            </Typography>
            <Typography
              sx={{ mr: 4, fontSize: 14, color: 'gray' }}
              variant="subtitle1"
            >
              {`Created: ${dateFormatter(networkInfo.creationTime)}`}
            </Typography>
            <Typography
              sx={{ mr: 4, fontSize: 14, color: 'gray' }}
              variant="subtitle1"
            >
              {`Modified: ${dateFormatter(networkInfo.modificationTime)}`}
            </Typography>
            <Typography sx={{ mr: 1, fontSize: 14, color: 'gray' }}>
              UUID: {currentNetworkId}
            </Typography>
          </>
        )}
      </Box>

      <Divider sx={{ my: 1 }} />

      <Box sx={{ p: 1 }}>
        {/* DESCRIPTION section */}
        <Typography
          sx={{ fontSize: 14, fontWeight: 'bold' }}
          variant="subtitle1"
        >
          Description:
        </Typography>
        <Typography variant="body2" component="div">
          {parse(networkInfo?.description ?? '')}
          {specialProps.map((prop, idx) => {
            const valueString = prop.value.toString()
            const displayValue = containsHtmlAnchor(valueString)
              ? parse(valueString)
              : parse(linkifyPlainTextUrls(valueString))

            return (
              <div key={idx} style={{ margin: 0 }}>
                <strong>{capitalizeFirstLetter(prop.predicateString)}:</strong>{' '}
                {displayValue}
              </div>
            )
          })}
        </Typography>

        {/* PROPERTIES section */}
        <Typography
          sx={{ fontSize: 14, fontWeight: 'bold' }}
          variant="subtitle1"
        >
          Properties:
        </Typography>
        <Typography variant="body2" component="div">
          {otherProps.map((prop, idx) => {
            const valueString = prop.value.toString()
            const displayValue = containsHtmlAnchor(valueString)
              ? parse(valueString)
              : parse(linkifyPlainTextUrls(valueString))

            return (
              <div key={idx}>
                {capitalizeFirstLetter(prop.predicateString)}: {displayValue}
              </div>
            )
          })}
        </Typography>
      </Box>
    </Box>
  )
}