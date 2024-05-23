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
    return /<a\s+href=/i.test(text);
  };

  const linkifyPlainTextUrls = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
  };

  const hasReferenceProperties = properties.some((prop) =>
  Object.keys(prop).some((key) => key.startsWith('reference'))
  );

  const hasRightsProperties = properties.some((prop) =>
  Object.keys(prop).some((key) => key.startsWith('rights'))
  );

  return (
    <Box sx={{ height: props.height - 50, overflow: 'scroll', pl: 1, pr: 1 }}>
      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h6">{networkInfo?.name ?? ''}</Typography>
        {networkInfo?.visibility != null ? (
          <Chip sx={{ ml: 1 }} size="small" label={networkInfo?.visibility} />
        ) : null}
        {networkInfo?.version != null ? (
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
          {`Created: ${networkInfo?.creationTime.toLocaleString()}`}
        </Typography>
        <Typography
          sx={{ mr: 1, fontSize: 14, color: 'gray' }}
          variant="subtitle1"
        >
          {`Modified: ${networkInfo?.modificationTime.toLocaleString()}`}
        </Typography>
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
          </Typography>
          {hasRightsProperties && (
          <Typography
            sx={{ fontSize: 14, fontWeight: 'bold' }}
            variant="subtitle1"
          >
            Rights:
          </Typography>
          )}
          <Typography variant="body2">
            {properties.map((prop, index) => (
              <div key={index}>
                {Object.entries(prop)
                  .filter(([key, _]) => key.startsWith('rights') || key.startsWith('rightsholder'))
                  .map(([key, value], idx) => (
                    <div key={idx}>{`${key}: ${parse(value)}`}</div>
                  ))}
              </div>
            ))}
          </Typography>
          {hasReferenceProperties && (
          <Typography
            sx={{ fontSize: 14, fontWeight: 'bold' }}
            variant="subtitle1"
          >
            Reference:
          </Typography>
          )}
          <Typography variant="body2">
            {properties.map((prop, index) => (
              <div key={index}>
                {Object.entries(prop)
                  .filter(([key, _]) => key.startsWith('reference'))
                  .map(([_, value], idx) => (
                    <div key={idx}>{parse(value)}</div>
                  ))}
              </div>
            ))}
          </Typography>
          <Typography
            sx={{ fontSize: 14, fontWeight: 'bold' }}
            variant="subtitle1"
          >
            Properties:
          </Typography>
          <Typography variant="body2" component="div">

            {properties.map((prop, index) => (
              <div key={index}>
                {Object.entries(prop)
                  .filter(([key, _]) =>
                    !key.startsWith('_') &&
                    !key.startsWith('rights') &&
                    !key.startsWith('rightsHolder') &&
                    !key.startsWith('reference'))
                  .map(([key, value], idx) => {
                    let displayValue;
                    if (typeof value === 'string') {
                      if (containsHtmlAnchor(value)) {
                        displayValue = parse(value);
                      } else {
                        const linkifiedValue = linkifyPlainTextUrls(value);
                        displayValue = parse(linkifiedValue);
                      }
                    } else {
                      displayValue = value;
                    }

                    return <div key={idx}>{`${key}: `}{displayValue}</div>;
                  })}
              </div>
            ))}
          </Typography>   
        </Box>
      </Box>
    </Box>
  )
}
