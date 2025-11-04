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
import Papa from 'papaparse'

import {
  getAttributeDeclarations,
  getNetworkAttributes,
  getNodes,
} from '../../models/CxModel/extractor'
import {
  NetworkProperty,
  Visibility,
} from '../../models/NetworkSummaryModel'
import { ValueType, ValueTypeName } from '../../models/TableModel'
import { useNetworkStore } from '../../hooks/stores/NetworkStore'
import { useTableStore } from '../../hooks/stores/TableStore'
import { useViewModelStore } from '../../hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../hooks/stores/WorkspaceStore'
import { putNetworkSummaryToDb } from '../../db'
import {
  useCreateNetworkFromTableStore,
  CreateNetworkFromTableStep,
} from '../TableDataLoader/store/createNetworkFromTableStore'
import { PrimeReactProvider } from 'primereact/api'
import { useNetworkSummaryStore } from '../../hooks/stores/NetworkSummaryStore'
import { generateUniqueName } from '../../utils/generate-unique-name'
import { useUiStateStore } from '../../hooks/stores/UiStateStore'
import { createCyNetworkFromCx2 } from '../../models/CxModel/impl'
import { createDataFromLocalSif } from '../../utils/sif-utils'
import { useOpaqueAspectStore } from '../../hooks/stores/OpaqueAspectStore'
import { useMessageStore } from '../../hooks/stores/MessageStore'
import { MessageSeverity } from '../../models/MessageModel'
import { validateCX2 } from '../../models/CxModel/impl/validator'
import { validateSif } from '../../utils/sif-utils'
import { logUi } from '../../debug'
import { useUrlNavigation } from '../../hooks/navigation/useUrlNavigation'

interface FileUploadProps {
  show: boolean
  handleClose: () => void
}

export function FileUpload(props: FileUploadProps) {
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )
  const { navigateToNetwork } = useUrlNavigation()
  const workspace = useWorkspaceStore((state) => state.workspace)
  const addNewNetwork = useNetworkStore((state) => state.add)

  const setVisualStyle = useVisualStyleStore((state) => state.add)

  const setVisualStyleOptions = useUiStateStore(
    (state) => state.setVisualStyleOptions,
  )

  const addSummary = useNetworkSummaryStore((state) => state.add)

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

        const localProperties: NetworkProperty[] = Object.entries(
          networkAttributes,
        )
          .filter(([key, value]) => {
            // Exclude 'name' and 'description' as they are handled separately as metadata fields
            // TODO this 'handleCX2File' function should be moved to the extractor or a hook
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
        const res = createCyNetworkFromCx2(localUuid, json)
        const {
          network,
          nodeTable,
          edgeTable,
          visualStyle,
          networkViews,
          visualStyleOptions,
          otherAspects,
        } = res

        const nodesAspect = getNodes(json)
        const anyNodeHasPosition = nodesAspect.some(
          (n) => n.x !== undefined && n.y !== undefined,
        )

        const localNodeCount = network.nodes.length
        const localEdgeCount = network.edges.length
        const summary = {
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
        }
        await putNetworkSummaryToDb(summary)
        // TODO the db syncing logic in various stores assumes the updated network is the current network
        // therefore, as a temporary fix, the first operation that should be done is to set the
        // current network to be the new network id
        setVisualStyleOptions(localUuid, visualStyleOptions)
        addNetworkToWorkspace(localUuid)
        addNewNetwork(network)
        setVisualStyle(localUuid, visualStyle)
        setTables(localUuid, nodeTable, edgeTable)
        setViewModel(localUuid, networkViews[0])
        addSummary(localUuid, summary)
        if (otherAspects !== undefined) {
          addAllOpaqueAspects(localUuid, otherAspects)
        }
        setCurrentNetworkId(localUuid)
        navigateToNetwork({
          workspaceId: workspace.id,
          networkId: localUuid,
          searchParams: new URLSearchParams(location.search),
          replace: false,
        })
      }
    } catch (error) {
      logUi.error(
        `[${FileUpload.name}]:[${handleCX2File.name}]: Failed to parse CX2 file ${file.name}`,
        error,
      )
      addMessage({
        duration: 3000,
        message: 'Failed to parse CX2 file',
        severity: MessageSeverity.ERROR,
      })
    } finally {
      props.handleClose()
    }
  }

  const handleSifFile = async (file: File, sifText: string) => {
    try {
      const name = generateUniqueName(
        Object.values(summaries).map((s) => s.name),
        file.name,
      )

      const localUuid = uuidv4()

      const validationResult = validateSif(sifText)

      if (!validationResult.isValid) {
        const errorMessages = validationResult.errors
          .map((err) => err.message)
          .join('\n')
        addMessage({
          duration: 15000,
          message: `Failed to parse sif file:\n${errorMessages}. \n Please see the sif spec for full details https://manual.cytoscape.org/en/stable/Supported_Network_File_Formats.html#sif-format`,
          severity: MessageSeverity.ERROR,
        })
      } else {
        const res = await createDataFromLocalSif(localUuid, sifText)
        const {
          network,
          nodeTable,
          edgeTable,
          visualStyle,
          networkViews,
          visualStyleOptions,
        } = res

        const localNodeCount = network.nodes.length
        const localEdgeCount = network.edges.length

        const summary = {
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
          hasLayout: false, // SIF files don't contain layout information
          hasSample: false,
          cxFileSize: 0,
          cx2FileSize: 0,
          properties: [], // SIF files don't have network properties
          owner: '',
          version: '',
          completed: false,
          visibility: Visibility.LOCAL,
          nodeCount: localNodeCount,
          edgeCount: localEdgeCount,
          description: 'Imported from SIF file',
          creationTime: new Date(Date.now()),
          externalId: localUuid,
          isDeleted: false,
          modificationTime: new Date(Date.now()),
        }
        await putNetworkSummaryToDb(summary)

        setVisualStyleOptions(localUuid, visualStyleOptions)
        addNetworkToWorkspace(localUuid)
        addNewNetwork(network)
        setVisualStyle(localUuid, visualStyle)
        setTables(localUuid, nodeTable, edgeTable)
        setViewModel(localUuid, networkViews[0])
        addSummary(localUuid, summary)
        setCurrentNetworkId(localUuid)
        navigateToNetwork({
          workspaceId: workspace.id,
          networkId: localUuid,
          searchParams: new URLSearchParams(location.search),
          replace: false,
        })
      }
    } catch (error) {
      logUi.error(
        `[${FileUpload.name}]:[${handleSifFile.name}]: Failed to parse SIF file ${file.name} ${sifText}`,
        error,
      )
      addMessage({
        duration: 3000,
        message: 'Failed to parse SIF file',
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
        The supported files are .csv, .txt, .tsv, .cx2, and .sif. 
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
      } else if (fileExtension === 'sif') {
        handleSifFile(file, text)
      } else {
        // Generalized delimiter check for .txt, .csv, and .tsv files
        const trimmedText = text.trim()

        if (trimmedText.length === 0) {
          handleTableFile(file, text)
          return
        }

        const lines = trimmedText
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
        const firstLine = lines[0] || ''

        if (firstLine.length === 0 && trimmedText.length > 0) {
          addMessage({
            duration: 3000,
            message: `File ${file.name} starts with empty lines and might not be a valid table format.`,
            severity: MessageSeverity.ERROR,
          })
          return
        }

        // Acceptable delimiters: comma, semicolon, tab, space
        const possibleDelimiters = [',', ';', '\t', ' ']
        let detectedDelimiter = null
        let columnCount = 1
        for (const delimiter of possibleDelimiters) {
          const count = firstLine.split(delimiter).length
          if (count > 1) {
            detectedDelimiter = delimiter
            columnCount = count
            break
          }
        }

        if (!detectedDelimiter && firstLine.length > 0) {
          addMessage({
            duration: 3000,
            message: `File ${file.name} does not appear to start with a delimited pattern (comma, semicolon, tab, or space). Please check your file format.`,
            severity: MessageSeverity.ERROR,
          })
          return
        }

        // Optionally, check that the next line has the same number of columns
        if (lines.length > 1 && detectedDelimiter) {
          const secondLineCount = lines[1].split(detectedDelimiter).length
          if (secondLineCount !== columnCount) {
            addMessage({
              duration: 3000,
              message: `File ${file.name} header and first data row have different column counts. Please check your file format.`,
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
                    fileExtension !== 'cx2' &&
                    fileExtension !== 'sif'
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
                      Supported file types: .csv, .txt, .tsv, .cx2, .sif.
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
