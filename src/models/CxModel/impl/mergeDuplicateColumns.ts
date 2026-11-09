/**
 * Merge CX2 attribute declarations whose names differ only by case, as
 * Cytoscape Desktop does on import (#951).
 *
 * Desktop's column lookup is case-insensitive, so one column simply receives
 * every spelling's values and every reference keeps working. Web's lookup is
 * exact, so the document itself is rewritten before conversion: one
 * declaration per name, element values under the kept name, and every
 * reference to a merged-away spelling pointing at the kept column.
 *
 * A document with no duplicates is returned as it is.
 */
import { AttributeName } from '../../TableModel'
import {
  assertSameColumnType,
  ColumnMerge,
  DeclaredColumn,
  mergeDeclaredColumns,
} from '../../TableModel/impl/columnNames'
import { ValueTypeName } from '../../TableModel/ValueTypeName'
import { Cx2 } from '../Cx2'

// Not imported from the Hierarchy Viewer feature: models must not depend on
// features
const FILTER_WIDGETS_ASPECT_TAG = 'filterWidgets'

type JsonRecord = Record<string, unknown>

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** How one table's declarations merge */
interface TableMerge {
  readonly merge: ColumnMerge
  /** The kept column of a merged spelling. Undefined for any other name */
  readonly keptFor: (spelling: AttributeName) => DeclaredColumn | undefined
  readonly declaredType: ReadonlyMap<AttributeName, ValueTypeName>
  readonly aliases: ReadonlyMap<string, AttributeName>
  /** Rows with no value under any spelling receive this */
  readonly defaults: ReadonlyMap<AttributeName, DeclaredColumn>
  readonly declarations: JsonRecord
}

const planTableMerge = (declarations: unknown): TableMerge | undefined => {
  if (!isRecord(declarations)) return undefined

  const entries = Object.entries(declarations)
  const declared: DeclaredColumn[] = entries.map(([name, definition]) => ({
    name,
    type: ((isRecord(definition) ? definition.d : undefined) ??
      ValueTypeName.String) as ValueTypeName,
  }))
  const merge = mergeDeclaredColumns(declared)
  if (!merge.hasDuplicates) return undefined

  const declaredType = new Map(declared.map((c) => [c.name, c.type]))
  const aliases = new Map<string, AttributeName>()
  entries.forEach(([name, definition]) => {
    if (isRecord(definition) && typeof definition.a === 'string') {
      aliases.set(definition.a, name)
    }
  })

  // Desktop applies defaults in declaration order, so the last one wins. The
  // spelling is remembered because a default of another type cannot be
  // written to the kept column.
  const defaults = new Map<AttributeName, DeclaredColumn>()
  const defaultValues = new Map<AttributeName, unknown>()
  entries.forEach(([name, definition]) => {
    if (!isRecord(definition) || definition.v == null) return
    const kept = merge.keptColumn(name)
    if (kept === undefined) return
    defaults.set(kept.name, {
      name,
      type: declaredType.get(name) ?? ValueTypeName.String,
    })
    defaultValues.set(kept.name, definition.v)
  })

  const keptEntries = entries
    .filter(([name]) => merge.keptColumn(name)?.name === name)
    .map(([name, definition]) => {
      const mergedDefault = defaultValues.get(name)
      if (!merge.isMerged(name) || mergedDefault === undefined) {
        return [name, definition] as const
      }
      return [
        name,
        { ...(definition as JsonRecord), v: mergedDefault },
      ] as const
    })

  return {
    merge,
    keptFor: (spelling) =>
      declaredType.has(spelling) && merge.isMerged(spelling)
        ? merge.keptColumn(spelling)
        : undefined,
    declaredType,
    aliases,
    defaults,
    // fromEntries defines own keys, so `__proto__` is a key like any other
    declarations: Object.fromEntries(keptEntries),
  }
}

/**
 * Move an element's values to the kept columns. Each value overwrites the
 * previous one in the order of the `v` object, so the last one wins.
 *
 * @throws ColumnTypeConflictError when a value would be written to a column
 *   of another declared type
 */
const mergeElementValues = (element: unknown, table: TableMerge): unknown => {
  if (!isRecord(element)) return element

  const values = new Map<string, unknown>()
  let changed = false
  if (isRecord(element.v)) {
    Object.entries(element.v).forEach(([key, value]) => {
      const spelling = table.aliases.get(key) ?? key
      const kept = table.keptFor(spelling)
      if (kept === undefined) {
        values.set(key, value)
        return
      }
      // Desktop clears the cell for a null, without checking its type
      if (value !== null) {
        assertSameColumnType(kept, {
          name: spelling,
          type: table.declaredType.get(spelling) ?? ValueTypeName.String,
        })
      }
      changed = changed || key !== kept.name
      values.set(kept.name, value)
    })
  }

  table.defaults.forEach((spelling, keptName) => {
    if (values.has(keptName)) return
    const kept = table.merge.keptColumn(keptName)
    if (kept !== undefined) assertSameColumnType(kept, spelling)
  })

  return changed ? { ...element, v: Object.fromEntries(values) } : element
}

const mergeElements = (
  elements: unknown,
  table: TableMerge | undefined,
): unknown =>
  table !== undefined && Array.isArray(elements)
    ? elements.map((element) => mergeElementValues(element, table))
    : elements

const mergeMappings = (
  mappings: unknown,
  table: TableMerge | undefined,
): unknown => {
  if (table === undefined || !isRecord(mappings)) return mappings
  return Object.fromEntries(
    Object.entries(mappings).map(([visualProperty, mapping]) => {
      if (!isRecord(mapping) || !isRecord(mapping.definition)) {
        return [visualProperty, mapping]
      }
      const { definition } = mapping
      const attribute = definition.attribute
      const kept =
        typeof attribute === 'string' ? table.keptFor(attribute) : undefined
      if (kept === undefined || kept.name === attribute) {
        return [visualProperty, mapping]
      }
      return [
        visualProperty,
        {
          ...mapping,
          definition: {
            ...definition,
            attribute: kept.name,
            ...(definition.type === undefined ? {} : { type: kept.type }),
          },
        },
      ]
    }),
  )
}

const mergeVisualProperties = (
  visualProperties: unknown,
  nodes: TableMerge | undefined,
  edges: TableMerge | undefined,
): unknown =>
  isRecord(visualProperties)
    ? {
        ...visualProperties,
        nodeMapping: mergeMappings(visualProperties.nodeMapping, nodes),
        edgeMapping: mergeMappings(visualProperties.edgeMapping, edges),
      }
    : visualProperties

const mergeStyleSet = (
  aspect: unknown,
  nodes: TableMerge | undefined,
  edges: TableMerge | undefined,
): unknown => {
  if (!isRecord(aspect) || !Array.isArray(aspect.styles)) return aspect
  return {
    ...aspect,
    styles: aspect.styles.map((style: unknown) =>
      isRecord(style)
        ? {
            ...style,
            visualProperties: mergeVisualProperties(
              style.visualProperties,
              nodes,
              edges,
            ),
          }
        : style,
    ),
  }
}

const mergeTableConfig = (
  config: unknown,
  table: TableMerge | undefined,
): unknown => {
  if (table === undefined || !isRecord(config)) return config

  const seen = new Set<string>()
  const columnConfiguration = Array.isArray(config.columnConfiguration)
    ? config.columnConfiguration.flatMap((entry: unknown) => {
        if (!isRecord(entry) || typeof entry.attributeName !== 'string') {
          return [entry]
        }
        const kept = table.keptFor(entry.attributeName)
        if (kept === undefined) return [entry]
        if (seen.has(kept.name)) return []
        seen.add(kept.name)
        return [{ ...entry, attributeName: kept.name }]
      })
    : config.columnConfiguration

  const sortKept =
    typeof config.sortColumn === 'string'
      ? table.keptFor(config.sortColumn)
      : undefined

  return {
    ...config,
    columnConfiguration,
    ...(sortKept === undefined ? {} : { sortColumn: sortKept.name }),
  }
}

const mergeEditorProperties = (
  entry: unknown,
  nodes: TableMerge | undefined,
  edges: TableMerge | undefined,
): unknown => {
  if (!isRecord(entry) || !isRecord(entry.properties)) return entry
  const configuration = entry.properties.tableDisplayConfiguration
  if (!isRecord(configuration)) return entry
  return {
    ...entry,
    properties: {
      ...entry.properties,
      tableDisplayConfiguration: {
        ...configuration,
        nodeTable: mergeTableConfig(configuration.nodeTable, nodes),
        edgeTable: mergeTableConfig(configuration.edgeTable, edges),
      },
    },
  }
}

const mergeFilterWidget = (
  widget: unknown,
  nodes: TableMerge | undefined,
  edges: TableMerge | undefined,
): unknown => {
  if (!isRecord(widget) || typeof widget.attributeName !== 'string') {
    return widget
  }
  // The widget schema trims and lower-cases this field too
  const appliesTo =
    typeof widget.appliesTo === 'string'
      ? widget.appliesTo.trim().toLowerCase()
      : ''
  const table =
    appliesTo === 'node' || appliesTo === 'nodes'
      ? nodes
      : appliesTo === 'edge' || appliesTo === 'edges'
        ? edges
        : undefined
  const kept = table?.keptFor(widget.attributeName)
  return kept === undefined ? widget : { ...widget, attributeName: kept.name }
}

const mapAspect = (
  entry: JsonRecord,
  tag: string,
  update: (value: unknown) => unknown,
): JsonRecord =>
  Array.isArray(entry[tag])
    ? { ...entry, [tag]: (entry[tag] as unknown[]).map(update) }
    : entry

/**
 * @param cx A CX2 document. It is not modified.
 * @returns The document with one declaration per name. The same document
 *   when it declares no duplicates.
 * @throws ColumnTypeConflictError when a value would be written to a merged
 *   column of another declared type
 */
export const mergeDuplicateColumns = (cx: Cx2): Cx2 => {
  const document = cx as unknown as unknown[]
  const declarationsEntry = document.find(
    (entry): entry is JsonRecord =>
      isRecord(entry) && Array.isArray(entry.attributeDeclarations),
  )
  const declarations = (
    declarationsEntry?.attributeDeclarations as unknown[]
  )?.[0]
  if (!isRecord(declarations)) return cx

  const nodes = planTableMerge(declarations.nodes)
  const edges = planTableMerge(declarations.edges)
  if (nodes === undefined && edges === undefined) return cx

  return document.map((entry) => {
    if (!isRecord(entry)) return entry
    if (entry === declarationsEntry) {
      const [first, ...rest] = entry.attributeDeclarations as unknown[]
      return {
        ...entry,
        attributeDeclarations: [
          {
            ...(first as JsonRecord),
            ...(nodes === undefined ? {} : { nodes: nodes.declarations }),
            ...(edges === undefined ? {} : { edges: edges.declarations }),
          },
          ...rest,
        ],
      }
    }
    if ('nodes' in entry) {
      return { ...entry, nodes: mergeElements(entry.nodes, nodes) }
    }
    if ('edges' in entry) {
      return { ...entry, edges: mergeElements(entry.edges, edges) }
    }
    if ('visualProperties' in entry) {
      return mapAspect(entry, 'visualProperties', (value) =>
        mergeVisualProperties(value, nodes, edges),
      )
    }
    if ('cyWebVisualStyles' in entry) {
      return mapAspect(entry, 'cyWebVisualStyles', (value) =>
        mergeStyleSet(value, nodes, edges),
      )
    }
    if ('visualEditorProperties' in entry) {
      return mapAspect(entry, 'visualEditorProperties', (value) =>
        mergeEditorProperties(value, nodes, edges),
      )
    }
    if (FILTER_WIDGETS_ASPECT_TAG in entry) {
      return mapAspect(entry, FILTER_WIDGETS_ASPECT_TAG, (value) =>
        mergeFilterWidget(value, nodes, edges),
      )
    }
    return entry
  }) as unknown as Cx2
}
