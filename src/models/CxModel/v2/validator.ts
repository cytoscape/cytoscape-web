import { Cx2 } from '../Cx2'
import { ValidationIssue, ValidationResult } from '../Cx2/Validator'

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

  return validationResult
}
