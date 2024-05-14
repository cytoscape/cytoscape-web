import { WorkspaceStore } from '../../store/WorkspaceStore'

export interface CyApp {
  url: string
  name: string
  id: string
  components: any
  inject: (useStore: () => WorkspaceStore) => void
}
