import { Typography } from '@mui/material'
import Papa from 'papaparse'
import { useState } from 'react'

import { useMessageStore } from '../../../../data/hooks/stores/MessageStore'
import { MessageSeverity } from '../../../../models/MessageModel'
import { ConfirmationDialog } from '../../../ConfirmationDialog'
import {
  DropzoneHint,
  FileDropzone,
  FileRejection,
} from '../../../FileDropzoneDialog'
import {
  JoinTableToNetworkStep,
  useJoinTableToNetworkStore,
} from '../../store/joinTableToNetworkStore'

const SUPPORTED_EXTENSIONS = ['csv', 'txt', 'tsv']

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
    addMessage({
      duration: 5000,
      message: `The uploaded file ${files?.[0]?.file?.name ?? ''} is not supported. Supported file types are: ${SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(', ')}.`,
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
          message: `The following errors occured parsing your data:\n${errorLines}\nDo you want to proceed to review your table data?`,
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
        validator={(file: File) => {
          if (!file.name) {
            return null
          }
          const extension = file.name.split('.').pop()?.toLowerCase()
          if (!extension || !SUPPORTED_EXTENSIONS.includes(extension)) {
            return {
              code: 'file-invalid-type',
              message: `File ${file.name} is not a supported type.`,
            }
          }
          return null
        }}
        onDrop={onFileDrop}
        onReject={onFileError}
      >
        <Typography variant="h6">Or drag a tabular file here</Typography>
        <DropzoneHint dimmed>Files under 5mb supported</DropzoneHint>
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
