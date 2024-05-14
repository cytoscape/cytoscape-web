import { Workspace } from '@src/models/WorkspaceModel'
import { useWorkspaceStore } from '@src/store/WorkspaceStore'

export const HelloPanel = (message: string): JSX.Element => {
  const workspace: Workspace = useWorkspaceStore((state) => state.workspace)
  console.log(workspace.id)
  return <h1>Hello, Cytoscape world ==== {message}</h1>
}
