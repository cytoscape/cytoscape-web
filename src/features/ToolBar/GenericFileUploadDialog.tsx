import { Typography } from '@mui/material'

import {
  DropzoneHint,
  FileDropzoneDialog,
  FileRejection,
} from '@/features/FileDropzoneDialog'

export interface GenericFileUploadDialogProps {
  show: boolean
  handleClose: () => void
  onFileSelect: (file: File) => void | Promise<void>
  acceptedFileTypes: string[]
  title: string
  description: string
  supportedFileTypesText: string
  maxFileSizeMB?: number
  validator?: (file: File) => { code: string; message: string } | null
  onFileError?: (rejectedFiles: FileRejection[]) => void
}

export function GenericFileUploadDialog(
  props: GenericFileUploadDialogProps,
): JSX.Element {
  const {
    show,
    handleClose,
    onFileSelect,
    acceptedFileTypes,
    title,
    description,
    supportedFileTypesText,
    maxFileSizeMB = 5,
    validator,
    onFileError,
  } = props

  const defaultValidator = (file: File) => {
    // Do not validate if the object is not a file
    if (!file.name) {
      return null
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!fileExtension || !acceptedFileTypes.includes(fileExtension)) {
      return {
        code: 'file-invalid-type',
        message: `File ${file.name} is not a supported type.`,
      }
    }

    if (maxFileSizeMB && file.size > maxFileSizeMB * 1024 * 1024) {
      return {
        code: 'file-too-large',
        message: `File ${file.name} exceeds the maximum size of ${maxFileSizeMB}MB.`,
      }
    }

    return null
  }

  return (
    <FileDropzoneDialog
      show={show}
      handleClose={handleClose}
      title={title}
      testIds={{
        modal: 'generic-file-upload-modal',
        dropzone: 'generic-file-upload-dropzone',
        browseButton: 'generic-file-upload-browse-button',
      }}
      validator={validator ?? defaultValidator}
      onDrop={(file: File) => {
        void onFileSelect(file)
      }}
      onReject={(rejectedFiles: FileRejection[]) => {
        onFileError?.(rejectedFiles)
      }}
    >
      <Typography variant="h6">{description}</Typography>
      <DropzoneHint>{supportedFileTypesText}</DropzoneHint>
      {maxFileSizeMB && (
        <DropzoneHint dimmed>
          Files under {maxFileSizeMB}MB supported.
        </DropzoneHint>
      )}
    </FileDropzoneDialog>
  )
}
