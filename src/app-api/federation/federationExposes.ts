// Single source of truth for Module Federation exposed modules.
// Imported by vite.config.ts (build) and federationExposes.test.ts (contract).
//
// Keep this file free of imports that pull in Vite plugins or React so it stays
// trivially importable from a Vitest unit test.

export const FEDERATION_NAME = 'cyweb'
export const FEDERATION_FILENAME = 'remoteEntry.js'

// key = the cyweb/<Name> import path (without the 'cyweb/' prefix);
// value = the source module it maps to (relative to the repo root).
export const FEDERATION_EXPOSES = {
  './ApiTypes': './src/app-api/types/index.ts',
  './ElementApi': './src/app-api/useElementApi.ts',
  './NetworkApi': './src/app-api/useNetworkApi.ts',
  './SelectionApi': './src/app-api/useSelectionApi.ts',
  './ViewportApi': './src/app-api/useViewportApi.ts',
  './TableApi': './src/app-api/useTableApi.ts',
  './VisualStyleApi': './src/app-api/useVisualStyleApi.ts',
  './LayoutApi': './src/app-api/useLayoutApi.ts',
  './ExportApi': './src/app-api/useExportApi.ts',
  './WorkspaceApi': './src/app-api/useWorkspaceApi.ts',
  './AppIdContext': './src/app-api/AppIdContext.tsx',
  './EventBus': './src/app-api/useCyWebEvent.ts',
  './CredentialStore': './src/data/hooks/stores/CredentialStore.ts',
  './LayoutStore': './src/data/hooks/stores/LayoutStore.ts',
  './MessageStore': './src/data/hooks/stores/MessageStore.ts',
  './NetworkStore': './src/data/hooks/stores/NetworkStore.ts',
  './NetworkSummaryStore': './src/data/hooks/stores/NetworkSummaryStore.ts',
  './OpaqueAspectStore': './src/data/hooks/stores/OpaqueAspectStore.ts',
  './RendererStore': './src/data/hooks/stores/RendererStore.ts',
  './TableStore': './src/data/hooks/stores/TableStore.ts',
  './UiStateStore': './src/data/hooks/stores/UiStateStore.ts',
  './ViewModelStore': './src/data/hooks/stores/ViewModelStore.ts',
  './VisualStyleStore': './src/data/hooks/stores/VisualStyleStore.ts',
  './WorkspaceStore': './src/data/hooks/stores/WorkspaceStore.ts',
  './CreateNetwork': './src/data/task/useCreateNetwork.tsx',
  './CreateNetworkFromCx2': './src/data/task/useCreateNetworkFromCx2.tsx',
} as const

// Shared as singletons so a remote resolves the host's single instance rather
// than bundling its own. React/ReactDOM must be single or cross-boundary hooks
// throw "invalid hook call". MUI relies on Emotion, so @emotion/react and
// @emotion/styled must also be singletons or a MUI-using remote gets a second
// Emotion cache (duplicated styles, broken theming).
export const FEDERATION_SHARED_SINGLETONS = [
  'react',
  'react-dom',
  '@mui/material',
  '@emotion/react',
  '@emotion/styled',
] as const
