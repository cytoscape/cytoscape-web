import { Typography } from '@mui/material'
import Papa from 'papaparse'
import { useState } from 'react'

import { useMessageStore } from '@/data/hooks/stores/MessageStore'
import { MessageSeverity } from '@/models/MessageModel'
import { ConfirmationDialog } from '@/features/ConfirmationDialog'
import {
  DropzoneHint,
  FileDropzone,
  FileRejection,
} from '@/features/FileDropzoneDialog'
import { createFileValidator } from '@/features/ToolBar/GenericFileUploadDialog'
import {
  JoinTableToNetworkStep,
  useJoinTableToNetworkStore,
} from '../../store/joinTableToNetworkStore'

const SUPPORTED_EXTENSIONS = ['csv', 'txt', 'tsv']
// The whole file is read into memory and parsed synchronously on the main
// thread, so the hint in the dropzone and the validator promise the same limit.
const MAX_FILE_SIZE_MB = 5
const validateTableFile = createFileValidator(
  SUPPORTED_EXTENSIONS,
  MAX_FILE_SIZE_MB,
)

export function TableUpload() {
  const setFile = useJoinTableToNetworkStore((state) => state.setFile)
  const goToStep = useJoinTableToNetworkStore((state) => state.goToStep)
  const setRawText = useJoinTableToNetworkStore((state) => state.setRawText)
  const options = useJoinTableToNetworkStore((state) => state.options)
  const addMessage = useMessageStore((state) => state.addMessage)

  // Parse errors are surfaced through a confirm dialog: the user can still
  // choose to review the partially parsed table.
  const [parseErrorState, setParseErrorState] = useState<{
    message: string
    onConfirm: () => void
  } | null>(null)
  const [showParseErrors, setShowParseErrors] = useState(false)

  const onFileError = (files: FileRejection[]) => {
    // The validator already says why the file was rejected (wrong type, too
    // large, too many files); reporting "not supported" for all of them hid
    // the size limit.
    const rejectionMessage = files?.[0]?.errors?.[0]?.message
    addMessage({
      duration: 5000,
      message:
        rejectionMessage ??
        `The uploaded file ${files?.[0]?.file?.name ?? ''} is not supported. Supported file types are: ${SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(', ')}.`,
      severity: MessageSeverity.ERROR,
    })
  }

  const onFileDrop = (file: File) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const text = reader.result as string

      // Parse CSV here using PapaParse
      // Determine delimiter: if a custom delimiter is set (and not comma), use it;
      // otherwise pass undefined to let Papa.parse auto-detect the delimiter
      const delimiterFromOptions = options.delimiter
      const isDefaultDelimiter =
        !delimiterFromOptions || delimiterFromOptions === ','
      const delimiter = isDefaultDelimiter ? undefined : delimiterFromOptions

      const result = Papa.parse(text, {
        delimiter,
        skipEmptyLines: true,
      })

      const onFileValid = () => {
        setFile(file)
        goToStep(JoinTableToNetworkStep.ColumnAppendForm)
        setRawText(text)
      }

      if (result.errors.length > 0) {
        const errorLines = result.errors
          .map((e) => `${e.code}: ${e.message}`)
          .join('\n')
        setParseErrorState({
          message: `The following errors occurred parsing your data:\n${errorLines}\nDo you want to proceed to review your table data?`,
          onConfirm: onFileValid,
        })
        setShowParseErrors(true)
      } else {
        onFileValid()
      }
    })
    reader.readAsText(file)
  }

  return (
    <>
      <FileDropzone
        testIds={{
          dropzone: 'join-table-upload-dropzone',
          browseButton: 'join-table-upload-browse-button',
        }}
        validator={validateTableFile}
        onDrop={onFileDrop}
        onReject={onFileError}
      >
        <Typography variant="h6">Or drag a tabular file here</Typography>
        <DropzoneHint dimmed>
          Files under {MAX_FILE_SIZE_MB}MB supported
        </DropzoneHint>
      </FileDropzone>
      <ConfirmationDialog
        title="Errors found during data parsing"
        message={parseErrorState?.message ?? ''}
        onConfirm={() => parseErrorState?.onConfirm()}
        onCancel={() => setShowParseErrors(false)}
        open={showParseErrors}
        setOpen={setShowParseErrors}
        buttonTitle="Confirm"
      />
    </>
  )
}
