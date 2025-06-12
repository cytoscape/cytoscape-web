import { Cx2 } from '../Cx2'
import { ValidationIssue, ValidationResult } from '../Cx2/Validator'
import { z } from 'zod'

export const findAspect = (
  cx: unknown[],
  aspectKey: string,
): unknown | undefined => {
  for (let i = 0; i < cx.length; i++) {
    const aspect = cx[i] as Record<string, unknown>
    if (
      typeof aspect === 'object' &&
      aspect !== null &&
      Object.prototype.hasOwnProperty.call(aspect, aspectKey)
    ) {
      return aspect[aspectKey]
    }
  }
  return undefined
}
// A valid cx2 structure should be an array with the first element being an object containing a CXVersion property set to '2.0'.
// Every subsequent element must be an aspect -- a object with one key, and the value of that key is an array

export const validateCx2Structure = (input: unknown): ValidationResult => {
  if (!Array.isArray(input)) {
    return {
      isValid: false,
      errors: [
        {
          message: 'Cx2 must be structured as an array',
          severity: 'error',
          path: [],
        },
      ],
      warnings: [],
    }
  }

  if (input.length === 0) {
    return {
      isValid: false,
      errors: [
        {
          message: 'Cx2 must contain a preamble and status entry',
          severity: 'error',
          path: [],
        },
      ],
      warnings: [],
    }
  }

  if (input[0]?.CXVersion !== '2.0') {
    return {
      isValid: false,
      errors: [
        {
          message: 'Invalid CX version, only version 2.0 is supported',
          severity: 'error',
          path: ['0', 'CXVersion'],
        },
      ],
      warnings: [],
    }
  }

  for (let i = 1; i < input.length; i++) {
    const aspect = input[i]
    const isValidAspect =
      typeof aspect === 'object' &&
      aspect !== null &&
      Object.keys(aspect).length === 1 &&
      Array.isArray(Object.values(aspect)[0])

    if (!isValidAspect) {
      return {
        isValid: false,
        errors: [
          {
            message: `Aspect at index ${i} must be an object with one key, and the value of that key must be an array`,
            severity: 'error',
            path: [i.toString()],
          },
        ],
        warnings: [],
      }
    }
  }

  const statusAspect = findAspect(input, 'status')
  if (statusAspect === undefined) {
    return {
      isValid: false,
      errors: [
        {
          message: 'Status aspect is missing',
          severity: 'error',
        },
      ],
      warnings: [],
    }
  }
  return {
    isValid: true,
    errors: [],
    warnings: [],
  }
}

export const validateCx2Metadata = (input: Cx2): ValidationResult => {
  const metadataAspect = findAspect(input, 'metaData') as unknown
  if (metadataAspect === undefined) {
    return {
      isValid: false,
      errors: [
        {
          message: 'Metadata aspect is missing',
          severity: 'error',
          path: ['metaData'],
        },
      ],
      warnings: [],
    }
  }

  // If metaData is not an array, treat as valid (skip validation)
  if (!Array.isArray(metadataAspect)) {
    return {
      isValid: true,
      errors: [],
      warnings: [],
    }
  }

  for (let i = 0; i < metadataAspect.length; i++) {
    const aspectEntry = metadataAspect[i] as Record<string, unknown>
    const aspectKey = aspectEntry.name as string
    const aspect = findAspect(input, aspectKey)
    if (aspect === undefined) {
      return {
        isValid: false,
        errors: [
          {
            message: `Aspect '${aspectKey}' found in metadata is missing in the CX array`,
            severity: 'error',
            path: ['metaData', aspectKey],
          },
        ],
        warnings: [],
      }
    }
  }
  return {
    isValid: true,
    errors: [],
    warnings: [],
  }
}

export const validateCx2ReferentialIntegrity = (
  input: Cx2,
): ValidationResult => {
  // 1. validate edges and node ids
  // 2. validate node bypasses
  // 3. validate edge bypasses
  const warnings: ValidationIssue[] = []
  const errors: ValidationIssue[] = []
  const nodesAspect = findAspect(input, 'nodes') as unknown[]
  const edgesAspect = findAspect(input, 'edges') as unknown[]
  const nodeBypassesAspect = findAspect(input, 'nodeBypasses') as unknown[]
  const edgeBypassesAspect = findAspect(input, 'edgeBypasses') as unknown[]

  const nodeIds = new Set<number>()
  const edgeIds = new Set<number>()

  if (nodesAspect !== undefined) {
    nodesAspect.forEach((node: Record<string, unknown>, index) => {
      if (node.id !== undefined) {
        if (nodeIds.has(node.id as number)) {
          warnings.push({
            message: 'Duplicate node id found',
            severity: 'warning',
            path: ['nodes', `${node.id}`],
          })
        } else {
          nodeIds.add(node.id as number)
        }
      } else {
        errors.push({
          message: 'Node is missing an id',
          severity: 'error',
          path: ['nodes', `index ${index}`],
        })
      }
    })
  }

  if (edgesAspect !== undefined) {
    edgesAspect.forEach((edge: Record<string, unknown>, index) => {
      const { id, s, t } = edge
      if (id !== undefined) {
        if (edgeIds.has(id as number)) {
          warnings.push({
            message: 'Duplicate edge id found',
            severity: 'warning',
            path: ['edges', `${id}`],
          })
        }
        edgeIds.add(id as number)
      } else {
        errors.push({
          message: 'Edge is missing an id',
          severity: 'error',
          path: ['edges', `index ${index}`],
        })
      }

      if (s === undefined) {
        errors.push({
          message: 'Source id missing for edge',
          severity: 'error',
          path: ['edges', `index ${index}`],
        })
      } else {
        if (!nodeIds.has(s as number)) {
          errors.push({
            message: 'Source id not found in nodes',
            severity: 'error',
            path: ['edges', `index ${index} source ${s}`],
          })
        }
      }

      if (t === undefined) {
        errors.push({
          message: 'Target id missing for edge',
          severity: 'error',
          path: ['edges', `index ${index}`],
        })
      } else {
        if (!nodeIds.has(t as number)) {
          errors.push({
            message: 'Source id not found in nodes',
            severity: 'error',
            path: ['edges', `index ${index} source ${s}`],
          })
        }
      }
    })
  }

  if (nodeBypassesAspect !== undefined) {
    nodeBypassesAspect.forEach((bypass: Record<string, unknown>, index) => {
      const { id } = bypass
      if (id === undefined) {
        errors.push({
          message: 'Node bypass is missing an id',
          severity: 'error',
          path: ['nodeBypasses', `index ${index}`],
        })
      } else if (!nodeIds.has(id as number)) {
        errors.push({
          message: `Node bypass id '${id}' does not exist in nodes`,
          severity: 'error',
          path: ['nodeBypasses', `index ${index}`],
        })
      }
    })
  }

  // Validate edge bypasses
  if (edgeBypassesAspect !== undefined) {
    edgeBypassesAspect.forEach((bypass: Record<string, unknown>, index) => {
      const { id } = bypass
      if (id === undefined) {
        errors.push({
          message: 'Edge bypass is missing an id',
          severity: 'error',
          path: ['edgeBypasses', `index ${index}`],
        })
      } else if (!edgeIds.has(id as number)) {
        errors.push({
          message: `Edge bypass id '${id}' does not exist in edges`,
          severity: 'error',
          path: ['edgeBypasses', `index ${index}`],
        })
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

const cx2TypeToZod = (type: string) => {
  switch (type) {
    case 'string':
      return z.string()
    case 'double':
      return z.number()
    case 'long':
      return z.number()
    case 'integer':
      return z.number().int()
    case 'boolean':
      return z.boolean()
    case 'list_of_string':
      return z.array(z.string())
    case 'list_of_double':
      return z.array(z.number())
    case 'list_of_long':
      return z.array(z.number())
    case 'list_of_integer':
      return z.array(z.number().int())
    case 'list_of_boolean':
      return z.array(z.boolean())
    default:
      throw z.string()
  }
}

const createAttributeSchema = (
  declarations: Record<string, any>,
  isNetworkAttributes: boolean = false,
): { schema: z.ZodObject<any>; errors: ValidationIssue[] } => {
  const schemaShape: Record<string, z.ZodTypeAny> = {}
  const errors: ValidationIssue[] = []

  Object.entries(declarations).forEach(([attrName, attrDecl]) => {
    const { d: type, a, v } = attrDecl

    // For network attributes, check for unsupported 'a' and 'v' fields
    if (isNetworkAttributes) {
      if (a !== undefined) {
        errors.push({
          message: `Network attributes do not support 'a' field. Found in attribute '${attrName}'`,
          severity: 'error',
          path: ['attributeDeclarations', 'network', attrName, 'a'],
        })
      }
      if (v !== undefined) {
        errors.push({
          message: `Network attributes do not support 'v' field. Found in attribute '${attrName}'`,
          severity: 'error',
          path: ['attributeDeclarations', 'network', attrName, 'v'],
        })
      }
      schemaShape[attrName] = cx2TypeToZod(type).optional()
    } else {
      const zodType = cx2TypeToZod(type)
      schemaShape[a ?? attrName] = zodType.optional()
    }
  })

  return {
    schema: z.object(schemaShape),
    errors,
  }
}

export const validateCx2Attributes = (input: Cx2): ValidationResult => {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  const attributeDeclarations = findAspect(
    input,
    'attributeDeclarations',
  ) as unknown[]
  if (attributeDeclarations === undefined) {
    return {
      isValid: true, // attribute declarations are optional
      errors: [],
      warnings: [],
    }
  }

  const nodesAspect = findAspect(input, 'nodes') as unknown[]
  const edgesAspect = findAspect(input, 'edges') as unknown[]
  const networkAttrsAspect = findAspect(input, 'networkAttributes') as unknown[]

  // Get attribute declarations for nodes and edges
  const attrDecls = attributeDeclarations[0] as
    | {
        nodes?: Record<string, any>
        edges?: Record<string, any>
        network?: Record<string, any>
      }
    | undefined
  const nodeAttrDecls = attrDecls?.nodes ?? {}
  const edgeAttrDecls = attrDecls?.edges ?? {}
  const networkAttrDecls = attrDecls?.network ?? {}

  // Create Zod schemas for each aspect
  const nodeSchemaResult = createAttributeSchema(nodeAttrDecls)
  const edgeSchemaResult = createAttributeSchema(edgeAttrDecls)
  const networkSchemaResult = createAttributeSchema(networkAttrDecls, true)

  // Add any schema creation errors
  errors.push(...nodeSchemaResult.errors)
  errors.push(...edgeSchemaResult.errors)
  errors.push(...networkSchemaResult.errors)

  // If there were any schema creation errors, return early
  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      warnings,
    }
  }

  // Validate node attributes
  if (nodesAspect !== undefined) {
    nodesAspect.forEach((node: Record<string, unknown>, nodeIndex) => {
      const nodeAttrs = node.v as Record<string, unknown> | undefined
      if (nodeAttrs === undefined) return

      const result = nodeSchemaResult.schema.safeParse(nodeAttrs)
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          errors.push({
            message: `Node attribute validation error: ${issue.message}`,
            severity: 'error',
            path: [
              'nodes',
              `index ${nodeIndex}`,
              'v',
              ...(issue.path as string[]),
            ],
          })
        })
      }

      // Check for undeclared attributes
      Object.keys(nodeAttrs).forEach((attrName) => {
        if (!(attrName in nodeAttrDecls)) {
          warnings.push({
            message: `Undeclared attribute '${attrName}' found on node`,
            severity: 'warning',
            path: ['nodes', `index ${nodeIndex}`, 'v', attrName],
          })
        }
      })
    })
  }

  // Validate edge attributes
  if (edgesAspect !== undefined) {
    edgesAspect.forEach((edge: Record<string, unknown>, edgeIndex) => {
      const edgeAttrs = edge.v as Record<string, unknown> | undefined
      if (edgeAttrs === undefined) return

      const result = edgeSchemaResult.schema.safeParse(edgeAttrs)
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          errors.push({
            message: `Edge attribute validation error: ${issue.message}`,
            severity: 'error',
            path: [
              'edges',
              `index ${edgeIndex}`,
              'v',
              ...(issue.path as string[]),
            ],
          })
        })
      }

      // Check for undeclared attributes
      Object.keys(edgeAttrs).forEach((attrName) => {
        if (!(attrName in edgeAttrDecls)) {
          warnings.push({
            message: `Undeclared attribute '${attrName}' found on edge`,
            severity: 'warning',
            path: ['edges', `index ${edgeIndex}`, 'v', attrName],
          })
        }
      })
    })
  }

  // Validate network attributes
  if (networkAttrsAspect !== undefined) {
    networkAttrsAspect.forEach((attrs: Record<string, unknown>, index) => {
      const result = networkSchemaResult.schema.safeParse(attrs)
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          errors.push({
            message: `Network attribute validation error: ${issue.message}`,
            severity: 'error',
            path: [
              'networkAttributes',
              `index ${index}`,
              ...(issue.path as string[]),
            ],
          })
        })
      }

      // Check for undeclared attributes
      Object.keys(attrs).forEach((attrName) => {
        if (!(attrName in networkAttrDecls)) {
          warnings.push({
            message: `Undeclared attribute '${attrName}' found in network attributes`,
            severity: 'warning',
            path: ['networkAttributes', `index ${index}`, attrName],
          })
        }
      })
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

export const validateCX2 = (input: unknown): ValidationResult => {
  let validationResult: ValidationResult = {
    isValid: true,
    errors: [] as ValidationIssue[],
    warnings: [] as ValidationIssue[],
  }

  const validateStructure = validateCx2Structure(input as Cx2)
  if (!validateStructure.isValid) {
    return validateStructure
  } else {
    validationResult = {
      ...validationResult,
      isValid: validationResult.isValid && validateStructure.isValid,
      errors: [...validationResult.errors, ...validateStructure.errors],
      warnings: [...validationResult.warnings, ...validateStructure.warnings],
    }
  }
  const validateMetadata = validateCx2Metadata(input as Cx2)
  if (!validateMetadata.isValid) {
    return validateMetadata
  } else {
    validationResult = {
      ...validationResult,
      isValid: validationResult.isValid && validateMetadata.isValid,
      errors: [...validationResult.errors, ...validateMetadata.errors],
      warnings: [...validationResult.warnings, ...validateMetadata.warnings],
    }
  }

  const validateReferentialIntegrity = validateCx2ReferentialIntegrity(
    input as Cx2,
  )
  if (!validateReferentialIntegrity.isValid) {
    return validateReferentialIntegrity
  } else {
    validationResult = {
      ...validationResult,
      isValid: validationResult.isValid && validateReferentialIntegrity.isValid,
      errors: [
        ...validationResult.errors,
        ...validateReferentialIntegrity.errors,
      ],
      warnings: [
        ...validationResult.warnings,
        ...validateReferentialIntegrity.warnings,
      ],
    }
  }

  const validateAttributes = validateCx2Attributes(input as Cx2)
  if (!validateAttributes.isValid) {
    return validateAttributes
  } else {
    validationResult = {
      ...validationResult,
      isValid: validationResult.isValid && validateAttributes.isValid,
      errors: [...validationResult.errors, ...validateAttributes.errors],
      warnings: [...validationResult.warnings, ...validateAttributes.warnings],
    }
  }

  return validationResult
}
