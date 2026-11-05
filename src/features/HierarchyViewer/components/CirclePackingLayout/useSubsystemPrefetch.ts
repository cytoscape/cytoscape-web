import { useCallback, useContext, useEffect, useRef } from 'react'

import { AppConfigContext } from '../../../../AppConfigContext'
import { useCredentialStore } from '../../../../data/hooks/stores/CredentialStore'
import { useNetworkSummaryStore } from '../../../../data/hooks/stores/NetworkSummaryStore'
import { useTableStore } from '../../../../data/hooks/stores/TableStore'
import { logApi } from '../../../../debug'
import { IdType } from '../../../../models/IdType'
import { getHcxMetadata } from '../../utils/hierarchyUtil'
import {
  prefetchSubnetworkCx2,
  subsystemRequest,
} from '../../utils/subnetworkQueryUtil'

/**
 * How long the pointer rests on a circle before its subsystem downloads.
 * Long enough that sweeping across the Cell View starts nothing.
 */
export const SUBSYSTEM_PREFETCH_DELAY_MS = 150

/**
 * Download a subsystem's network while the pointer rests on its circle, so
 * a click finds it downloaded or under way (prefetchSubnetworkCx2).
 *
 * Returns `hover`, to call with each circle the pointer enters: a subsystem
 * ID starts the delay, `undefined` (the root, a gene) cancels it. Its
 * identity never changes, so d3 handlers bound once can call it.
 */
export const useSubsystemPrefetch = (
  hierarchyId: IdType,
): ((subsystemId: IdType | undefined) => void) => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const table = useTableStore((state) => state.tables[hierarchyId])
  const summary = useNetworkSummaryStore(
    (state) => state.summaries[hierarchyId],
  )
  const getToken = useCredentialStore((state) => state.getToken)

  const latest = useRef({ table, summary, ndexBaseUrl, getToken })
  latest.current = { table, summary, ndexBaseUrl, getToken }
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(timer.current), [])

  return useCallback((subsystemId: IdType | undefined): void => {
    clearTimeout(timer.current)
    if (subsystemId === undefined) return
    timer.current = setTimeout(() => {
      const { table, summary, ndexBaseUrl, getToken } = latest.current
      const request = subsystemRequest(
        table?.nodeTable.rows.get(subsystemId),
        getHcxMetadata(summary),
        ndexBaseUrl,
      )
      if (request === undefined) return
      getToken()
        .then((token) => prefetchSubnetworkCx2(request, token))
        .catch((error: unknown) =>
          logApi.warn(`Subsystem ${subsystemId} prefetch skipped`, error),
        )
    }, SUBSYSTEM_PREFETCH_DELAY_MS)
  }, [])
}
