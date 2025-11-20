import {
  Button,
  Center,
  Container,
  Group,
  List,
  rem,
  Space,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { Dropzone } from '@mantine/dropzone'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { Box } from '@mui/material'
import { IconUpload, IconX } from '@tabler/icons-react'
import Papa from 'papaparse'

import { useMessageStore } from '../../../../data/hooks/stores/MessageStore'
import { MessageSeverity } from '../../../../models/MessageModel'
import { BaseMenuProps } from '../../../ToolBar/BaseMenuProps'
import {
  JoinTableToNetworkStep,
  useJoinTableToNetworkStore,
} from '../../store/joinTableToNetworkStore'

export function TableUpload(props: BaseMenuProps) {
  const setFile = useJoinTableToNetworkStore((state) => state.setFile)
  const goToStep = useJoinTableToNetworkStore((state) => state.goToStep)
  const setRawText = useJoinTableToNetworkStore((state) => state.setRawText)
  const options = useJoinTableToNetworkStore((state) => state.options)
  const addMessage = useMessageStore((state) => state.addMessage)

  const onFileError = (files: any) => {
    const supportedExtensions = ['.txt', '.csv', '.tsv']
    addMessage({
      duration: 5000,
      message: `The uploaded file ${files?.[0]?.file?.name ?? ''} is not supported. Supported file types are: ${supportedExtensions.join(', ')}.`,
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
      })

      const onFileValid = () => {
        setFile(file)
        goToStep(JoinTableToNetworkStep.ColumnAppendForm)
        setRawText(text)
      }

      if (result.errors.length > 0) {
        modals.openConfirmModal({
          title: 'Errors found during data parsing',
          children: (
            <>
              <Text>The following errors occured parsing your data:</Text>
              <List>
                {result.errors.map((e, index) => {
                  return (
                    <List.Item
                      key={`${e.code}-${index}`}
                    >{`${e.code}: ${e.message}`}</List.Item>
                  )
                })}
              </List>
              <Text>Do you want to proceed to review your table data?</Text>
            </>
          ),
          labels: { confirm: 'Confirm', cancel: 'Cancel' },
          onCancel: () => {},
          onConfirm: () => onFileValid(),
        })
      } else {
        onFileValid()
      }
    })
    reader.readAsText(file)
  }

  return (
    // <Box sx={{ height: 500 }}>
    <>
      <Dropzone
        data-testid="join-table-upload-dropzone"
        onDrop={(files: any) => {
          onFileDrop(files[0])
        }}
        onReject={(files: any) => {
          onFileError(files)
        }}
        accept={{
          'text/csv': ['.csv'],
          'text/plain': ['.txt'],
          'text/tab-separated-values': ['.tsv'],
        }}
      >
        <Group
          justify="center"
          gap="xl"
          mih={220}
          style={{ pointerEvents: 'none' }}
        >
          <Dropzone.Accept>
            <IconUpload
              style={{
                width: rem(52),
                height: rem(52),
                color: 'var(--mantine-color-blue-6)',
              }}
              stroke={1.5}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX
              style={{
                width: rem(52),
                height: rem(52),
                color: 'var(--mantine-color-red-6)',
              }}
              stroke={1.5}
            />
          </Dropzone.Reject>

          <Stack align="center">
            <Button data-testid="join-table-upload-browse-button">
              Browse
            </Button>
            <Text size="xl" inline>
              Or drag a tabular file here
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              Files under 5mb supported
            </Text>
          </Stack>
        </Group>
      </Dropzone>
    </>

    // </Box>
  )
}
