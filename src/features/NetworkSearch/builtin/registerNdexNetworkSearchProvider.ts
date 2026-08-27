// src/features/NetworkSearch/builtin/registerNdexNetworkSearchProvider.ts
//
// Registers NDEx as a built-in network search provider. It goes through the
// same 'search-bar' resource registration as external apps, under the
// reserved BUILTIN_APP_ID — useNetworkSearchProviders treats that id as
// always active, since no app lifecycle governs it.
//
// Submitting a query opens the existing "NDEx - Network Browser" dialog
// with the text prefilled and the search already running; everything after
// that (result browsing, selection, loading) is the dialog's job.

import { createResourceApi } from '../../../app-api/core/resourceApi'
import type { NetworkSearchQuery } from '../../../app-api/types/AppResourceTypes'
import ndexLogo from '../../../assets/ndex-logo.svg'
import { useLoadFromNdexDialogStore } from '../../ToolBar/DataMenu/store/loadFromNdexDialogStore'

/**
 * Reserved appId for host-provided resources. Not a real app: it has no
 * lifecycle, no catalog entry, and is never deactivated.
 */
export const BUILTIN_APP_ID = '__builtin__'

export function registerNdexNetworkSearchProvider(): void {
  createResourceApi(BUILTIN_APP_ID).registerNetworkSearchProvider({
    id: 'ndex',
    name: 'NDEx',
    description:
      'Search NDEx for public and private networks and open them in the workspace.',
    icon: ndexLogo,
    website: 'https://www.ndexbio.org',
    placeholder: 'Search NDEx',
    onSubmit: ({ query }: NetworkSearchQuery) => {
      useLoadFromNdexDialogStore.getState().openDialog(query)
    },
  })
}
