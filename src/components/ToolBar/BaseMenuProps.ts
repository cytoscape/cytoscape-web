export interface BaseMenuProps {
  handleClose: () => void
}

export interface WorkspaceMenuProps extends BaseMenuProps {
  existingWorkspace: any[]
}