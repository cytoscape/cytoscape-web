/**
 * This is an experimental module to manage multiple instances
 * of Cytoscape Web in different tabs.
 *
 * Currently, just manages the tab IDs for external applications
 */

import { logStartup } from '../debug'
import { CYWEB_TAB_PREFIX, getTabId } from './tabId'

/**
 * Generates a channel name based on the current hostname and port
 *
 * @returns a name for the channel based on the current hostname and port
 */
const generateChannelName = (): string => {
  const domain = window.location.hostname
  const port = window.location.port
  const hostWithPort = port ? `${domain}-${port}` : domain

  const cleanName = hostWithPort.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()

  return `cytoscape-${cleanName}-channel`
}

const CHANNEL_NAME: string = generateChannelName()

logStartup.info(
  `[tab-manager.ts]:[${generateChannelName.name}]: Cytoscape Web's current active broadcast channel name:`,
  CHANNEL_NAME,
)

const CYWEB_PREFIX: string = CYWEB_TAB_PREFIX

const TabMessageType = {
  CREATED: `${CYWEB_PREFIX}-tab-created`,
  ACTIVE: `${CYWEB_PREFIX}-tab-active`,
  ALIVE: `${CYWEB_PREFIX}-tab-alive`,
  INACTIVE: `${CYWEB_PREFIX}-tab-inactive`,
  FOCUSED: `${CYWEB_PREFIX}-tab-focused`,
  CLOSED: `${CYWEB_PREFIX}-tab-closed`,
  RELOAD: `${CYWEB_PREFIX}-tab-reload`,
} as const

type TabMessageType = (typeof TabMessageType)[keyof typeof TabMessageType]

interface TabMessage {
  type: TabMessageType
  tabId: string
}

/**
 * Basic tab manager for Cytoscape Web
 *
 * @param channelName the name of the broadcast channel for the given domain
 *
 * @returns the tab ID for the current tab
 */
export const initializeTabManager = (
  channelName: string = CHANNEL_NAME,
): string => {
  // Single source of truth for this tab's identity, shared with the IndexedDB
  // layer so cross-tab sync can recognize the echo of its own writes.
  // getTabId() also persists it to window.name.
  const tabId = getTabId()

  const activeTabs = new Set<string>()
  const channel = new BroadcastChannel(channelName)

  // Add to the ID set
  activeTabs.add(tabId)

  const newTabCreated: TabMessage = { type: TabMessageType.CREATED, tabId }
  channel.postMessage(newTabCreated)

  // Send a message to all other tabs to announce this tab will be reloading
  window.addEventListener('beforeunload', () => {
    // Tell others that this tab is closing / reloading
    const message: TabMessage = { type: TabMessageType.RELOAD, tabId }
    channel.postMessage(message)
  })

  document.addEventListener('visibilitychange', () => {
    const isVisible = !document.hidden
    if (isVisible) {
      logStartup.info(
        `[tab-manager.ts]:[onVisibilitychange]: Current Cytoscape Instance: ${tabId} isVisible: ${isVisible}`,
      )
      channel.postMessage({ type: TabMessageType.ACTIVE, tabId })
    } else {
      channel.postMessage({ type: TabMessageType.INACTIVE, tabId })
    }
  })

  channel.onmessage = (event) => {
    const message = event.data as TabMessage

    switch (message.type) {
      case TabMessageType.CREATED:
        activeTabs.add(message.tabId)
        if (message.tabId !== tabId) {
          channel.postMessage({ type: TabMessageType.ALIVE, tabId })
        }
        break
      case TabMessageType.ACTIVE:
        activeTabs.add(message.tabId)
        break
      case TabMessageType.ALIVE:
        activeTabs.add(message.tabId)
        break
      case TabMessageType.CLOSED:
      case TabMessageType.RELOAD:
        activeTabs.delete(message.tabId)
        break
    }
  }

  // window.name is already set by getTabId()
  logStartup.info(
    `[tab-manager.ts]:[${initializeTabManager.name}]: Cytoscape window name initialized. Use this as the target when you open this tab again.`,
    window.name,
  )

  return tabId
}
