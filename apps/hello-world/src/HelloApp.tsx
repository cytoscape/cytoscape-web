import { CyApp } from '../../../src/models/AppModel/CyApp'
import { WorkspaceStore } from '../../../src/store/WorkspaceStore'

export const HelloApp: CyApp = {
  id: 'hello-cy-world',
  name: 'Hello Cy World App',
  url: 'http://localhost:3000/hello-cy-world.js',
  components: {
    HelloPanel: {
      id: 'hello-panel',
      name: 'Hello Panel',
      url: 'http://localhost:3000/hello-panel.js',
    },
    HelloFn: (message: string) => {
      console.log(`## Hello, world from the Cytoscape app module!: ${message}`)
    },
  },
  inject: (useStore: () => WorkspaceStore) => {
    console.log('## Hello, world from the Cytoscape app module!')
    console.log('## Workspace store:', useStore)
  },
}
