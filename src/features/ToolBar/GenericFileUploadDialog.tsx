import { Typography } from '@mui/material'

import {
  DropzoneHint,
  FileDropzoneDialog,
  FileRejection,
} from '@/features/FileDropzoneDialog'

export const DEFAULT_MAX_FILE_SIZE_MB = 5

/**
 * Extension + size validator shared by every upload dropzone, so the rejection
 * messages and the size limit cannot drift between callers.
 */
export const createFileValidator =
  (acceptedFileTypes: string[], maxFileSizeMB: number) =>
  (file: File): { code: string; message: string } | null => {
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

    if (maxFileSizeMB > 0 && file.size > maxFileSizeMB * 1024 * 1024) {
      return {
        code: 'file-too-large',
        message: `File ${file.name} exceeds the maximum size of ${maxFileSizeMB}MB.`,
      }
    }

    return null
  }

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
  /** Override any subset to give a caller's dialog unique selectors. */
  testIds?: { modal?: string; dropzone?: string; browseButton?: string }
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
    maxFileSizeMB = DEFAULT_MAX_FILE_SIZE_MB,
    validator,
    onFileError,
    testIds,
  } = props

  return (
    <FileDropzoneDialog
      show={show}
      handleClose={handleClose}
      title={title}
      testIds={{
        modal: testIds?.modal ?? 'generic-file-upload-modal',
        dropzone: testIds?.dropzone ?? 'generic-file-upload-dropzone',
        browseButton:
          testIds?.browseButton ?? 'generic-file-upload-browse-button',
      }}
      validator={
        validator ?? createFileValidator(acceptedFileTypes, maxFileSizeMB)
      }
      onDrop={(file: File) => {
        void onFileSelect(file)
      }}
      onReject={(rejectedFiles: FileRejection[]) => {
        onFileError?.(rejectedFiles)
      }}
    >
      <Typography variant="h6">{description}</Typography>
      <DropzoneHint>{supportedFileTypesText}</DropzoneHint>
      {maxFileSizeMB > 0 && (
        <DropzoneHint dimmed>
          Files under {maxFileSizeMB}MB supported.
        </DropzoneHint>
      )}
    </FileDropzoneDialog>
  )
}
