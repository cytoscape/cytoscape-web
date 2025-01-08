import { useCallback } from 'react'
import { ActionHandlerProps } from './serviceResultHandlerManager'
import { useAppStore } from '../../../store/AppStore'
import { CyApp } from '../../../models'

interface URLData {
  url: string
  target?: string
}

export const useOpenURL = (): (({
  responseObj,
  networkId,
}: ActionHandlerProps) => void) => {
  const addApp = useAppStore((state) => state.add)
  const isValidURLData = (obj: any): obj is URLData => {
    return (
      obj &&
      typeof obj.url === 'string' &&
      (obj.target === null || typeof obj.target === 'string')
    )
  }
  const openURL = useCallback(
    ({ responseObj, networkId }: ActionHandlerProps) => {
      if (!isValidURLData(responseObj)) {
        console.warn('Invalid URL data:', responseObj)
        return
      }
      const { url, target } = responseObj

      // If target is empty string, blank or null open in a new tab
      if (target === null) {
        window.open(url, '_blank')
      }
    },
    [addApp],
  )
  return openURL
}
