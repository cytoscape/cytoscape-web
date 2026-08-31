import { GenericFileUploadDialog } from './GenericFileUploadDialog'

interface DatabaseSnapshotFileUploadProps {
  show: boolean
  handleClose: () => void
  onFileSelect: (file: File) => void | Promise<void>
}

export function DatabaseSnapshotFileUpload(
  props: DatabaseSnapshotFileUploadProps,
): JSX.Element {
  const { show, handleClose, onFileSelect } = props

  return (
    <GenericFileUploadDialog
      show={show}
      handleClose={handleClose}
      onFileSelect={onFileSelect}
      acceptedFileTypes={['json']}
      title="Open Workspace Backup"
      description="Drag a workspace backup file here"
      supportedFileTypesText="Supported file type: .json"
      maxFileSizeMB={100}
      testIds={{
        modal: 'database-snapshot-upload-modal',
        dropzone: 'database-snapshot-upload-dropzone',
        browseButton: 'database-snapshot-upload-browse-button',
      }}
    />
  )
}
