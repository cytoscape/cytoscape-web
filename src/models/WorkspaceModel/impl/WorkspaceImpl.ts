import { v4 as uuidv4 } from 'uuid'

import { Workspace } from '../Workspace'

// const DEF_WORKSPACE_ID = 'newWorkspace'
export const DEF_WORKSPACE_NAME = 'Untitled Workspace'

export const createWorkspace = (): Workspace => {
  return {
    id: uuidv4(),
    name: DEF_WORKSPACE_NAME,
    networkIds: [],
    networkModified: {},
    creationTime: new Date(),
    localModificationTime: new Date(),
    currentNetworkId: '',
    isRemote: false,
  }
}
