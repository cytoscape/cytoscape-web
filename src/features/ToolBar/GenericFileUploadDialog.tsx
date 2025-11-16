import {
  Button,
  Group,
  MantineProvider,
  Modal,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { Dropzone, FileWithPath } from '@mantine/dropzone'
import { ModalsProvider } from '@mantine/modals'
import { PrimeReactProvider } from 'primereact/api'

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
  onFileError?: (rejectedFiles: any) => void
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

  const fileValidator = validator || defaultValidator

  const handleFileDrop = async (file: File): Promise<void> => {
    await onFileSelect(file)
  }

  const handleFileError = (rejectedFiles: any): void => {
    if (onFileError) {
      onFileError(rejectedFiles)
    }
  }

  return (
    <PrimeReactProvider>
      <MantineProvider>
        <ModalsProvider>
          <Modal
            data-testid="generic-file-upload-modal"
            onClose={handleClose}
            opened={show}
            zIndex={2000}
            centered
            closeOnClickOutside={true}
            closeOnEscape={true}
            title={
              <Title c="gray" order={4}>
                {title}
              </Title>
            }
          >
            <Dropzone
              data-testid="generic-file-upload-dropzone"
              multiple={false}
              maxFiles={1}
              validator={fileValidator}
              onDrop={(files: FileWithPath[]) => {
                if (files && files.length > 0) {
                  handleFileDrop(files[0])
                }
              }}
              onReject={handleFileError}
            >
              <Group
                justify="center"
                gap="xl"
                mih={220}
                style={{ pointerEvents: 'stroke' }}
              >
                <Stack align="center">
                  <Button data-testid="generic-file-upload-browse-button">
                    Browse
                  </Button>
                  <Text size="xl" inline>
                    {description}
                  </Text>
                  <Text size="sm" inline mt={7}>
                    {supportedFileTypesText}
                  </Text>
                  {maxFileSizeMB && (
                    <Text size="sm" c="dimmed" inline mt={7}>
                      Files under {maxFileSizeMB}MB supported.
                    </Text>
                  )}
                </Stack>
              </Group>
            </Dropzone>
          </Modal>
        </ModalsProvider>
      </MantineProvider>
    </PrimeReactProvider>
  )
}
