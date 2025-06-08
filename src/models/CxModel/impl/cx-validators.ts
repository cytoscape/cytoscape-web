import { z } from 'zod'
import {
  ValidationIssue,
  ValidationResult,
  ValidationOptions,
} from '../Cx2/Validator'
import { ValueTypeName } from '../../TableModel'
import {
  cxDocumentSchema,
  cxPreambleSchema,
  metadataAspectSchema,
  attributeDeclarationsSchema,
  cxDataTypeEnum,
  aspectSchemas,
  AspectName,
  nodeSchema,
  edgeSchema,
  bypassEntrySchema,
} from './cx-schemas'

// Helper function to find an aspect by name
export const findAspect = <T = Record<string, unknown>>(
  cx: Array<Record<string, unknown>>,
  aspectName: string,
): { aspect: T; index: number } | undefined => {
  const index = cx.findIndex((aspect) => aspectName in aspect)
  if (index === -1) return undefined

  const aspect = cx[index][aspectName] as T
  return { aspect, index }
}

// Helper function to convert Zod issues to ValidationIssues
export const zodIssuesToValidationIssues = (
  issues: z.ZodIssue[],
  code: string,
): ValidationIssue[] => {
  return issues.map((issue) => ({
    code,
    message: issue.message,
    severity: 'error',
    path: issue.path.map((p) => String(p)),
  }))
}

// Validate the document structure
export const validateDocumentStructure = (cx: unknown): ValidationResult => {
  const documentResult = cxDocumentSchema.safeParse(cx)
  if (!documentResult.success) {
    return {
      isValid: false,
      errors: zodIssuesToValidationIssues(
        documentResult.error.issues,
        'INVALID_STRUCTURE',
      ),
      warnings: [],
    }
  }
  return { isValid: true, errors: [], warnings: [] }
}

// Validate the preamble
export const validatePreamble = (
  cx: Array<Record<string, unknown>>,
): ValidationResult => {
  const preamble = cx[0]
  const preambleResult = cxPreambleSchema.safeParse(preamble)
  if (!preambleResult.success) {
    return {
      isValid: false,
      errors: zodIssuesToValidationIssues(
        preambleResult.error.issues,
        'INVALID_PREAMBLE',
      ),
      warnings: [],
    }
  }
  return {
    isValid: true,
    errors: [],
    warnings: [],
    version: preambleResult.data.CXVersion,
  }
}

// Validate metadata and aspect consistency
export const validateMetadata = (
  cx: Array<Record<string, unknown>>,
  version: string,
): ValidationResult => {
  const metadataResult = findAspect(cx, 'metaData')
  if (!metadataResult) {
    return { isValid: true, errors: [], warnings: [], version }
  }

  const metadataValidation = metadataAspectSchema.safeParse({
    metaData: metadataResult.aspect,
  })
  if (!metadataValidation.success) {
    return {
      isValid: false,
      errors: zodIssuesToValidationIssues(
        metadataValidation.error.issues,
        'INVALID_METADATA',
      ),
      warnings: [],
      version,
    }
  }

  const declaredAspects = new Map(
    metadataValidation.data.metaData.map((meta) => [
      meta.name,
      meta.elementCount,
    ]),
  )

  const warnings: ValidationIssue[] = []
  const errors: ValidationIssue[] = []

  // Check each aspect in the document
  for (let index = 1; index < cx.length; index++) {
    const aspect = cx[index]
    if (!aspect) continue

    const aspectName = Object.keys(aspect)[0]
    if (!aspectName) continue

    // Skip validation for the metadata aspect itself
    if (aspectName === 'metaData') continue

    const declaredCount = declaredAspects.get(aspectName)
    if (declaredCount === undefined) {
      warnings.push({
        code: 'UNDECLARED_ASPECT',
        message: `Aspect '${aspectName}' exists but is not declared in metaData`,
        severity: 'warning',
        path: [index.toString()],
      })
      continue
    }

    // Validate aspect count matches declaration
    const aspectData = aspect[aspectName]
    if (Array.isArray(aspectData) && aspectData.length !== declaredCount) {
      errors.push({
        code: 'COUNT_MISMATCH',
        message: `Aspect '${aspectName}' has ${aspectData.length} elements but metaData declares ${declaredCount}`,
        severity: 'error',
        path: [index.toString()],
      })
    }
  }

  // Check for missing aspects that were declared
  for (const [name, count] of declaredAspects.entries()) {
    const aspectExists = cx.some((aspect) => aspect && name in aspect)
    if (!aspectExists && count > 0) {
      errors.push({
        code: 'MISSING_ASPECT',
        message: `Aspect '${name}' is declared in metaData with count ${count} but does not exist`,
        severity: 'error',
        path: ['metaData'],
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    version,
  }
}

// Validate attribute declarations and their consistency with actual attributes
export const validateAttributeDeclarations = (
  cx: Array<Record<string, unknown>>,
  version: string,
): ValidationResult => {
  const declarationsResult = findAspect(cx, 'attributeDeclarations')
  if (!declarationsResult) {
    return { isValid: true, errors: [], warnings: [], version }
  }

  const declarationsValidation = attributeDeclarationsSchema.safeParse({
    attributeDeclarations: declarationsResult.aspect,
  })
  if (!declarationsValidation.success) {
    return {
      isValid: false,
      errors: zodIssuesToValidationIssues(
        declarationsValidation.error.issues,
        'INVALID_ATTRIBUTE_DECLARATIONS',
      ),
      warnings: [],
      version,
    }
  }

  const declarations = declarationsValidation.data.attributeDeclarations[0]
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  // Helper function to validate attributes against their declarations
  const validateAttributesAgainstDeclarations = (
    aspectName: string,
    aspectIndex: number,
    attributes: Record<string, unknown>,
    declarations: Record<
      string,
      { d: z.infer<typeof cxDataTypeEnum>; v?: unknown }
    >,
  ) => {
    // Check for undeclared attributes
    for (const [attrName, attrValue] of Object.entries(attributes)) {
      const declaration = declarations[attrName]
      if (!declaration) {
        warnings.push({
          code: 'UNDECLARED_ATTRIBUTE',
          message: `Attribute '${attrName}' in ${aspectName} is not declared`,
          severity: 'warning',
          path: [aspectIndex.toString(), aspectName, attrName],
        })
        continue
      }

      // Validate attribute value type
      const expectedType = declaration.d
      let isValid = true

      switch (expectedType) {
        case ValueTypeName.String:
          isValid = typeof attrValue === 'string'
          break
        case ValueTypeName.Integer:
          isValid = Number.isInteger(attrValue as number)
          break
        case ValueTypeName.Double:
          isValid =
            typeof attrValue === 'number' && !Number.isNaN(attrValue as number)
          break
        case ValueTypeName.Boolean:
          isValid = typeof attrValue === 'boolean'
          break
        case ValueTypeName.Long:
          isValid =
            typeof attrValue === 'number' &&
            Number.isInteger(attrValue as number)
          break
        case ValueTypeName.ListString:
          isValid =
            Array.isArray(attrValue) &&
            (attrValue as unknown[]).every((v) => typeof v === 'string')
          break
        case ValueTypeName.ListDouble:
          isValid =
            Array.isArray(attrValue) &&
            (attrValue as unknown[]).every(
              (v) => typeof v === 'number' && !Number.isNaN(v as number),
            )
          break
        case ValueTypeName.ListInteger:
          isValid =
            Array.isArray(attrValue) &&
            (attrValue as unknown[]).every((v) => Number.isInteger(v as number))
          break
        case ValueTypeName.ListBoolean:
          isValid =
            Array.isArray(attrValue) &&
            (attrValue as unknown[]).every((v) => typeof v === 'boolean')
          break
      }

      if (!isValid) {
        errors.push({
          code: 'INVALID_ATTRIBUTE_TYPE',
          message: `Attribute '${attrName}' in ${aspectName} has type '${typeof attrValue}' but was declared as '${expectedType}'`,
          severity: 'error',
          path: [aspectIndex.toString(), aspectName, attrName],
        })
      }
    }
  }

  // Validate network attributes
  const networkResult = findAspect<Record<string, unknown>>(
    cx,
    'networkAttributes',
  )
  if (networkResult) {
    validateAttributesAgainstDeclarations(
      'networkAttributes',
      networkResult.index,
      networkResult.aspect,
      declarations.networkAttributes,
    )
  }

  // Validate node attributes
  const nodesResult = findAspect<Array<Record<string, unknown>>>(cx, 'nodes')
  if (nodesResult) {
    for (const node of nodesResult.aspect) {
      validateAttributesAgainstDeclarations(
        'nodes',
        nodesResult.index,
        node.v as Record<string, unknown>,
        declarations.nodes,
      )
    }
  }

  // Validate edge attributes
  const edgesResult = findAspect<Array<Record<string, unknown>>>(cx, 'edges')
  if (edgesResult) {
    for (const edge of edgesResult.aspect) {
      validateAttributesAgainstDeclarations(
        'edges',
        edgesResult.index,
        edge.v as Record<string, unknown>,
        declarations.edges,
      )
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    version,
  }
}

// Helper function to validate node IDs
const validateNodeIds = (
  nodes: Array<Record<string, unknown>>,
  aspectIndex: number,
): ValidationIssue[] => {
  const errors: ValidationIssue[] = []
  const nodeIds = new Set<number>()

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const id = node.id as number

    if (!Number.isInteger(id)) {
      errors.push({
        code: 'INVALID_NODE_ID',
        message: `Node at index ${i} has invalid ID: ${id}`,
        severity: 'error',
        path: [aspectIndex.toString(), 'nodes', i.toString(), 'id'],
      })
      continue
    }

    if (nodeIds.has(id)) {
      errors.push({
        code: 'DUPLICATE_NODE_ID',
        message: `Node at index ${i} has duplicate ID: ${id}`,
        severity: 'error',
        path: [aspectIndex.toString(), 'nodes', i.toString(), 'id'],
      })
    }
    nodeIds.add(id)
  }

  return errors
}

// Helper function to validate edge references
const validateEdgeReferences = (
  edges: Array<Record<string, unknown>>,
  nodeIds: Set<number>,
  aspectIndex: number,
): ValidationIssue[] => {
  const errors: ValidationIssue[] = []
  const edgeIds = new Set<number>()

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i]
    const id = edge.id as number
    const source = edge.s as number
    const target = edge.t as number

    // Validate edge ID
    if (!Number.isInteger(id)) {
      errors.push({
        code: 'INVALID_EDGE_ID',
        message: `Edge at index ${i} has invalid ID: ${id}`,
        severity: 'error',
        path: [aspectIndex.toString(), 'edges', i.toString(), 'id'],
      })
    } else if (edgeIds.has(id)) {
      errors.push({
        code: 'DUPLICATE_EDGE_ID',
        message: `Edge at index ${i} has duplicate ID: ${id}`,
        severity: 'error',
        path: [aspectIndex.toString(), 'edges', i.toString(), 'id'],
      })
    }
    edgeIds.add(id)

    // Validate source node reference
    if (!Number.isInteger(source) || !nodeIds.has(source)) {
      errors.push({
        code: 'INVALID_EDGE_SOURCE',
        message: `Edge at index ${i} has invalid source node ID: ${source}`,
        severity: 'error',
        path: [aspectIndex.toString(), 'edges', i.toString(), 's'],
      })
    }

    // Validate target node reference
    if (!Number.isInteger(target) || !nodeIds.has(target)) {
      errors.push({
        code: 'INVALID_EDGE_TARGET',
        message: `Edge at index ${i} has invalid target node ID: ${target}`,
        severity: 'error',
        path: [aspectIndex.toString(), 'edges', i.toString(), 't'],
      })
    }
  }

  return errors
}

// Helper function to validate bypass entries
const validateBypassEntries = (
  bypasses: Array<Record<string, unknown>>,
  elementIds: Set<number>,
  aspectName: string,
  aspectIndex: number,
): ValidationIssue[] => {
  const errors: ValidationIssue[] = []
  const bypassIds = new Set<number>()

  for (let i = 0; i < bypasses.length; i++) {
    const bypass = bypasses[i]
    const id = bypass.id as number

    // Validate bypass ID
    if (!Number.isInteger(id)) {
      errors.push({
        code: 'INVALID_BYPASS_ID',
        message: `${aspectName} bypass at index ${i} has invalid ID: ${id}`,
        severity: 'error',
        path: [aspectIndex.toString(), aspectName, i.toString(), 'id'],
      })
      continue
    }

    // Check for duplicate bypass IDs
    if (bypassIds.has(id)) {
      errors.push({
        code: 'DUPLICATE_BYPASS_ID',
        message: `${aspectName} bypass at index ${i} has duplicate ID: ${id}`,
        severity: 'error',
        path: [aspectIndex.toString(), aspectName, i.toString(), 'id'],
      })
    }
    bypassIds.add(id)

    // Validate that the bypass ID references an existing element
    if (!elementIds.has(id)) {
      errors.push({
        code: 'INVALID_BYPASS_REFERENCE',
        message: `${aspectName} bypass at index ${i} references non-existent ${aspectName.slice(0, -8)} ID: ${id}`,
        severity: 'error',
        path: [aspectIndex.toString(), aspectName, i.toString(), 'id'],
      })
    }

    // Validate bypass value
    const bypassValidation = bypassEntrySchema.safeParse(bypass)
    if (!bypassValidation.success) {
      const basePath = [aspectIndex.toString(), aspectName, i.toString()]
      errors.push(
        ...zodIssuesToValidationIssues(
          bypassValidation.error.issues,
          `INVALID_${aspectName.toUpperCase()}_VALUE`,
        ).map((issue) => ({
          ...issue,
          path: [...basePath, ...(issue.path || [])],
        })),
      )
    }
  }

  return errors
}

// Validate core aspects (nodes, edges, network attributes, bypasses)
export const validateCoreAspects = (
  cx: Array<Record<string, unknown>>,
  version: string,
): ValidationResult => {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  // First validate nodes to collect node IDs
  const nodesResult = findAspect<Array<Record<string, unknown>>>(cx, 'nodes')
  if (nodesResult) {
    const nodeValidation = aspectSchemas.nodes.safeParse({
      nodes: nodesResult.aspect,
    })
    if (!nodeValidation.success) {
      errors.push(
        ...zodIssuesToValidationIssues(
          nodeValidation.error.issues,
          'INVALID_NODES_ASPECT',
        ),
      )
    } else {
      // Validate node IDs after schema validation
      errors.push(...validateNodeIds(nodesResult.aspect, nodesResult.index))
    }
  }

  // Then validate edges using the collected node IDs
  const edgesResult = findAspect<Array<Record<string, unknown>>>(cx, 'edges')
  if (edgesResult) {
    const edgeValidation = aspectSchemas.edges.safeParse({
      edges: edgesResult.aspect,
    })
    if (!edgeValidation.success) {
      errors.push(
        ...zodIssuesToValidationIssues(
          edgeValidation.error.issues,
          'INVALID_EDGES_ASPECT',
        ),
      )
    } else if (nodesResult) {
      // Validate edge references only if we have valid nodes
      const nodeIds = new Set(nodesResult.aspect.map((n) => n.id as number))
      errors.push(
        ...validateEdgeReferences(
          edgesResult.aspect,
          nodeIds,
          edgesResult.index,
        ),
      )
    }
  }

  // Validate network attributes
  const networkResult = findAspect<Record<string, unknown>>(
    cx,
    'networkAttributes',
  )
  if (networkResult) {
    const networkValidation = aspectSchemas.networkAttributes.safeParse({
      networkAttributes: networkResult.aspect,
    })
    if (!networkValidation.success) {
      errors.push(
        ...zodIssuesToValidationIssues(
          networkValidation.error.issues,
          'INVALID_NETWORK_ATTRIBUTES_ASPECT',
        ),
      )
    }
  }

  // Validate node bypasses
  const nodeBypassesResult = findAspect<Array<Record<string, unknown>>>(
    cx,
    'nodeBypasses',
  )
  if (nodeBypassesResult) {
    const nodeBypassesValidation = aspectSchemas.nodeBypasses.safeParse({
      nodeBypasses: nodeBypassesResult.aspect,
    })
    if (!nodeBypassesValidation.success) {
      errors.push(
        ...zodIssuesToValidationIssues(
          nodeBypassesValidation.error.issues,
          'INVALID_NODE_BYPASSES_ASPECT',
        ),
      )
    }
  }

  // Validate edge bypasses
  const edgeBypassesResult = findAspect<Array<Record<string, unknown>>>(
    cx,
    'edgeBypasses',
  )
  if (edgeBypassesResult) {
    const edgeBypassesValidation = aspectSchemas.edgeBypasses.safeParse({
      edgeBypasses: edgeBypassesResult.aspect,
    })
    if (!edgeBypassesValidation.success) {
      errors.push(
        ...zodIssuesToValidationIssues(
          edgeBypassesValidation.error.issues,
          'INVALID_EDGE_BYPASSES_ASPECT',
        ),
      )
    }
  }

  // Note: Visual properties validation will be implemented in the future
  // const visualPropertiesResult = findAspect(cx, 'visualProperties')
  // if (visualPropertiesResult) {
  //   // TODO: Implement visual properties validation
  // }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    version,
  }
}

// Main validation function that orchestrates the validation process
export const validateCx2 = (
  cx: unknown,
  options: ValidationOptions = {},
): ValidationResult => {
  const allErrors: ValidationIssue[] = []
  const allWarnings: ValidationIssue[] = []

  // Step 1: Validate document structure
  const structureResult = validateDocumentStructure(cx)
  if (!structureResult.isValid) {
    return structureResult
  }

  // At this point we know cx is a valid array with at least one element
  const cxArray = cx as Array<Record<string, unknown>>

  // Step 2: Validate preamble to get version
  const preambleResult = validatePreamble(cxArray)
  if (!preambleResult.isValid) {
    return preambleResult
  }
  const version = preambleResult.version!

  // Step 3: Validate metadata and aspect consistency
  const metadataResult = validateMetadata(cxArray, version)
  allErrors.push(...metadataResult.errors)
  allWarnings.push(...metadataResult.warnings)

  // Step 4: Validate attribute declarations and their consistency
  const attributeResult = validateAttributeDeclarations(cxArray, version)
  allErrors.push(...attributeResult.errors)
  allWarnings.push(...attributeResult.warnings)

  // Step 5: Validate core aspects (nodes, edges, network attributes, bypasses)
  const coreResult = validateCoreAspects(cxArray, version)
  allErrors.push(...coreResult.errors)
  allWarnings.push(...coreResult.warnings)

  // Return all collected errors and warnings
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    version,
  }
}
