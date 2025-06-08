import { z } from 'zod'
import { ValueTypeName } from '../../TableModel'

// Schema for CX version enum
export const cxVersionEnum = z.enum(['2.0'], {
  errorMap: (issue, ctx) => {
    if (issue.code === z.ZodIssueCode.invalid_enum_value) {
      return {
        message: `Unsupported CX version. Only version 2.0 is supported.`,
      }
    }
    return { message: ctx.defaultError }
  },
})

// Schema for the CX preamble
export const cxPreambleSchema = z
  .object({
    CXVersion: cxVersionEnum,
    hasFragments: z.boolean().optional(),
  })
  .strict()

// Schema for a single meta element
export const metaElementSchema = z
  .object({
    name: z.string().min(1, 'Meta element must have a non-empty name'),
    elementCount: z
      .number()
      .int()
      .nonnegative('Element count must be a non-negative integer'),
  })
  .strict()

// Schema for the metadata aspect
export const metadataAspectSchema = z
  .object({
    metaData: z
      .array(metaElementSchema)
      .min(1, 'Metadata must contain at least one element'),
  })
  .strict()

// Schema for attribute data types using ValueTypeName
export const cxDataTypeEnum = z.enum([
  ValueTypeName.String,
  ValueTypeName.Integer,
  ValueTypeName.Double,
  ValueTypeName.Boolean,
  ValueTypeName.Long,
  ValueTypeName.ListString,
  ValueTypeName.ListDouble,
  ValueTypeName.ListInteger,
  ValueTypeName.ListBoolean,
])

// Schema for a single attribute declaration
export const attributeDeclarationSchema = z
  .object({
    d: cxDataTypeEnum,
    v: z.any().optional(), // Default value is optional
  })
  .strict()

// Schema for attribute declarations by scope
export const attributeDeclarationsByScopeSchema = z.record(
  attributeDeclarationSchema,
)

// Schema for the attribute declarations aspect
export const attributeDeclarationsSchema = z
  .object({
    attributeDeclarations: z
      .array(
        z
          .object({
            networkAttributes: attributeDeclarationsByScopeSchema,
            nodes: attributeDeclarationsByScopeSchema,
            edges: attributeDeclarationsByScopeSchema,
          })
          .strict(),
      )
      .length(1, 'Attribute declarations must have exactly one element'),
  })
  .strict()

// Schema for a single node
export const nodeSchema = z
  .object({
    id: z.number().int(),
  })
  .passthrough() // This allows additional properties

// Schema for the nodes aspect
export const nodesAspectSchema = z
  .object({
    nodes: z.array(nodeSchema).min(0),
  })
  .strict()

// Schema for a single edge
export const edgeSchema = z
  .object({
    id: z.number().int(),
    s: z.number().int(), // source node id
    t: z.number().int(), // target node id
  })
  .passthrough() // This allows additional properties

// Schema for the edges aspect
export const edgesAspectSchema = z
  .object({
    edges: z.array(edgeSchema).min(0),
  })
  .strict()

// Schema for network attributes
export const networkAttributesAspectSchema = z
  .object({
    networkAttributes: z.record(z.any()),
    // Values will be validated against attribute declarations
  })
  .strict()

// Placeholder for visual properties schema
// This will be implemented in the future
export const visualPropertiesAspectSchema = z
  .object({
    visualProperties: z.any(),
  })
  .strict()

// Schema for a single bypass value
// TODO: Implement this
// export const bypassValueSchema = z.union([
//   z.string(),
//   z.number(),
//   z.boolean(),
//   z.array(z.string()),
//   z.array(z.number()),
//   z.array(z.boolean()),
// ])

// // Schema for a single bypass entry
export const bypassEntrySchema = z
  .object({
    id: z.number().int(),
    v: z.any(),
  })
  .strict()

// Schema for node bypasses aspect
export const nodeBypassesAspectSchema = z
  .object({
    nodeBypasses: z.array(z.record(z.any())).min(0),
  })
  .strict()

// Schema for edge bypasses aspect
export const edgeBypassesAspectSchema = z
  .object({
    edgeBypasses: z.array(z.record(z.any())).min(0),
  })
  .strict()

// Schema for all supported aspects
export const aspectSchemas = {
  nodes: nodesAspectSchema,
  edges: edgesAspectSchema,
  networkAttributes: networkAttributesAspectSchema,
  visualProperties: visualPropertiesAspectSchema,
  nodeBypasses: nodeBypassesAspectSchema,
  edgeBypasses: edgeBypassesAspectSchema,
} as const

// Type for supported aspect names
export type AspectName = keyof typeof aspectSchemas

// Schema for the top-level CX array structure
export const cxDocumentSchema = z
  .array(
    z.union([
      cxPreambleSchema, // First element must be preamble
      z.object({}).passthrough(), // Other elements can be any aspect object
    ]),
  )
  .min(1)
  .refine((arr) => arr.length > 0 && 'CXVersion' in arr[0], {
    message: 'First element must be a valid CX preamble',
    path: [0],
  })
