import {
  List,
  Stack,
  Center,
  Button,
  Title,
  Group,
  Text,
  rem,
  Space,
  Container,
} from '@mantine/core'
import { Box } from '@mui/material'
import { IconUpload, IconX } from '@tabler/icons-react'
import { Dropzone } from '@mantine/dropzone'
import { notifications } from '@mantine/notifications'
import Papa from 'papaparse'
import { modals } from '@mantine/modals'
import { BaseMenuProps } from '../../../../components/ToolBar/BaseMenuProps'
import {
  useJoinTableToNetworkStore,
  JoinTableToNetworkStep,
} from '../../store/joinTableToNetworkStore'

export function TableUpload(props: BaseMenuProps) {
  const setFile = useJoinTableToNetworkStore((state) => state.setFile)
  const goToStep = useJoinTableToNetworkStore((state) => state.goToStep)
  const setRawText = useJoinTableToNetworkStore((state) => state.setRawText)
  const onFileError = () => {
    notifications.show({
      color: 'red',
      title: 'Error uploading file',
      message: 'The uploaded file is not valid',
      autoClose: 5000,
    })
  }

  const onFileDrop = (file: File) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const text = reader.result as string

      // Parse CSV here using PapaParse
      const result = Papa.parse(text)

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
                {result.errors.map((e) => {
                  return <List.Item>{`${e.code}: ${e.message}`}</List.Item>
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
        onDrop={(files: any) => {
          onFileDrop(files[0])
        }}
        onReject={(files: any) => {
          onFileError()
        }}
        // maxSize={}
        accept={['text/*']}
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
            <Button>Browse</Button>
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
