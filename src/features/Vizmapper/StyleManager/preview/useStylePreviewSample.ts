import { useMemo } from 'react'

import { useNetworkStore } from '../../../../data/hooks/stores/NetworkStore'
import { useTableStore } from '../../../../data/hooks/stores/TableStore'
import { useViewModelStore } from '../../../../data/hooks/stores/ViewModelStore'
import { IdType } from '../../../../models/IdType'
import {
  PreviewSample,
  sampleFromNetwork,
  syntheticSample,
} from './previewSample'

/**
 * The graph every thumbnail in the picker is drawn on.
 *
 * One sample for the whole picker, taken from the network being viewed — so a
 * style from another network or from the library previews as "what this would
 * look like applied HERE", which is exactly what the picker's copy-on-apply
 * semantics mean. It also keeps the thumbnail cache to a single sample key.
 *
 * Falls back to the synthetic Source -> Target pair when no network is loaded.
 */
export const useStylePreviewSample = (networkId: IdType): PreviewSample => {
  const network = useNetworkStore((state) => state.networks.get(networkId))
  const tables = useTableStore((state) => state.tables[networkId])
  const viewModels = useViewModelStore((state) => state.viewModels[networkId])

  return useMemo(() => {
    if (network === undefined || tables === undefined) {
      return syntheticSample()
    }
    return (
      sampleFromNetwork(
        network,
        tables.nodeTable,
        tables.edgeTable,
        viewModels?.[0],
      ) ?? syntheticSample()
    )
  }, [network, tables, viewModels])
}
