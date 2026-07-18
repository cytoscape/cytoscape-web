import { useEffect, useState } from 'react'

const CHANNEL_NAME = 'cyweb-multitab'
const PING = 'ping'
const PONG = 'pong'

/**
 * Detect whether more than one Cytoscape Web tab is open in this browser (CW-658).
 *
 * Uses a `BroadcastChannel`: on mount this tab announces itself with a `ping`;
 * any already-open tab answers with a `pong`. Either message tells a tab it is
 * not alone — so both the newly-opened tab and the pre-existing tab(s) learn of
 * each other. Degrades to `false` where `BroadcastChannel` is unavailable.
 */
export const useMultiTabDetection = (): boolean => {
  const [multipleTabsOpen, setMultipleTabsOpen] = useState(false)

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      return
    }
    const channel = new BroadcastChannel(CHANNEL_NAME)

    const onMessage = (event: MessageEvent): void => {
      if (event.data === PING) {
        // A new tab announced itself — answer so it learns we exist, and note
        // that we are no longer alone.
        channel.postMessage(PONG)
        setMultipleTabsOpen(true)
      } else if (event.data === PONG) {
        // An existing tab answered our announcement.
        setMultipleTabsOpen(true)
      }
    }

    channel.addEventListener('message', onMessage)
    channel.postMessage(PING)

    return () => {
      channel.removeEventListener('message', onMessage)
      channel.close()
    }
  }, [])

  return multipleTabsOpen
}
