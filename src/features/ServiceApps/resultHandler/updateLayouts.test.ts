import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'

import { useLayoutStore } from '../../../data/hooks/stores/LayoutStore'
import { useNetworkStore } from '../../../data/hooks/stores/NetworkStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import NetworkFn from '../../../models/NetworkModel'
import ViewModelFn from '../../../models/ViewModel'
import { useUpdateLayouts } from './updateLayouts'

const networkId = 'service-layout'
const seedNetwork = () => {
  const network = NetworkFn.createNetworkFromLists(
    networkId,
    [{ id: '1' }, { id: '2' }],
    [],
  )
  useNetworkStore.getState().add(network)
  useViewModelStore
    .getState()
    .add(networkId, ViewModelFn.createViewModel(network))
}
const nodeViews = () =>
  useViewModelStore.getState().getViewModel(networkId)!.nodeViews
const responseObj = [{ id: 1, x: 111, y: 222 }]

beforeEach(seedNetwork)
afterEach(() => {
  useNetworkStore.getState().delete(networkId)
  useViewModelStore.getState().delete(networkId)
  useLayoutStore.getState().setIsRunning(false)
})

it('applies service coordinates after an older layout finishes and keeps its other nodes', async () => {
  const { result } = renderHook(useUpdateLayouts)
  useLayoutStore.getState().startLayout(networkId)
  const update = result.current({ networkId, responseObj })
  const whileRunning = nodeViews()['1'].x

  useViewModelStore.getState().updateNodePositions(
    networkId,
    new Map([
      ['1', [42, 24]],
      ['2', [7, 8]],
    ]),
  )
  useLayoutStore.getState().setIsRunning(false)
  await update

  expect(nodeViews()).toMatchObject({
    '1': { x: 111, y: 222 },
    '2': { x: 7, y: 8 },
  })
  expect(whileRunning).toBe(0)
})

it('drops a queued response if its network is deleted and the ID is reused', async () => {
  const { result } = renderHook(useUpdateLayouts)
  useLayoutStore.getState().startLayout('other')
  const update = result.current({ networkId, responseObj })
  useNetworkStore.getState().delete(networkId)
  useViewModelStore.getState().delete(networkId)
  seedNetwork()
  await update
  expect(useLayoutStore.getState().isRunning).toBe(true)
  useLayoutStore.getState().setIsRunning(false)
  await Promise.resolve()
  expect(nodeViews()['1']).toMatchObject({ x: 0, y: 0 })
})

it('applies an idle response immediately and keeps a supplied z across repeated node IDs', async () => {
  const { result } = renderHook(useUpdateLayouts)
  const update = result.current({
    networkId,
    responseObj: [{ id: 1, x: 1, y: 2, z: 3 }, ...responseObj],
  })
  expect(nodeViews()['1']).toMatchObject({ x: 111, y: 222, z: 3 })
  await update
})

it('rejects a failed queued write and lets the next response run', async () => {
  const { result } = renderHook(useUpdateLayouts)
  useLayoutStore.getState().startLayout('other')
  const first = result.current({ networkId, responseObj })
  const second = result.current({
    networkId,
    responseObj: [{ id: 2, x: 10, y: 20 }],
  })
  const unsubscribe = useViewModelStore.subscribe(() => {
    unsubscribe()
    throw new Error('position update failed')
  })
  const rejected = expect(first).rejects.toThrow('position update failed')
  useLayoutStore.getState().setIsRunning(false)
  await rejected
  await second
  expect(nodeViews()['2']).toMatchObject({ x: 10, y: 20 })
  expect(useLayoutStore.getState().isRunning).toBe(false)
})
