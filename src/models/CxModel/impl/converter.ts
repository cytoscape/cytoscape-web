/**
 * CX2 Format Conversion Utilities
 *
 * Functions for converting CX2 format data to internal application models.
 */
import { CyNetwork } from '../../CyNetworkModel'
import { Network } from '../../NetworkModel'
import { OpaqueAspects } from '../../OpaqueAspectModel'
import { Table } from '../../TableModel'
import { NetworkView } from '../../ViewModel'
import { VisualStyle } from '../../VisualStyleModel'
import { VisualStyleOptions } from '../../VisualStyleModel/VisualStyleOptions'
import { Cx2 } from '../Cx2'
import {
  createFiltersFromCx,
  createNetworkFromCx,
  createOpaqueAspectsFromCx,
  createTablesFromCx,
  createViewModelFromCX,
  createVisualStyleFromCx,
  createVisualStyleOptionsFromCx,
} from './converters'
import { validateCX2 } from './validator'

/**
 * Create network data from CX2 format
 *
 * Converts CX2 format data into a complete CyNetwork object with all components:
 * network topology, tables, visual style, network views, visual style options,
 * optional aspects, and undo/redo stack.
 *
 * Note: Network attributes are converted to NetworkSummary.properties, not stored in CyNetwork
 *
 * **Note:** This function does NOT validate the CX2 data. It assumes the data is already valid.
 * For external/untrusted CX2 data, use `getCyNetworkFromCx2` instead, which validates before conversion.
 *
 * @param networkId - Unique identifier for the network
 * @param cxData - CX2 data object (assumed to be valid)
 * @returns CyNetwork object with all network data
 */
export const createCyNetworkFromCx2 = (
  networkId: string,
  cxData: Cx2,
): CyNetwork => {
  const network: Network = createNetworkFromCx(networkId, cxData)
  const [nodeTable, edgeTable]: [Table, Table] = createTablesFromCx(
    networkId,
    cxData,
  )
  const visualStyle: VisualStyle = createVisualStyleFromCx(cxData)
  const networkView: NetworkView = createViewModelFromCX(networkId, cxData)
  const visualStyleOptions: VisualStyleOptions =
    createVisualStyleOptionsFromCx(cxData)
  const opaqueAspects: OpaqueAspects[] = createOpaqueAspectsFromCx(cxData)
  const filterConfigs = createFiltersFromCx(
    networkId,
    cxData,
    nodeTable,
    edgeTable,
  )

  const undoRedoStack = {
    undoStack: [],
    redoStack: [],
  }

  return {
    network,
    nodeTable,
    edgeTable,
    visualStyle,
    networkViews: [networkView],
    visualStyleOptions,
    opaqueAspects,
    filterConfigs,
    undoRedoStack,
  }
}

/**
 * Get a CyNetwork from CX2 data with validation
 *
 * Validates the CX2 data before converting it to a CyNetwork. This is the recommended
 * function to use when loading CX2 data from external sources (file uploads, NDEx API,
 * URLs, service apps, etc.) to ensure data integrity and application stability.
 *
 * If validation fails, throws an Error with a formatted error message.
 *
 * @param networkId - Unique identifier for the network
 * @param cxData - CX2 data object to validate and convert
 * @returns CyNetwork object with all network data
 * @throws Error if CX2 data validation fails
 *
 * @example
 * ```typescript
 * try {
 *   const network = getCyNetworkFromCx2(networkId, cxData)
 *   // Use network...
 * } catch (error) {
 *   // Handle validation error
 *   console.error('Invalid CX2 network:', error.message)
 * }
 * ```
 */
export const getCyNetworkFromCx2 = (
  networkId: string,
  cxData: Cx2,
): CyNetwork => {
  const validationResult = validateCX2(cxData)
  if (!validationResult.isValid) {
    throw new Error(
      validationResult.errorMessage ??
        'Invalid CX2 network: Unknown validation error',
    )
  }
  return createCyNetworkFromCx2(networkId, cxData)
}
