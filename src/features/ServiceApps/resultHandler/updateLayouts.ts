import { useCallback } from 'react'

import { useLayoutStore } from '../../../data/hooks/stores/LayoutStore'
import { useNetworkStore } from '../../../data/hooks/stores/NetworkStore'
import { runLayoutWhenIdle } from '../../../data/hooks/stores/runLayoutWhenIdle'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { logApp } from '../../../debug'
import { ActionHandlerProps } from './serviceResultHandlerManager'

interface UpdatedPosition {
  id: number
  x: number
  y: number
  z?: number
}

const isValidUpdatedPosition = (obj: any): obj is UpdatedPosition =>
  obj &&
  typeof obj.id === 'number' &&
  typeof obj.x === 'number' &&
  typeof obj.y === 'number' &&
  (obj.z === undefined || typeof obj.z === 'number')

export const useUpdateLayouts = () => {
  const updateNodePositions = useViewModelStore(
    (state) => state.updateNodePositions,
  )
  return useCallback(
    async function updateLayouts({
      responseObj,
      networkId,
    }: ActionHandlerProps): Promise<void> {
      if (!Array.isArray(responseObj)) {
        logApp.warn(
          `[${updateLayouts.name}]: Invalid layout update response: Expected an array`,
          responseObj,
        )
        return
      }

      const positions = new Map<string, [number, number, number?]>()
      for (const item of responseObj) {
        if (isValidUpdatedPosition(item)) {
          const id = String(item.id)
          // Repeated entries may update x and y without changing an earlier z.
          positions.set(id, [item.x, item.y, item.z ?? positions.get(id)?.[2]])
        } else {
          logApp.warn(
            `[${updateLayouts.name}]: Invalid UpdatedPosition item:`,
            item,
          )
        }
      }
      if (
        positions.size === 0 ||
        !useNetworkStore.getState().networks.has(networkId)
      ) {
        return
      }
      await new Promise<void>((resolve, reject) => {
        runLayoutWhenIdle(
          (claim) => {
            if (!claim(networkId)) return false
            try {
              updateNodePositions(networkId, positions)
              resolve()
            } catch (error) {
              reject(error)
            } finally {
              useLayoutStore.getState().setIsRunning(false)
            }
            return true
          },
          { networkId, onNetworkRemoved: resolve },
        )
      })
    },
    [updateNodePositions],
  )
}
