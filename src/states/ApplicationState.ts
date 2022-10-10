import { Workspace, CurrentNetwork } from '../models'

export interface ApplicationState {
  workspace: Workspace
  currentNetwork: CurrentNetwork
  appDispatch: any
}
