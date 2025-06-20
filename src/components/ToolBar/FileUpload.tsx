import {
  Stack,
  Button,
  Title,
  Group,
  Text,
  MantineProvider,
  Modal,
} from '@mantine/core'
import { Dropzone, FileWithPath } from '@mantine/dropzone'
import { ModalsProvider } from '@mantine/modals'
import { v4 as uuidv4 } from 'uuid'

import {
  getAttributeDeclarations,
  getNetworkAttributes,
  getNodes,
} from '../../models/CxModel/cx2-util'
import {
  NdexNetworkProperty,
  Visibility,
} from '../../models/NetworkSummaryModel'
import { ValueType, ValueTypeName } from '../../models/TableModel'
import { useNetworkStore } from '../../store/NetworkStore'
import { useTableStore } from '../../store/TableStore'
import { useViewModelStore } from '../../store/ViewModelStore'
import { useVisualStyleStore } from '../../store/VisualStyleStore'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { putNetworkSummaryToDb } from '../../store/persist/db'
import {
  useCreateNetworkFromTableStore,
  CreateNetworkFromTableStep,
} from '../../features/TableDataLoader/store/createNetworkFromTableStore'
import { PrimeReactProvider } from 'primereact/api'
import { useNetworkSummaryStore } from '../../store/NetworkSummaryStore'
import { generateUniqueName } from '../../utils/network-utils'
import { useUiStateStore } from '../../store/UiStateStore'
import { createDataFromLocalCx2 } from '../../utils/cx-utils'
import { useOpaqueAspectStore } from '../../store/OpaqueAspectStore'
import { useMessageStore } from '../../store/MessageStore'
import { MessageSeverity } from '../../models/MessageModel'
import { validateCX2 } from '../../models/CxModel/impl/validator'
interface FileUploadProps {
  show: boolean
  handleClose: () => void
}

export function FileUpload(props: FileUploadProps) {
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  const addNewNetwork = useNetworkStore((state) => state.add)

  const setVisualStyle = useVisualStyleStore((state) => state.add)

  const setVisualStyleOptions = useUiStateStore(
    (state) => state.setVisualStyleOptions,
  )

  const setViewModel = useViewModelStore((state) => state.add)

  const setTables = useTableStore((state) => state.add)

  const addNetworkToWorkspace = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )

  const addAllOpaqueAspects = useOpaqueAspectStore((state) => state.addAll)

  const handleCX2File = async (file: File, jsonStr: string) => {
    try {
      const json = JSON.parse(jsonStr)
      const validationResult = validateCX2(json)

      if (!validationResult.isValid) {
        const errorMessages = validationResult.errors
          .map((err) => err.message)
          .join('\n')
        addMessage({
          duration: 15000,
          message: `Failed to parse CX2 file:\n${errorMessages}. \n Please see the CX2 spec for full details https://cytoscape.org/cx/cx2/specification/cytoscape-exchange-format-specification-(version-2)/ `,
          severity: MessageSeverity.ERROR,
        })
        return
      } else {
        const networkAttributeDeclarations =
          getAttributeDeclarations(json)?.attributeDeclarations?.[0]
            ?.networkAttributes ?? {}
        const networkAttributes = getNetworkAttributes(json)?.[0] ?? {}

        const name =
          networkAttributes.name ??
          generateUniqueName(
            Object.values(summaries).map((s) => s.name),
            file.name,
          )

        const description = networkAttributes.description ?? ''

        const localProperties: NdexNetworkProperty[] = Object.entries(
          networkAttributes,
        )
          .filter(([key, value]) => {
            // Exclude 'name' and 'description' as they are handled separately as metadata fields
            // TODO this 'handleCX2File' function should be moved to the cx2-utils or a hook
            return key !== 'name' && key !== 'description'
          })
          .map(([key, value]) => {
            return {
              predicateString: key,
              value: value as ValueType,
              dataType:
                networkAttributeDeclarations[key]?.d ?? ValueTypeName.String,
              subNetworkId: null,
            }
          })

        const localUuid = uuidv4()
        const res = await createDataFromLocalCx2(localUuid, json)
        const {
          network,
          nodeTable,
          edgeTable,
          visualStyle,
          networkView,
          visualStyleOptions,
          otherAspects,
        } = res

        const nodesAspect = getNodes(json)
        const anyNodeHasPosition = nodesAspect.some(
          (n) => n.x !== undefined && n.y !== undefined,
        )

        const localNodeCount = network.nodes.length
        const localEdgeCount = network.edges.length
        await putNetworkSummaryToDb({
          isNdex: false,
          ownerUUID: localUuid,
          name,
          isReadOnly: false,
          subnetworkIds: [],
          isValid: false,
          warnings: [],
          isShowcase: false,
          isCertified: false,
          indexLevel: '',
          hasLayout: anyNodeHasPosition,
          hasSample: false,
          cxFileSize: 0,
          cx2FileSize: 0,
          properties: localProperties,
          owner: '',
          version: '',
          completed: false,
          visibility: Visibility.LOCAL,
          nodeCount: localNodeCount,
          edgeCount: localEdgeCount,
          description,
          creationTime: new Date(Date.now()),
          externalId: localUuid,
          isDeleted: false,
          modificationTime: new Date(Date.now()),
        })
        // TODO the db syncing logic in various stores assumes the updated network is the current network
        // therefore, as a temporary fix, the first operation that should be done is to set the
        // current network to be the new network id
        setVisualStyleOptions(localUuid, visualStyleOptions)
        addNetworkToWorkspace(localUuid)
        setCurrentNetworkId(localUuid)
        addNewNetwork(network)
        setVisualStyle(localUuid, visualStyle)
        setTables(localUuid, nodeTable, edgeTable)
        setViewModel(localUuid, networkView)
        if (otherAspects !== undefined) {
          addAllOpaqueAspects(localUuid, otherAspects)
        }
      }
    } catch (error) {
      console.error(error)
      addMessage({
        duration: 3000,
        message: 'Failed to parse CX2 file',
        severity: MessageSeverity.ERROR,
      })
    } finally {
      props.handleClose()
    }
  }

  const summaries = useNetworkSummaryStore((state) => state.summaries)
  const addMessage = useMessageStore((state) => state.addMessage)

  const setFile = useCreateNetworkFromTableStore((state) => state.setFile)
  const setShow = useCreateNetworkFromTableStore((state) => state.setShow)
  const goToStep = useCreateNetworkFromTableStore((state) => state.goToStep)
  const setRawText = useCreateNetworkFromTableStore((state) => state.setRawText)
  const setName = useCreateNetworkFromTableStore((state) => state.setName)
  const onFileError = (files: any) => {
    if (files.length > 1) {
      addMessage({
        duration: 3000,
        message: `Only one file can be uploaded at a time.`,
        severity: MessageSeverity.ERROR,
      })
    } else {
      addMessage({
        duration: 3000,
        message: `The uploaded file ${files?.[0]?.file?.name ?? ''} is not supported.
        The supported files are .csv, .txt, .tsv, and .cx2. 
        (Error: ${files?.[0]?.errors?.[0]?.message ?? 'Unknown error'})`,
        severity: MessageSeverity.ERROR,
      })
    }
  }

  const handleTableFile = (file: File, text: string) => {
    // Parse CSV here using PapaParse
    // const result = Papa.parse(text)

    const name = generateUniqueName(
      Object.values(summaries).map((s) => s.name),
      file.name,
    )

    setFile(file)
    goToStep(CreateNetworkFromTableStep.ColumnAssignmentForm)
    setRawText(text)
    setName(name)
    setShow(true)
    props.handleClose()
  }

  const onFileDrop = (file: File) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const text = reader.result as string
      const fileExtension = file.name.split('.').pop()?.toLowerCase()

      // Check RTF format with wrong extension
      if (
        (fileExtension === 'txt' ||
          fileExtension === 'csv' ||
          fileExtension === 'tsv') &&
        text.startsWith('{\\rtf')
      ) {
        addMessage({
          duration: 3000,
          message: `File ${file.name} has a .${fileExtension} 
            extension but appears to be an RTF file, which is 
            not supported for this extension. Please check the file format.`,
          severity: MessageSeverity.ERROR,
        })
        return
      }

      if (fileExtension === 'cx2') {
        handleCX2File(file, text)
      } else {
        // Simple validator for .txt, .csv, and .tsv files

        const trimmedText = text.trim()

        if (trimmedText.length === 0) {
          handleTableFile(file, text)
          return
        }

        const lines = trimmedText.split('\n')
        const firstLine = lines[0].trim()

        if (firstLine.length === 0 && trimmedText.length > 0) {
          addMessage({
            duration: 3000,
            message: `File ${file.name} starts with empty lines and might not be a valid table format.`,
            severity: MessageSeverity.ERROR,
          })
          return
        }

        // Simple test for CSV and TSV
        if (fileExtension === 'csv') {
          if (!firstLine.includes(',') && firstLine.length > 0) {
            addMessage({
              duration: 3000,
              message: `File ${file.name} is a .csv file, 
                but its first line does not contain commas. 
                Please ensure it is a valid CSV.`,
              severity: MessageSeverity.ERROR,
            })
            return
          }
        } else if (fileExtension === 'tsv') {
          if (!firstLine.includes('\t') && firstLine.length > 0) {
            addMessage({
              duration: 3000,
              message: `File ${file.name} is a .tsv file, 
                but its first line does not contain tabs. 
                Please ensure it is a valid TSV.`,
              severity: MessageSeverity.ERROR,
            })
            return
          }
        }
        handleTableFile(file, text)
      }
    })
    reader.readAsText(file)
  }

  return (
    <>
      <PrimeReactProvider>
        <MantineProvider>
          <ModalsProvider>
            <Modal
              onClose={() => props.handleClose()}
              opened={props.show}
              zIndex={2000}
              centered
              title={
                <Title c="gray" order={4}>
                  Upload network file
                </Title>
              }
            >
              <Dropzone
                multiple={false}
                maxFiles={1}
                validator={(file: File) => {
                  // Do not validate if the object is not a file
                  if (!file.name) {
                    return null
                  }

                  const fileExtension = file.name
                    .split('.')
                    .pop()
                    ?.toLowerCase()
                  if (
                    fileExtension !== 'csv' &&
                    fileExtension !== 'txt' &&
                    fileExtension !== 'tsv' &&
                    fileExtension !== 'cx2'
                  ) {
                    return {
                      code: 'file-invalid-type',
                      message: `File ${file.name} is not a supported type.`,
                    }
                  }
                  return null
                }}
                onDrop={(files: FileWithPath[]) => {
                  if (files && files.length > 0) {
                    onFileDrop(files[0])
                  }
                }}
                onReject={(rejectedFiles: any) => {
                  onFileError(rejectedFiles)
                }}
              >
                <Group
                  justify="center"
                  gap="xl"
                  mih={220}
                  style={{ pointerEvents: 'stroke' }}
                >
                  <Stack align="center">
                    <Button>Browse</Button>
                    <Text size="xl" inline>
                      Drag network file here
                    </Text>
                    <Text size="sm" inline mt={7}>
                      Supported file types: .csv, .txt, .tsv, .cx2.
                    </Text>
                    <Text size="sm" c="dimmed" inline>
                      Microsoft Excel files are not supported.
                    </Text>
                    <Text size="sm" c="dimmed" inline mt={7}>
                      Files under 5MB supported.
                    </Text>
                  </Stack>
                </Group>
              </Dropzone>
            </Modal>
          </ModalsProvider>
        </MantineProvider>
      </PrimeReactProvider>
    </>
  )
}
