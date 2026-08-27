// src/features/NetworkSearch/builtin/registerNdexNetworkSearchProvider.test.ts
// (jsdom: createResourceApi transitively imports the db layer, which pulls
// dexie-observable and needs browser globals)

import { beforeEach, describe, expect, it } from 'vitest'

import { useAppResourceStore } from '../../../data/hooks/stores/AppResourceStore'
import type { NetworkSearchQuery } from '../../../app-api/types/AppResourceTypes'
import { useLoadFromNdexDialogStore } from '../../ToolBar/DataMenu/store/loadFromNdexDialogStore'
import {
  BUILTIN_APP_ID,
  registerNdexNetworkSearchProvider,
} from './registerNdexNetworkSearchProvider'

describe('registerNdexNetworkSearchProvider', () => {
  beforeEach(() => {
    useAppResourceStore.setState({ resources: [] })
    useLoadFromNdexDialogStore.setState({ isOpen: false, initialQuery: null })
  })

  it('registers the NDEx provider under the builtin appId', () => {
    registerNdexNetworkSearchProvider()

    const { resources } = useAppResourceStore.getState()
    expect(resources).toHaveLength(1)
    const ndex = resources[0]
    expect(ndex.appId).toBe(BUILTIN_APP_ID)
    expect(ndex.slot).toBe('search-bar')
    expect(ndex.id).toBe('ndex')
    expect(ndex.title).toBe('NDEx')
    // The bundled logo resolves to a path/URL string via the asset pipeline.
    expect(typeof ndex.icon).toBe('string')
    expect(ndex.icon).toContain('ndex-logo')
    expect(ndex.website).toBe('https://www.ndexbio.org')
    expect(ndex.placeholder).toBe('Search NDEx')
    expect(typeof ndex.onSubmit).toBe('function')
    // No options panel — everything beyond the query lives in the dialog.
    expect(ndex.component).toBeUndefined()
  })

  it('is idempotent (upsert): registering twice keeps one resource', () => {
    registerNdexNetworkSearchProvider()
    registerNdexNetworkSearchProvider()
    expect(useAppResourceStore.getState().resources).toHaveLength(1)
  })

  it('onSubmit opens the NDEx dialog with the submitted query', () => {
    registerNdexNetworkSearchProvider()
    const onSubmit = useAppResourceStore.getState().resources[0].onSubmit as (
      query: NetworkSearchQuery,
    ) => void

    onSubmit({ query: 'BRCA1' })

    const { isOpen, initialQuery } = useLoadFromNdexDialogStore.getState()
    expect(isOpen).toBe(true)
    expect(initialQuery).toBe('BRCA1')
  })
})
