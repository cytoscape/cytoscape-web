import React, { lazy, ReactElement, Suspense } from 'react'

export interface Plugin {
  name: string
  path: string
}

// Plugin registry
const pluginRegistry: Record<string, Plugin> = {}

export const getPluginFromRemote = async (
  pluginName: string,
): Promise<Plugin> => {
  if (pluginRegistry[pluginName] === undefined) {
    throw new Error('Plugin not found')
  }
  return Promise.resolve({
    name: 'test',
    path: 'localhost:5500/TestPlugin.tsx',
  })
}

export async function loadPlugin(pluginName: string): Promise<void> {
  try {
    const plugin = await getPluginFromRemote(pluginName)
    const { name } = plugin
    pluginRegistry[name] = plugin
  } catch (e) {
    console.error(e)
  }
}

function usePluginComponent(
  pluginName: string,
  componentName: string,
): ReactElement {
  const PluginComponent = lazy(
    () => import(`${pluginRegistry[pluginName].path}`),
  )

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PluginComponent />
    </Suspense>
  )
}
