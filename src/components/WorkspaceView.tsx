// import { ReactElement } from 'react'
// import Box from '@mui/material/Box'
// import Container from '@mui/material/Container'
// import Button from '@mui/material/Button'
// import { Typography } from '@mui/material'

// import AddIcon from '@mui/icons-material/Add'

// // import { NetworkSummary, Workspace } from '../models/WorkspacedModel'
// // import { useWorkspaceStore, AppState } from '../hooks/useWorkspaceStore'

// interface WorkspaceViewProps {
//   workspace: Workspace
// }

// interface NetworkSummaryViewProps {
//   networkSummary: NetworkSummary
//   selected: boolean
// }

// function NetworkSummaryView(props: NetworkSummaryViewProps): ReactElement {
//   const { networkSummary, selected } = props

//   const setNetwork = useWorkspaceStore((state: AppState) => state.setNetwork)

//   const onNetworkSummaryClick = (): void => setNetwork(networkSummary.id)
//   return (
//     <Box
//       sx={{
//         cursor: 'pointer',
//         p: 1,
//         backgroundColor: selected ? '#D6D6D6' : 'white',
//       }}
//       onClick={onNetworkSummaryClick}
//     >
//       <Box>{networkSummary.name}</Box>
//       <Box>{networkSummary.modifiedAt.toLocaleDateString()}</Box>
//     </Box>
//   )
// }

// export default function WorkspaceView(
//   props: WorkspaceViewProps,
// ): React.ReactElement {
//   const { workspace } = props

//   return (
//     <Container>
//       <Box
//         sx={{
//           display: 'flex',
//           justifyContent: 'space-between',
//           alignItems: 'center',
//         }}
//       >
//         <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
//           {workspace.name}
//         </Typography>
//         <Button
//           variant="contained"
//           sx={{ height: '1.5em', width: '1.5em' }}
//           aria-label="add network"
//         >
//           <AddIcon />
//         </Button>
//       </Box>
//       <Box>
//         {workspace.networkSummaries.map((networkSummary) => (
//           <NetworkSummaryView
//             networkSummary={networkSummary}
//             selected={networkSummary.id === workspace.currentNetworkId}
//             key={networkSummary.id}
//           />
//         ))}
//       </Box>
//     </Container>
//   )
// }
