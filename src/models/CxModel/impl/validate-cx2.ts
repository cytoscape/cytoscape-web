import { CoreAspectTag } from '../Cx2/CoreAspectTag'
import {
  ValidationIssue,
  ValidationOptions,
  ValidationResult,
} from '../Cx2/Validator'
import {
  VisualPropertyName,
  VisualPropertyValueType,
  VisualPropertyValueTypeName,
  NodeShapeType,
  EdgeLineType,
  EdgeArrowShapeType,
  ColorType,
  FontType,
  NodeBorderLineType,
  VisibilityType,
  EdgeFillType,
  CustomGraphicsType,
} from '../../VisualStyleModel'
import { cxVisualPropertyConverter } from '../../VisualStyleModel/impl/cxVisualPropertyConverter'

// Types
type MetaElement = {
  name?: string
  elementCount?: number
}

type CxDataType =
  | 'string'
  | 'integer'
  | 'double'
  | 'boolean'
  | 'long'
  | 'list_of_string'
  | 'list_of_double'
  | 'list_of_integer'
  | 'list_of_boolean'

type AttributeDeclaration = {
  d: CxDataType
  v?: any
}

type AttributeDeclarations = {
  networkAttributes: { [key: string]: AttributeDeclaration }
  nodes: { [key: string]: AttributeDeclaration }
  edges: { [key: string]: AttributeDeclaration }
} & { [key: string]: { [key: string]: AttributeDeclaration } }

type CxAspect = {
  [key: string]: any[] | undefined
  metaData?: MetaElement[]
  status?: Array<{
    success: boolean
    error?: string
  }>
} & { [key: string]: any[] | undefined }

type CxPreamble = {
  CXVersion: string
  hasFragments?: boolean
}

type CxDocument = [CxPreamble, ...Array<CxAspect>]

type NodeObject = {
  id: number
  v?: { [key: string]: any }
  x?: number
  y?: number
  z?: number
}

type EdgeObject = {
  id: number
  s: number
  t: number
  v?: { [key: string]: any }
}

type ValidationContext = {
  cx: CxDocument
  options: ValidationOptions
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  nodeIds?: Set<number>
}

// Constants
const DEFAULT_OPTIONS: ValidationOptions = {
  supportedVersions: ['2.0'],
  strict: false,
}

const RECOGNIZED_PREAMBLE_KEYS = new Set(['CXVersion', 'hasFragments'])

// Visual Property Types
type VpElementType = 'node' | 'edge' | 'network'
type VpDataType = VisualPropertyValueTypeName

type VpMetadata = {
  name: VisualPropertyName
  elements: VpElementType[]
  dataType: VpDataType
  enumValues?: VisualPropertyValueType[]
  format?: string // e.g., 'hex' for colors
  range?: { min: number; max: number }
}

type VpMappingType = 'continuous' | 'discrete' | 'passthrough'

type VpMappingDefinition = {
  type: VpMappingType
  attribute: string
  map?: Array<{
    value: unknown
    vpValue: VisualPropertyValueType
  }>
  minVPValue?: VisualPropertyValueType
  maxVPValue?: VisualPropertyValueType
}

type VpMapping = {
  [vpName in VisualPropertyName]?: VpMappingDefinition
}

type VpDefaults = {
  network?: Partial<Record<VisualPropertyName, VisualPropertyValueType>>
  node?: Partial<Record<VisualPropertyName, VisualPropertyValueType>>
  edge?: Partial<Record<VisualPropertyName, VisualPropertyValueType>>
}

type VisualPropertyAspect = {
  default?: VpDefaults
  nodeMapping?: VpMapping
  edgeMapping?: VpMapping
}

type BypassObject = {
  [key: string]: any // node/edge id
  v: { [vpName: string]: any }
}

// Visual Property Metadata
const VP_METADATA: Partial<Record<VisualPropertyName, VpMetadata>> = {
  nodeShape: {
    name: 'nodeShape',
    elements: ['node'],
    dataType: VisualPropertyValueTypeName.NodeShape,
    enumValues: Object.values(NodeShapeType),
  },
  nodeBorderColor: {
    name: 'nodeBorderColor',
    elements: ['node'],
    dataType: VisualPropertyValueTypeName.Color,
    format: 'hex',
  },
  nodeBorderLineType: {
    name: 'nodeBorderLineType',
    elements: ['node'],
    dataType: VisualPropertyValueTypeName.NodeBorderLine,
    enumValues: Object.values(NodeBorderLineType),
  },
  nodeBorderWidth: {
    name: 'nodeBorderWidth',
    elements: ['node'],
    dataType: VisualPropertyValueTypeName.Number,
    range: { min: 0, max: 100 },
  },
  nodeBorderOpacity: {
    name: 'nodeBorderOpacity',
    elements: ['node'],
    dataType: VisualPropertyValueTypeName.Number,
    range: { min: 0, max: 1 },
  },
  nodeHeight: {
    name: 'nodeHeight',
    elements: ['node'],
    dataType: VisualPropertyValueTypeName.Number,
    range: { min: 0, max: 1000 },
  },
  nodeWidth: {
    name: 'nodeWidth',
    elements: ['node'],
    dataType: VisualPropertyValueTypeName.Number,
    range: { min: 0, max: 1000 },
  },
  nodeBackgroundColor: {
    name: 'nodeBackgroundColor',
    elements: ['node'],
    dataType: VisualPropertyValueTypeName.Color,
    format: 'hex',
  },
  nodeLabel: {
    name: 'nodeLabel',
    elements: ['node'],
    dataType: VisualPropertyValueTypeName.String,
  },
  nodeLabelColor: {
    name: 'nodeLabelColor',
    elements: ['node'],
    dataType: VisualPropertyValueTypeName.Color,
    format: 'hex',
  },
  nodeLabelFontSize: {
    name: 'nodeLabelFontSize',
    elements: ['node'],
    dataType: VisualPropertyValueTypeName.Number,
    range: { min: 0, max: 100 },
  },
  nodeLabelFont: {
    name: 'nodeLabelFont',
    elements: ['node'],
    dataType: VisualPropertyValueTypeName.Font,
    enumValues: Object.values(FontType),
  },
  nodeLabelPosition: {
    name: 'nodeLabelPosition',
    elements: ['node'],
    dataType: VisualPropertyValueTypeName.String,
    enumValues: ['center', 'top', 'bottom', 'left', 'right'],
  },
  nodeLabelRotation: {
    name: 'nodeLabelRotation',
    elements: ['node'],
    dataType: VisualPropertyValueTypeName.Number,
    range: { min: 0, max: 360 },
  },
  nodeLabelOpacity: {
    name: 'nodeLabelOpacity',
    elements: ['node'],
    dataType: VisualPropertyValueTypeName.Number,
    range: { min: 0, max: 1 },
  },
  nodeOpacity: {
    name: 'nodeOpacity',
    elements: ['node'],
    dataType: VisualPropertyValueTypeName.Number,
    range: { min: 0, max: 1 },
  },
  nodeVisibility: {
    name: 'nodeVisibility',
    elements: ['node'],
    dataType: VisualPropertyValueTypeName.Visibility,
    enumValues: Object.values(VisibilityType),
  },
  edgeLineType: {
    name: 'edgeLineType',
    elements: ['edge'],
    dataType: VisualPropertyValueTypeName.EdgeLine,
    enumValues: Object.values(EdgeLineType),
  },
  edgeLineColor: {
    name: 'edgeLineColor',
    elements: ['edge'],
    dataType: VisualPropertyValueTypeName.Color,
    format: 'hex',
  },
  edgeWidth: {
    name: 'edgeWidth',
    elements: ['edge'],
    dataType: VisualPropertyValueTypeName.Number,
    range: { min: 0, max: 100 },
  },
  edgeTargetArrowShape: {
    name: 'edgeTargetArrowShape',
    elements: ['edge'],
    dataType: VisualPropertyValueTypeName.EdgeArrowShape,
    enumValues: Object.values(EdgeArrowShapeType),
  },
  edgeSourceArrowShape: {
    name: 'edgeSourceArrowShape',
    elements: ['edge'],
    dataType: VisualPropertyValueTypeName.EdgeArrowShape,
    enumValues: Object.values(EdgeArrowShapeType),
  },
  edgeTargetArrowColor: {
    name: 'edgeTargetArrowColor',
    elements: ['edge'],
    dataType: VisualPropertyValueTypeName.Color,
    format: 'hex',
  },
  edgeSourceArrowColor: {
    name: 'edgeSourceArrowColor',
    elements: ['edge'],
    dataType: VisualPropertyValueTypeName.Color,
    format: 'hex',
  },
  edgeLabel: {
    name: 'edgeLabel',
    elements: ['edge'],
    dataType: VisualPropertyValueTypeName.String,
  },
  edgeLabelColor: {
    name: 'edgeLabelColor',
    elements: ['edge'],
    dataType: VisualPropertyValueTypeName.Color,
    format: 'hex',
  },
  edgeLabelFontSize: {
    name: 'edgeLabelFontSize',
    elements: ['edge'],
    dataType: VisualPropertyValueTypeName.Number,
    range: { min: 0, max: 100 },
  },
  edgeLabelFont: {
    name: 'edgeLabelFont',
    elements: ['edge'],
    dataType: VisualPropertyValueTypeName.Font,
    enumValues: Object.values(FontType),
  },
  edgeLabelRotation: {
    name: 'edgeLabelRotation',
    elements: ['edge'],
    dataType: VisualPropertyValueTypeName.Number,
    range: { min: 0, max: 360 },
  },
  edgeLabelOpacity: {
    name: 'edgeLabelOpacity',
    elements: ['edge'],
    dataType: VisualPropertyValueTypeName.Number,
    range: { min: 0, max: 1 },
  },
  edgeOpacity: {
    name: 'edgeOpacity',
    elements: ['edge'],
    dataType: VisualPropertyValueTypeName.Number,
    range: { min: 0, max: 1 },
  },
  edgeVisibility: {
    name: 'edgeVisibility',
    elements: ['edge'],
    dataType: VisualPropertyValueTypeName.Visibility,
    enumValues: Object.values(VisibilityType),
  },
  networkBackgroundColor: {
    name: 'networkBackgroundColor',
    elements: ['network'],
    dataType: VisualPropertyValueTypeName.Color,
    format: 'hex',
  },
}

// Validation helpers
const createValidationIssue = (
  code: string,
  message: string,
  severity: 'error' | 'warning',
  path?: string[],
): ValidationIssue => ({
  code,
  message,
  severity,
  path,
})

const validateMetaElement = (
  element: MetaElement,
  index: number,
): ValidationIssue[] => {
  const issues: ValidationIssue[] = []

  if (typeof element !== 'object' || element === null) {
    return [
      createValidationIssue(
        'INVALID_META_ELEMENT',
        'Meta element must be an object',
        'error',
        ['metaData', index.toString()],
      ),
    ]
  }

  if (!('name' in element)) {
    issues.push(
      createValidationIssue(
        'MISSING_META_NAME',
        'Meta element must have a name property',
        'error',
        ['metaData', index.toString()],
      ),
    )
  } else if (typeof element.name !== 'string') {
    issues.push(
      createValidationIssue(
        'INVALID_META_NAME',
        'Meta element name must be a string',
        'error',
        ['metaData', index.toString(), 'name'],
      ),
    )
  }

  if (!('elementCount' in element)) {
    issues.push(
      createValidationIssue(
        'MISSING_ELEMENT_COUNT',
        'Meta element must have an elementCount property',
        'error',
        ['metaData', index.toString()],
      ),
    )
  } else if (
    !Number.isInteger(element.elementCount) ||
    element.elementCount! < 0
  ) {
    issues.push(
      createValidationIssue(
        'INVALID_ELEMENT_COUNT',
        'elementCount must be a non-negative integer',
        'error',
        ['metaData', index.toString(), 'elementCount'],
      ),
    )
  }

  return issues
}

const validateMetaData = (context: ValidationContext): void => {
  const { cx, errors, warnings } = context
  const metaDataAspect = cx.find(
    (aspect): aspect is CxAspect =>
      typeof aspect === 'object' && aspect !== null && 'metaData' in aspect,
  )
  if (!metaDataAspect) return

  const metaData = metaDataAspect.metaData
  if (!Array.isArray(metaData)) {
    errors.push(
      createValidationIssue(
        'INVALID_META_DATA',
        'metaData aspect must be an array',
        'error',
        ['metaData'],
      ),
    )
    return
  }

  const declaredAspects = new Map<string, number>()

  metaData.forEach((element, index) => {
    const elementIssues = validateMetaElement(element, index)
    elementIssues.forEach((issue) => {
      if (issue.severity === 'error') {
        errors.push(issue)
      } else {
        warnings.push(issue)
      }
    })

    if (
      elementIssues.length === 0 &&
      element.name &&
      typeof element.elementCount === 'number'
    ) {
      declaredAspects.set(element.name, element.elementCount)
    }
  })

  cx.forEach((aspect, aspectIndex) => {
    if (!aspect) return

    const aspectName = Object.keys(aspect)[0]
    if (!aspectName) return

    const declaredCount = declaredAspects.get(aspectName)
    if (declaredCount === undefined) {
      warnings.push(
        createValidationIssue(
          'UNDECLARED_ASPECT',
          `Aspect '${aspectName}' exists but is not declared in metaData`,
          'warning',
          [aspectIndex.toString()],
        ),
      )
      return
    }

    if (aspectName === 'metaData') return

    const actualData = (aspect as CxAspect)[aspectName]
    if (!Array.isArray(actualData)) {
      errors.push(
        createValidationIssue(
          'INVALID_ASPECT_DATA',
          `Aspect '${aspectName}' data must be an array`,
          'error',
          [aspectIndex.toString()],
        ),
      )
      return
    }

    const actualCount = actualData.length
    if (declaredCount !== actualCount) {
      const issue = createValidationIssue(
        'COUNT_MISMATCH',
        `Aspect '${aspectName}' has ${actualCount} elements but metaData declares ${declaredCount}`,
        declaredCount === 0 ? 'warning' : 'error',
        [aspectIndex.toString()],
      )
      if (declaredCount === 0) {
        warnings.push(issue)
      } else {
        errors.push(issue)
      }
    }
  })

  declaredAspects.forEach((count, name) => {
    const aspectExists = cx.some((aspect) => aspect && name in aspect)
    if (!aspectExists && count > 0) {
      errors.push(
        createValidationIssue(
          'MISSING_ASPECT',
          `Aspect '${name}' is declared in metaData with count ${count} but does not exist`,
          'error',
          ['metaData'],
        ),
      )
    }
  })
}

const validatePreamble = (context: ValidationContext): void => {
  const { cx, errors, warnings, options } = context
  const preamble = cx[0]

  if (typeof preamble !== 'object' || preamble === null) {
    errors.push(
      createValidationIssue(
        'INVALID_PREAMBLE',
        'First element must be an object (preamble)',
        'error',
      ),
    )
    return
  }

  if (!('CXVersion' in preamble)) {
    errors.push(
      createValidationIssue(
        'MISSING_VERSION',
        'Preamble must contain CXVersion',
        'error',
      ),
    )
    return
  }

  const version = preamble.CXVersion
  if (typeof version !== 'string') {
    errors.push(
      createValidationIssue(
        'INVALID_VERSION_TYPE',
        'CXVersion must be a string',
        'error',
      ),
    )
    return
  }

  if (
    options.supportedVersions &&
    !options.supportedVersions.includes(version)
  ) {
    errors.push(
      createValidationIssue(
        'UNSUPPORTED_VERSION',
        `Unsupported CX version: ${version}. Supported versions: ${options.supportedVersions.join(
          ', ',
        )}`,
        'error',
      ),
    )
  }

  if (
    'hasFragments' in preamble &&
    typeof preamble.hasFragments !== 'boolean'
  ) {
    errors.push(
      createValidationIssue(
        'INVALID_FRAGMENTS_TYPE',
        'hasFragments must be a boolean',
        'error',
      ),
    )
  }

  Object.keys(preamble).forEach((key) => {
    if (!RECOGNIZED_PREAMBLE_KEYS.has(key)) {
      warnings.push(
        createValidationIssue(
          'UNRECOGNIZED_PREAMBLE_KEY',
          `Unrecognized key in preamble: ${key}`,
          'warning',
        ),
      )
    }
  })
}

// Type guards
const isCxAspect = (value: unknown): value is CxAspect => {
  if (typeof value !== 'object' || value === null) return false
  if ('CXVersion' in value) return false
  const keys = Object.keys(value)
  if (keys.length === 0) return false
  const firstKey = keys[0]
  return Array.isArray((value as CxAspect)[firstKey])
}

const validateAspects = (context: ValidationContext): void => {
  const { cx, errors, warnings } = context
  const aspectNames = new Set<string>()

  for (let i = 1; i < cx.length; i++) {
    const element = cx[i]
    if (element === undefined) continue

    if (!isCxAspect(element)) {
      errors.push(
        createValidationIssue(
          'INVALID_ASPECT',
          `Element at index ${i} must be a valid aspect object`,
          'error',
          [i.toString()],
        ),
      )
      continue
    }

    const keys = Object.keys(element)
    if (keys.length !== 1) {
      errors.push(
        createValidationIssue(
          'INVALID_ASPECT',
          `Aspect at index ${i} must have exactly one key`,
          'error',
          [i.toString()],
        ),
      )
      continue
    }

    const aspectName = keys[0]
    const aspectData = element[aspectName]
    if (!Array.isArray(aspectData)) {
      errors.push(
        createValidationIssue(
          'INVALID_ASPECT_DATA',
          `Aspect '${aspectName}' data must be an array`,
          'error',
          [i.toString()],
        ),
      )
      continue
    }

    if (aspectNames.has(aspectName)) {
      warnings.push(
        createValidationIssue(
          'DUPLICATE_ASPECT',
          `Duplicate aspect: ${aspectName}`,
          'warning',
          [i.toString()],
        ),
      )
    }
    aspectNames.add(aspectName)

    if (!Object.values(CoreAspectTag).includes(aspectName as CoreAspectTag)) {
      warnings.push(
        createValidationIssue(
          'UNRECOGNIZED_ASPECT',
          `Unrecognized aspect: ${aspectName}`,
          'warning',
          [i.toString()],
        ),
      )
    }
  }
}

const validateStatus = (context: ValidationContext): void => {
  const { cx, errors } = context
  const lastAspect = cx[cx.length - 1]

  if (lastAspect && 'status' in lastAspect) {
    const status = lastAspect.status
    if (!Array.isArray(status) || status.length !== 1) {
      errors.push(
        createValidationIssue(
          'INVALID_STATUS',
          'Status aspect must be an array with exactly one element',
          'error',
          [(cx.length - 1).toString()],
        ),
      )
      return
    }

    const statusObj = status[0]
    if (typeof statusObj !== 'object' || statusObj === null) {
      errors.push(
        createValidationIssue(
          'INVALID_STATUS',
          'Status element must be an object',
          'error',
          [(cx.length - 1).toString(), '0'],
        ),
      )
      return
    }

    if (!('success' in statusObj) || typeof statusObj.success !== 'boolean') {
      errors.push(
        createValidationIssue(
          'INVALID_STATUS',
          'Status object must have a boolean success property',
          'error',
          [(cx.length - 1).toString(), '0'],
        ),
      )
    }

    if ('error' in statusObj && typeof statusObj.error !== 'string') {
      errors.push(
        createValidationIssue(
          'INVALID_STATUS',
          'Status error must be a string',
          'error',
          [(cx.length - 1).toString(), '0'],
        ),
      )
    }
  }
}

const isValidDataType = (value: any, type: CxDataType): boolean => {
  if (value === null) return true // null is valid for any type if default value exists

  switch (type) {
    case 'string':
      return typeof value === 'string'
    case 'integer':
      return Number.isInteger(value)
    case 'double':
      return typeof value === 'number' && !Number.isNaN(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'long':
      return typeof value === 'number' && Number.isFinite(value)
    case 'list_of_string':
      return (
        Array.isArray(value) &&
        value.every((v) => v === null || typeof v === 'string')
      )
    case 'list_of_double':
      return (
        Array.isArray(value) &&
        value.every(
          (v) => v === null || (typeof v === 'number' && !Number.isNaN(v)),
        )
      )
    case 'list_of_integer':
      return (
        Array.isArray(value) &&
        value.every((v) => v === null || Number.isInteger(v))
      )
    case 'list_of_boolean':
      return (
        Array.isArray(value) &&
        value.every((v) => v === null || typeof v === 'boolean')
      )
    default:
      return false
  }
}

const validateAttributeDeclarations = (context: ValidationContext): void => {
  const { cx, errors, warnings } = context
  const declarationsAspect = cx.find(
    (aspect): aspect is CxAspect =>
      typeof aspect === 'object' &&
      aspect !== null &&
      'attributeDeclarations' in aspect,
  )

  if (!declarationsAspect) {
    errors.push(
      createValidationIssue(
        'MISSING_ATTRIBUTE_DECLARATIONS',
        'attributeDeclarations aspect is required',
        'error',
      ),
    )
    return
  }

  const declarations = declarationsAspect.attributeDeclarations
  if (!Array.isArray(declarations) || declarations.length !== 1) {
    errors.push(
      createValidationIssue(
        'INVALID_ATTRIBUTE_DECLARATIONS',
        'attributeDeclarations must be an array with exactly one element',
        'error',
        ['attributeDeclarations'],
      ),
    )
    return
  }

  const declaration = declarations[0] as AttributeDeclarations
  const requiredScopes = ['networkAttributes', 'nodes', 'edges']

  // Check required scopes exist
  for (const scope of requiredScopes) {
    if (!(scope in declaration)) {
      errors.push(
        createValidationIssue(
          'MISSING_DECLARATION_SCOPE',
          `Missing required scope '${scope}' in attributeDeclarations`,
          'error',
          ['attributeDeclarations', '0'],
        ),
      )
      continue
    }

    const scopeDeclarations = declaration[scope as keyof AttributeDeclarations]
    if (typeof scopeDeclarations !== 'object' || scopeDeclarations === null) {
      errors.push(
        createValidationIssue(
          'INVALID_DECLARATION_SCOPE',
          `Scope '${scope}' must be an object`,
          'error',
          ['attributeDeclarations', '0', scope],
        ),
      )
      continue
    }

    // Validate each attribute declaration
    Object.entries(scopeDeclarations).forEach(([attrName, attrDecl]) => {
      if (typeof attrDecl !== 'object' || attrDecl === null) {
        errors.push(
          createValidationIssue(
            'INVALID_ATTRIBUTE_DECLARATION',
            `Attribute declaration for '${attrName}' must be an object`,
            'error',
            ['attributeDeclarations', '0', scope, attrName],
          ),
        )
        return
      }

      if (!('d' in attrDecl)) {
        errors.push(
          createValidationIssue(
            'MISSING_DATA_TYPE',
            `Attribute '${attrName}' must have a data type (d)`,
            'error',
            ['attributeDeclarations', '0', scope, attrName],
          ),
        )
        return
      }

      if (
        typeof attrDecl.d !== 'string' ||
        !isValidDataType(null, attrDecl.d as CxDataType)
      ) {
        errors.push(
          createValidationIssue(
            'INVALID_DATA_TYPE',
            `Invalid data type '${attrDecl.d}' for attribute '${attrName}'`,
            'error',
            ['attributeDeclarations', '0', scope, attrName, 'd'],
          ),
        )
      }

      if (
        'v' in attrDecl &&
        !isValidDataType(attrDecl.v, attrDecl.d as CxDataType)
      ) {
        errors.push(
          createValidationIssue(
            'INVALID_DEFAULT_VALUE',
            `Default value for attribute '${attrName}' does not match its data type`,
            'error',
            ['attributeDeclarations', '0', scope, attrName, 'v'],
          ),
        )
      }
    })
  }

  // Validate attribute values against declarations
  cx.forEach((aspect, aspectIndex) => {
    if (!aspect || !isCxAspect(aspect)) return

    const aspectName = Object.keys(aspect)[0]
    if (!aspectName) return

    const aspectData = (aspect as CxAspect)[aspectName]
    if (!Array.isArray(aspectData)) return

    // Check network attributes
    if (aspectName === 'networkAttributes') {
      aspectData.forEach((attrs, index) => {
        Object.entries(attrs).forEach(([attrName, value]) => {
          const decl = declaration.networkAttributes[attrName]
          if (!decl) {
            errors.push(
              createValidationIssue(
                'UNDECLARED_ATTRIBUTE',
                `Network attribute '${attrName}' is not declared`,
                'error',
                [aspectIndex.toString(), index.toString(), attrName],
              ),
            )
            return
          }

          if (!isValidDataType(value, decl.d)) {
            errors.push(
              createValidationIssue(
                'TYPE_MISMATCH',
                `Network attribute '${attrName}' value does not match declared type ${decl.d}`,
                'error',
                [aspectIndex.toString(), index.toString(), attrName],
              ),
            )
          }
        })
      })
    }

    // Check node/edge attributes
    if (aspectName === 'nodes' || aspectName === 'edges') {
      const scope =
        aspectName === 'nodes' ? declaration.nodes : declaration.edges
      aspectData.forEach((node, index) => {
        if (!node.v) return
        Object.entries(node.v).forEach(([attrName, value]) => {
          const decl = scope[attrName]
          if (!decl) {
            errors.push(
              createValidationIssue(
                'UNDECLARED_ATTRIBUTE',
                `${aspectName} attribute '${attrName}' is not declared`,
                'error',
                [aspectIndex.toString(), index.toString(), 'v', attrName],
              ),
            )
            return
          }

          if (!isValidDataType(value, decl.d)) {
            errors.push(
              createValidationIssue(
                'TYPE_MISMATCH',
                `${aspectName} attribute '${attrName}' value does not match declared type ${decl.d}`,
                'error',
                [aspectIndex.toString(), index.toString(), 'v', attrName],
              ),
            )
          }
        })
      })
    }
  })
}

const validateMandatoryAttributes = (
  context: ValidationContext,
  aspectName: 'nodes' | 'edges' | 'networkAttributes',
  declarations: AttributeDeclarations,
  objects: any[],
  pathPrefix: string[],
): void => {
  const { errors } = context
  const scope = declarations[aspectName]
  const mandatoryAttrs = Object.entries(scope)
    .filter(([_, decl]) => !('v' in decl))
    .map(([name]) => name)

  objects.forEach((obj, index) => {
    if (!obj.v) {
      // If no attributes object and there are mandatory attributes, that's an error
      if (mandatoryAttrs.length > 0) {
        errors.push(
          createValidationIssue(
            'MISSING_MANDATORY_ATTRIBUTES',
            `Missing mandatory attributes: ${mandatoryAttrs.join(', ')}`,
            'error',
            [...pathPrefix, index.toString()],
          ),
        )
      }
      return
    }

    // Check each mandatory attribute is present
    mandatoryAttrs.forEach((attrName) => {
      if (!(attrName in obj.v)) {
        errors.push(
          createValidationIssue(
            'MISSING_MANDATORY_ATTRIBUTE',
            `Missing mandatory attribute: ${attrName}`,
            'error',
            [...pathPrefix, index.toString(), 'v', attrName],
          ),
        )
      }
    })
  })
}

const validateAttributeTypes = (
  context: ValidationContext,
  aspectName: 'nodes' | 'edges' | 'networkAttributes',
  declarations: AttributeDeclarations,
  objects: any[],
  pathPrefix: string[],
): void => {
  const { errors } = context
  const scope = declarations[aspectName]

  objects.forEach((obj, index) => {
    if (!obj.v) return

    Object.entries(obj.v).forEach(([attrName, value]) => {
      const decl = scope[attrName]
      if (!decl) {
        errors.push(
          createValidationIssue(
            'UNDECLARED_ATTRIBUTE',
            `Attribute '${attrName}' is not declared in ${aspectName}`,
            'error',
            [...pathPrefix, index.toString(), 'v', attrName],
          ),
        )
        return
      }

      if (!isValidDataType(value, decl.d)) {
        errors.push(
          createValidationIssue(
            'TYPE_MISMATCH',
            `Attribute '${attrName}' value does not match declared type ${decl.d}`,
            'error',
            [...pathPrefix, index.toString(), 'v', attrName],
          ),
        )
      }
    })
  })
}

const validateNodes = (context: ValidationContext): void => {
  const { cx, errors, warnings } = context
  const nodesAspect = cx.find(
    (aspect): aspect is CxAspect =>
      typeof aspect === 'object' && aspect !== null && 'nodes' in aspect,
  )

  if (!nodesAspect) {
    errors.push(
      createValidationIssue(
        'MISSING_NODES',
        'nodes aspect is required',
        'error',
      ),
    )
    return
  }

  const nodes = nodesAspect.nodes
  if (!Array.isArray(nodes)) {
    errors.push(
      createValidationIssue(
        'INVALID_NODES',
        'nodes aspect must be an array',
        'error',
        ['nodes'],
      ),
    )
    return
  }

  // Track node IDs for uniqueness and edge validation
  const nodeIds = new Set<number>()
  const nodeIdType = typeof nodes[0]?.id

  nodes.forEach((node, index) => {
    if (typeof node !== 'object' || node === null) {
      errors.push(
        createValidationIssue(
          'INVALID_NODE',
          'Node must be an object',
          'error',
          ['nodes', index.toString()],
        ),
      )
      return
    }

    // Validate id
    if (!('id' in node)) {
      errors.push(
        createValidationIssue(
          'MISSING_NODE_ID',
          'Node must have an id property',
          'error',
          ['nodes', index.toString()],
        ),
      )
      return
    }

    if (typeof node.id !== nodeIdType) {
      errors.push(
        createValidationIssue(
          'INCONSISTENT_NODE_ID_TYPE',
          'Node id must be of consistent type',
          'error',
          ['nodes', index.toString(), 'id'],
        ),
      )
      return
    }

    if (nodeIds.has(node.id)) {
      errors.push(
        createValidationIssue(
          'DUPLICATE_NODE_ID',
          `Duplicate node id: ${node.id}`,
          'error',
          ['nodes', index.toString(), 'id'],
        ),
      )
      return
    }
    nodeIds.add(node.id)

    // Validate coordinates
    if ('x' in node || 'y' in node || 'z' in node) {
      if (!('x' in node) || !('y' in node)) {
        errors.push(
          createValidationIssue(
            'INVALID_COORDINATES',
            'If any coordinate is provided, both x and y must be present',
            'error',
            ['nodes', index.toString()],
          ),
        )
      } else {
        if (typeof node.x !== 'number' || typeof node.y !== 'number') {
          errors.push(
            createValidationIssue(
              'INVALID_COORDINATE_TYPE',
              'Coordinates must be numbers',
              'error',
              ['nodes', index.toString()],
            ),
          )
        }
        if ('z' in node && typeof node.z !== 'number') {
          errors.push(
            createValidationIssue(
              'INVALID_COORDINATE_TYPE',
              'Z coordinate must be a number',
              'error',
              ['nodes', index.toString()],
            ),
          )
        }
      }
    }

    // Validate attributes
    if ('v' in node) {
      if (typeof node.v !== 'object' || node.v === null) {
        errors.push(
          createValidationIssue(
            'INVALID_NODE_ATTRIBUTES',
            'Node attributes must be an object',
            'error',
            ['nodes', index.toString(), 'v'],
          ),
        )
      }
    }
  })

  // Get attribute declarations
  const declarationsAspect = context.cx.find(
    (aspect): aspect is CxAspect =>
      typeof aspect === 'object' &&
      aspect !== null &&
      'attributeDeclarations' in aspect,
  )
  if (!declarationsAspect?.attributeDeclarations?.[0]) {
    errors.push(
      createValidationIssue(
        'MISSING_ATTRIBUTE_DECLARATIONS',
        'attributeDeclarations aspect is required for node validation',
        'error',
      ),
    )
    return
  }

  const declarations = declarationsAspect
    .attributeDeclarations[0] as AttributeDeclarations

  // Validate mandatory attributes and types
  validateMandatoryAttributes(context, 'nodes', declarations, nodes, ['nodes'])
  validateAttributeTypes(context, 'nodes', declarations, nodes, ['nodes'])

  // Store nodeIds in context for edge validation
  context.nodeIds = nodeIds
}

const validateEdges = (context: ValidationContext): void => {
  const { cx, errors, warnings, nodeIds } = context
  if (!nodeIds) {
    errors.push(
      createValidationIssue(
        'MISSING_NODE_IDS',
        'Node validation must be performed before edge validation',
        'error',
      ),
    )
    return
  }

  const edgesAspect = cx.find(
    (aspect): aspect is CxAspect =>
      typeof aspect === 'object' && aspect !== null && 'edges' in aspect,
  )

  if (!edgesAspect) {
    errors.push(
      createValidationIssue(
        'MISSING_EDGES',
        'edges aspect is required',
        'error',
      ),
    )
    return
  }

  const edges = edgesAspect.edges
  if (!Array.isArray(edges)) {
    errors.push(
      createValidationIssue(
        'INVALID_EDGES',
        'edges aspect must be an array',
        'error',
        ['edges'],
      ),
    )
    return
  }

  const edgeIds = new Set<number>()
  const edgeIdType = typeof edges[0]?.id

  edges.forEach((edge, index) => {
    if (typeof edge !== 'object' || edge === null) {
      errors.push(
        createValidationIssue(
          'INVALID_EDGE',
          'Edge must be an object',
          'error',
          ['edges', index.toString()],
        ),
      )
      return
    }

    // Validate id
    if (!('id' in edge)) {
      errors.push(
        createValidationIssue(
          'MISSING_EDGE_ID',
          'Edge must have an id property',
          'error',
          ['edges', index.toString()],
        ),
      )
      return
    }

    if (typeof edge.id !== edgeIdType) {
      errors.push(
        createValidationIssue(
          'INCONSISTENT_EDGE_ID_TYPE',
          'Edge id must be of consistent type',
          'error',
          ['edges', index.toString(), 'id'],
        ),
      )
      return
    }

    if (edgeIds.has(edge.id)) {
      errors.push(
        createValidationIssue(
          'DUPLICATE_EDGE_ID',
          `Duplicate edge id: ${edge.id}`,
          'error',
          ['edges', index.toString(), 'id'],
        ),
      )
      return
    }
    edgeIds.add(edge.id)

    // Validate source and target
    if (!('s' in edge) || !('t' in edge)) {
      errors.push(
        createValidationIssue(
          'MISSING_EDGE_ENDPOINTS',
          'Edge must have both source (s) and target (t) properties',
          'error',
          ['edges', index.toString()],
        ),
      )
      return
    }

    if (typeof edge.s !== typeof edge.t) {
      errors.push(
        createValidationIssue(
          'INCONSISTENT_EDGE_ENDPOINT_TYPES',
          'Source and target must be of the same type',
          'error',
          ['edges', index.toString()],
        ),
      )
      return
    }

    if (!nodeIds.has(edge.s)) {
      errors.push(
        createValidationIssue(
          'INVALID_EDGE_SOURCE',
          `Source node ${edge.s} does not exist`,
          'error',
          ['edges', index.toString(), 's'],
        ),
      )
    }

    if (!nodeIds.has(edge.t)) {
      errors.push(
        createValidationIssue(
          'INVALID_EDGE_TARGET',
          `Target node ${edge.t} does not exist`,
          'error',
          ['edges', index.toString(), 't'],
        ),
      )
    }

    // Validate attributes
    if ('v' in edge) {
      if (typeof edge.v !== 'object' || edge.v === null) {
        errors.push(
          createValidationIssue(
            'INVALID_EDGE_ATTRIBUTES',
            'Edge attributes must be an object',
            'error',
            ['edges', index.toString(), 'v'],
          ),
        )
      }
    }
  })

  // Get attribute declarations
  const declarationsAspect = context.cx.find(
    (aspect): aspect is CxAspect =>
      typeof aspect === 'object' &&
      aspect !== null &&
      'attributeDeclarations' in aspect,
  )
  if (!declarationsAspect?.attributeDeclarations?.[0]) {
    errors.push(
      createValidationIssue(
        'MISSING_ATTRIBUTE_DECLARATIONS',
        'attributeDeclarations aspect is required for edge validation',
        'error',
      ),
    )
    return
  }

  const declarations = declarationsAspect
    .attributeDeclarations[0] as AttributeDeclarations

  // Validate mandatory attributes and types
  validateMandatoryAttributes(context, 'edges', declarations, edges, ['edges'])
  validateAttributeTypes(context, 'edges', declarations, edges, ['edges'])
}

const validateNetworkAttributes = (context: ValidationContext): void => {
  const { cx, errors, warnings } = context
  const networkAttributesAspect = cx.find(
    (aspect): aspect is CxAspect =>
      typeof aspect === 'object' &&
      aspect !== null &&
      'networkAttributes' in aspect,
  )

  if (!networkAttributesAspect) {
    errors.push(
      createValidationIssue(
        'MISSING_NETWORK_ATTRIBUTES',
        'networkAttributes aspect is required',
        'error',
      ),
    )
    return
  }

  const networkAttributes = networkAttributesAspect.networkAttributes
  if (!Array.isArray(networkAttributes)) {
    errors.push(
      createValidationIssue(
        'INVALID_NETWORK_ATTRIBUTES',
        'networkAttributes aspect must be an array',
        'error',
        ['networkAttributes'],
      ),
    )
    return
  }

  networkAttributes.forEach((attrs, index) => {
    if (typeof attrs !== 'object' || attrs === null) {
      errors.push(
        createValidationIssue(
          'INVALID_NETWORK_ATTRIBUTES_OBJECT',
          'Network attributes must be an object',
          'error',
          ['networkAttributes', index.toString()],
        ),
      )
      return
    }
  })

  // Get attribute declarations
  const declarationsAspect = context.cx.find(
    (aspect): aspect is CxAspect =>
      typeof aspect === 'object' &&
      aspect !== null &&
      'attributeDeclarations' in aspect,
  )
  if (!declarationsAspect?.attributeDeclarations?.[0]) {
    errors.push(
      createValidationIssue(
        'MISSING_ATTRIBUTE_DECLARATIONS',
        'attributeDeclarations aspect is required for networkAttributes validation',
        'error',
      ),
    )
    return
  }

  const declarations = declarationsAspect
    .attributeDeclarations[0] as AttributeDeclarations

  // Validate mandatory attributes and types
  validateMandatoryAttributes(
    context,
    'networkAttributes',
    declarations,
    networkAttributes,
    ['networkAttributes'],
  )
  validateAttributeTypes(
    context,
    'networkAttributes',
    declarations,
    networkAttributes,
    ['networkAttributes'],
  )
}

// Validation helpers for visual properties
const isValidVpValue = (
  vpName: VisualPropertyName,
  value: unknown,
): boolean => {
  const metadata = VP_METADATA[vpName]
  if (!metadata) return false

  switch (metadata.dataType) {
    case 'string':
      return typeof value === 'string'
    case 'number':
      if (typeof value !== 'number' || Number.isNaN(value)) return false
      if (metadata.range) {
        return value >= metadata.range.min && value <= metadata.range.max
      }
      return true
    case 'boolean':
      return typeof value === 'boolean'
    case 'color':
      if (typeof value !== 'string') return false
      return /^#[0-9A-Fa-f]{6}$/.test(value)
    case 'enum':
      return (
        metadata.enumValues?.includes(value as VisualPropertyValueType) ?? false
      )
    default:
      return false
  }
}

const validateVpMapping = (
  context: ValidationContext,
  mapping: VpMappingDefinition,
  elementType: 'node' | 'edge',
  declarations: AttributeDeclarations,
  path: string[],
): void => {
  const { errors, warnings } = context
  const scope = declarations[elementType + 's']

  // Check if attribute exists and is declared
  if (!(mapping.attribute in scope)) {
    warnings.push(
      createValidationIssue(
        'UNDECLARED_MAPPING_ATTRIBUTE',
        `Mapping attribute '${mapping.attribute}' is not declared in ${elementType} declarations`,
        'warning',
        [...path, 'attribute'],
      ),
    )
    return
  }

  const attrDecl = scope[mapping.attribute]

  switch (mapping.type) {
    case 'continuous':
      if (!Array.isArray(mapping.map)) {
        errors.push(
          createValidationIssue(
            'INVALID_CONTINUOUS_MAPPING',
            'Continuous mapping must have a map array',
            'error',
            [...path, 'map'],
          ),
        )
        return
      }

      if (
        typeof mapping.minVPValue !== 'number' ||
        typeof mapping.maxVPValue !== 'number'
      ) {
        errors.push(
          createValidationIssue(
            'INVALID_CONTINUOUS_MAPPING',
            'Continuous mapping must have numeric minVPValue and maxVPValue',
            'error',
            [...path],
          ),
        )
        return
      }

      if (
        attrDecl.d !== 'integer' &&
        attrDecl.d !== 'double' &&
        attrDecl.d !== 'long'
      ) {
        errors.push(
          createValidationIssue(
            'INVALID_MAPPING_TYPE',
            `Continuous mapping requires numeric attribute type, got ${attrDecl.d}`,
            'error',
            [...path, 'attribute'],
          ),
        )
      }
      break

    case 'discrete':
      if (!Array.isArray(mapping.map)) {
        errors.push(
          createValidationIssue(
            'INVALID_DISCRETE_MAPPING',
            'Discrete mapping must have a map array',
            'error',
            [...path, 'map'],
          ),
        )
        return
      }

      mapping.map.forEach((segment, index) => {
        if (!('value' in segment) || !('vpValue' in segment)) {
          errors.push(
            createValidationIssue(
              'INVALID_DISCRETE_MAPPING_SEGMENT',
              'Discrete mapping segment must have value and vpValue',
              'error',
              [...path, 'map', index.toString()],
            ),
          )
        }
      })
      break

    case 'passthrough':
      // Passthrough validation is done during value validation
      break
  }
}

const validateVisualProperties = (context: ValidationContext): void => {
  const { cx, errors, warnings } = context
  const vpAspect = cx.find(
    (aspect): aspect is CxAspect =>
      typeof aspect === 'object' &&
      aspect !== null &&
      'visualProperties' in aspect,
  )

  if (!vpAspect) return // visualProperties is optional

  const vp = vpAspect.visualProperties
  if (!Array.isArray(vp) || vp.length === 0) {
    errors.push(
      createValidationIssue(
        'INVALID_VISUAL_PROPERTIES',
        'visualProperties must be a non-empty array',
        'error',
        ['visualProperties'],
      ),
    )
    return
  }

  const vpObj = vp[0] as VisualPropertyAspect

  // Get attribute declarations for mapping validation
  const declarationsAspect = cx.find(
    (aspect): aspect is CxAspect =>
      typeof aspect === 'object' &&
      aspect !== null &&
      'attributeDeclarations' in aspect,
  )
  if (!declarationsAspect?.attributeDeclarations?.[0]) {
    warnings.push(
      createValidationIssue(
        'MISSING_ATTRIBUTE_DECLARATIONS',
        'attributeDeclarations aspect is required for visual property mapping validation',
        'warning',
      ),
    )
    return
  }

  const declarations = declarationsAspect
    .attributeDeclarations[0] as AttributeDeclarations

  // Validate defaults
  if (vpObj.default) {
    Object.entries(vpObj.default).forEach(([elementType, defaults]) => {
      if (typeof defaults !== 'object' || defaults === null) return
      Object.entries(defaults).forEach(([vpName, value]) => {
        const cxVpName =
          cxVisualPropertyConverter[vpName as VisualPropertyName]?.cxVPName
        if (!cxVpName) {
          warnings.push(
            createValidationIssue(
              'UNKNOWN_VP_NAME',
              `Unknown visual property name: ${vpName}`,
              'warning',
              ['visualProperties', '0', 'default', elementType, vpName],
            ),
          )
          return
        }

        const metadata = VP_METADATA[vpName as VisualPropertyName]
        if (!metadata) {
          warnings.push(
            createValidationIssue(
              'MISSING_VP_METADATA',
              `No metadata found for visual property: ${vpName}`,
              'warning',
              ['visualProperties', '0', 'default', elementType, vpName],
            ),
          )
          return
        }

        if (!isValidVpValue(vpName as VisualPropertyName, value)) {
          warnings.push(
            createValidationIssue(
              'INVALID_VP_VALUE',
              `Invalid value for visual property ${vpName}`,
              'warning',
              ['visualProperties', '0', 'default', elementType, vpName],
            ),
          )
        }
      })
    })
  }

  // Validate node mappings
  if (vpObj.nodeMapping) {
    Object.entries(vpObj.nodeMapping).forEach(([vpName, mapping]) => {
      validateVpMapping(
        context,
        mapping as VpMappingDefinition,
        'node',
        declarations,
        ['visualProperties', '0', 'nodeMapping', vpName],
      )
    })
  }

  // Validate edge mappings
  if (vpObj.edgeMapping) {
    Object.entries(vpObj.edgeMapping).forEach(([vpName, mapping]) => {
      validateVpMapping(
        context,
        mapping as VpMappingDefinition,
        'edge',
        declarations,
        ['visualProperties', '0', 'edgeMapping', vpName],
      )
    })
  }
}

const validateBypasses = (context: ValidationContext): void => {
  const { cx, errors, warnings, nodeIds } = context
  if (!nodeIds) return // Skip if node validation hasn't been done

  const validateBypassAspect = (
    aspectName: 'nodeBypasses' | 'edgeBypasses',
    elementIds: Set<number>,
  ): void => {
    const bypassAspect = cx.find(
      (aspect): aspect is CxAspect =>
        typeof aspect === 'object' && aspect !== null && aspectName in aspect,
    )

    if (!bypassAspect) return // bypasses are optional

    const bypasses = bypassAspect[aspectName]
    if (!Array.isArray(bypasses)) {
      errors.push(
        createValidationIssue(
          'INVALID_BYPASSES',
          `${aspectName} must be an array`,
          'error',
          [aspectName],
        ),
      )
      return
    }

    bypasses.forEach((bypass, index) => {
      if (typeof bypass !== 'object' || bypass === null) {
        errors.push(
          createValidationIssue(
            'INVALID_BYPASS',
            'Bypass must be an object',
            'error',
            [aspectName, index.toString()],
          ),
        )
        return
      }

      // Find the element ID
      const elementId = Object.keys(bypass).find((key) => key !== 'v')
      if (!elementId) {
        errors.push(
          createValidationIssue(
            'MISSING_BYPASS_ELEMENT',
            'Bypass must specify an element ID',
            'error',
            [aspectName, index.toString()],
          ),
        )
        return
      }

      const id = Number(elementId)
      if (!elementIds.has(id)) {
        errors.push(
          createValidationIssue(
            'INVALID_BYPASS_ELEMENT',
            `Bypass references non-existent ${aspectName === 'nodeBypasses' ? 'node' : 'edge'} ID: ${id}`,
            'error',
            [aspectName, index.toString(), elementId],
          ),
        )
        return
      }

      if (
        !('v' in bypass) ||
        typeof bypass.v !== 'object' ||
        bypass.v === null
      ) {
        errors.push(
          createValidationIssue(
            'INVALID_BYPASS_VALUES',
            'Bypass must have a valid v object',
            'error',
            [aspectName, index.toString(), 'v'],
          ),
        )
        return
      }

      // Validate VP values
      Object.entries(bypass.v).forEach(([vpName, value]) => {
        if (!isValidVpValue(vpName as VisualPropertyName, value)) {
          warnings.push(
            createValidationIssue(
              'INVALID_BYPASS_VP_VALUE',
              `Invalid value for visual property ${vpName}`,
              'warning',
              [aspectName, index.toString(), 'v', vpName],
            ),
          )
        }
      })
    })
  }

  // Get edge IDs for edge bypass validation
  const edgesAspect = cx.find(
    (aspect): aspect is CxAspect =>
      typeof aspect === 'object' && aspect !== null && 'edges' in aspect,
  )
  const edgeIds = new Set<number>()
  if (edgesAspect?.edges) {
    edgesAspect.edges.forEach((edge: EdgeObject) => {
      edgeIds.add(edge.id)
    })
  }

  validateBypassAspect('nodeBypasses', nodeIds)
  validateBypassAspect('edgeBypasses', edgeIds)
}

export const validateCx = (
  cx: any,
  options: ValidationOptions = {},
): ValidationResult => {
  const context: ValidationContext = {
    cx,
    options: { ...DEFAULT_OPTIONS, ...options },
    errors: [],
    warnings: [],
  }

  if (!Array.isArray(cx)) {
    return {
      isValid: false,
      errors: [
        createValidationIssue(
          'INVALID_STRUCTURE',
          'CX must be an array of aspects',
          'error',
        ),
      ],
      warnings: [],
    }
  }

  if (cx.length === 0) {
    return {
      isValid: false,
      errors: [
        createValidationIssue('EMPTY_CX', 'CX array cannot be empty', 'error'),
      ],
      warnings: [],
    }
  }

  validatePreamble(context)
  validateAspects(context)
  validateStatus(context)
  validateMetaData(context)
  validateAttributeDeclarations(context)
  validateNodes(context)
  validateEdges(context)
  validateNetworkAttributes(context)
  validateVisualProperties(context)
  validateBypasses(context)

  const version = context.cx[0]?.CXVersion

  return {
    isValid: context.errors.length === 0,
    errors: context.errors,
    warnings: context.warnings,
    version,
  }
}
