/**
 * Generates a channel name based on the current hostname and port
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
console.log('Cytoscape Web active channel name', CHANNEL_NAME)

const CYWEB_PREFIX: string = 'cyweb'
const TAB_ID_KEY: string = `${CYWEB_PREFIX}-current-id`

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

export const initTabManager = (channelName: string = CHANNEL_NAME): string => {
  // const previousId = sessionStorage.getItem(TAB_ID_KEY)
  // Check window.name for the tab ID
  const windowName = window.name
  let tabId = `${CYWEB_PREFIX}-${Date.now()}`
  if (windowName && windowName.startsWith(CYWEB_PREFIX + '-')) {
    console.log('Last Cytoscape Web tab ID', windowName)
    tabId = windowName
  }

  console.log('Cytoscape Web tab ID', tabId)

  // sessionStorage.setItem(TAB_ID_KEY, tabId)

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

    // Set this tab ID for the new tab after reload
    // sessionStorage.setItem(TAB_ID_KEY, tabId)
  })

  document.addEventListener('visibilitychange', () => {
    const isVisible = !document.hidden
    console.log('## tab focus changed', tabId, isVisible)
    if (isVisible) {
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
        console.log('Tab active', message.tabId)
        break
      case TabMessageType.ALIVE:
        activeTabs.add(message.tabId)
        break
      case (TabMessageType.CLOSED, TabMessageType.RELOAD):
        activeTabs.delete(message.tabId)
        break
    }
    console.log('Current instances', activeTabs)
  }

  return tabId
}
