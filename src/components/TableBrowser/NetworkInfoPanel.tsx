import React from 'react'
import {
  Typography,
  Box,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Card,
  CardContent,
  Divider,
  Chip,
  Paper,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useNetworkSummaryStore } from '../../store/NetworkSummaryStore'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import parse from 'html-react-parser'

type NdexNetworkProperty = {
  predicateString: string
  value: string | number | boolean | string[] | number[] | boolean[]
}

export default function NetworkInfoPanel(props: {
  height: number
}): React.ReactElement {
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm')) // Check if screen is small
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const networkInfo = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )
  const properties: NdexNetworkProperty[] = networkInfo?.properties ?? []

  const containsHtmlAnchor = (text: string) => /<a\s+href=/i.test(text)
  const linkifyPlainTextUrls = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    return text.replace(
      urlRegex,
      (url) =>
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`,
    )
  }

  const capitalizeFirstLetter = (string: string): string =>
    string.charAt(0).toUpperCase() + string.slice(1)

  const renderTable = (data: NdexNetworkProperty[]) => (
    <TableContainer
      sx={{
        maxHeight: isSmallScreen ? 200 : 'none',
        backgroundColor: '#fafafa',
        borderRadius: 2,
      }}
    >
      <Table>
        <TableBody>
          {data.map((row, index) => (
            <TableRow
              key={index}
              sx={{
                '&:nth-of-type(odd)': { backgroundColor: '#f9f9f9' },
                '&:hover': { backgroundColor: '#e0e0e0' },
              }}
            >
              <TableCell>
                <Typography sx={{ fontWeight: 'bold', fontSize: 14 }}>
                  {capitalizeFirstLetter(row.predicateString)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography sx={{ fontSize: 14 }}>
                  {containsHtmlAnchor(row.value.toString())
                    ? parse(row.value.toString())
                    : parse(linkifyPlainTextUrls(row.value.toString()))}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )

  return (
    <Box
      sx={{
        height: props.height,
        overflow: 'auto',
        px: 2,
        backgroundColor: '#f4f4f4',
      }}
    >
      {/* Header Section */}
      <Grid
        container
        spacing={2}
        alignItems="center"
        justifyContent={isSmallScreen ? 'center' : 'space-between'}
        sx={{ mt: 2 }}
      >
        <Grid item xs={12} sm="auto">
          <Typography
            variant="h6"
            sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}
          >
            {networkInfo?.name ?? ''}
          </Typography>
        </Grid>
        <Grid item xs={12} sm="auto">
          {networkInfo?.visibility && (
            <Chip
              sx={{
                backgroundColor:
                  networkInfo?.visibility === 'PUBLIC' ? '#4caf50' : '#f44336',
                color: 'white',
              }}
              size="small"
              label={networkInfo?.visibility}
            />
          )}
          {networkInfo?.version && (
            <Chip
              sx={{ ml: 1 }}
              size="small"
              label={`Version: ${networkInfo?.version}`}
            />
          )}
        </Grid>
      </Grid>
      <Divider sx={{ my: 2 }} />
      {/* Info Section */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Typography
            sx={{ fontSize: 14, color: 'text.secondary' }}
          >{`Owner: ${networkInfo?.owner}`}</Typography>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            {`Created: ${networkInfo?.creationTime.toLocaleString()}`}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            {`Modified: ${networkInfo?.modificationTime.toLocaleString()}`}
          </Typography>
        </Grid>
      </Grid>
      <Box sx={{ mt: 3 }}>
        {/* Description Section */}
        <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 1 }}>
          <CardContent>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 'bold',
                mb: 2,
                textTransform: 'uppercase',
              }}
            >
              Description
            </Typography>
            <Paper elevation={1} sx={{ p: 2, backgroundColor: '#fff' }}>
              {parse(networkInfo?.description ?? '')}
            </Paper>
            {renderTable(
              properties.filter((prop) =>
                ['rights', 'rightsHolder', 'reference', 'description'].includes(
                  prop.predicateString,
                ),
              ),
            )}
          </CardContent>
        </Card>
        {/* Properties Section */}
        <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
          <CardContent>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 'bold',
                mb: 2,
                textTransform: 'uppercase',
              }}
            >
              Properties
            </Typography>
            {renderTable(
              properties.filter(
                (prop) =>
                  ![
                    'rights',
                    'rightsHolder',
                    'reference',
                    'description',
                  ].includes(prop.predicateString) &&
                  !prop.predicateString.startsWith('__'),
              ),
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
