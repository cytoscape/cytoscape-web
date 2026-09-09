import type { Bypasses } from './bypasses.ts'
import type { Mapping, MappableProperty } from './mappings.ts'
export type Row = Record<string, string>
export type Node = Row & { id: string; name: string; x: string; y: string }
export type Edge = Row & { id: string; source: string; target: string }
export type TableKind = 'nodes' | 'edges' | 'network'
export type Column = { key: string; label: string }
export type Style = {
  bypasses?: Bypasses
  mappings?: Partial<Record<MappableProperty, Mapping>>
  labelText?: string
  fill: string
  size: number
  opacity: number
  shape: string
  border: number
  labelSize: number
  labelColor: string
  labelPosition: string
  font: string
  labelAttribute: string
  mapped: boolean
  lineWidth: number
  lineColor: string
  arrows: boolean
  background: string
  overrides: Record<string, number>
}
export type Network = {
  id: string
  name: string
  description: string
  nodes: Node[]
  edges: Edge[]
  properties: Row[]
  style: Style
  columns: Record<TableKind, Column[]>
}
export const defaultStyle: Style = {
  fill: '#737373',
  size: 24,
  opacity: 100,
  shape: 'Ellipse',
  border: 1,
  labelSize: 12,
  labelColor: '',
  labelPosition: 'Below',
  font: 'Inter',
  labelAttribute: 'name',
  mapped: true,
  lineWidth: 1,
  lineColor: '#a3a3a3',
  arrows: false,
  background: '',
  overrides: {},
}
const positions = [
  [130, 210],
  [235, 120],
  [350, 160],
  [445, 90],
  [485, 235],
  [365, 305],
  [245, 325],
  [535, 365],
  [650, 280],
  [735, 170],
  [650, 110],
  [770, 350],
  [145, 365],
  [70, 120],
  [855, 250],
  [865, 110],
  [60, 310],
  [580, 185],
  [340, 55],
  [695, 405],
  [190, 45],
  [430, 410],
  [815, 425],
  [900, 360],
]
const names = [
  'EGFR',
  'GRB2',
  'SOS1',
  'KRAS',
  'RAF1',
  'MAP2K1',
  'MAPK1',
  'PIK3CA',
  'AKT1',
  'MTOR',
  'STAT3',
  'PTEN',
  'SHC1',
  'ERBB2',
  'GAB1',
  'JAK2',
  'SRC',
  'BRAF',
  'HRAS',
  'RPS6KB1',
  'CBL',
  'ELK1',
  'FOS',
  'JUN',
]
const connections = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [0, 7],
  [7, 8],
  [8, 9],
  [0, 10],
  [11, 7],
  [0, 12],
  [13, 0],
  [1, 14],
  [15, 10],
  [16, 0],
  [3, 17],
  [18, 4],
  [9, 19],
  [20, 0],
  [6, 21],
  [21, 22],
  [21, 23],
  [12, 1],
  [14, 7],
  [17, 5],
  [6, 23],
  [19, 22],
  [10, 22],
  [8, 19],
  [16, 12],
]
const proteinTypes: Record<string, string> = {
  EGFR: 'receptor',
  ERBB2: 'receptor',
  GRB2: 'adaptor',
  SHC1: 'adaptor',
  GAB1: 'adaptor',
  SOS1: 'exchange factor',
  KRAS: 'GTPase',
  HRAS: 'GTPase',
  PTEN: 'phosphatase',
  DUSP6: 'phosphatase',
  CBL: 'ubiquitin ligase',
  STAT3: 'transcription factor',
  ELK1: 'transcription factor',
  FOS: 'transcription factor',
  JUN: 'transcription factor',
}

function fixture(
  id: string,
  name: string,
  list: string[],
  links: number[][],
): Network {
  return {
    id,
    name,
    description:
      id === 'hierarchy'
        ? 'Human cell hierarchy'
        : 'Homo sapiens · signaling pathway',
    nodes: list.map((name, i) => ({
      id: `${id}-${i}`,
      name,
      type: id === 'hierarchy' ? 'subsystem' : proteinTypes[name] || 'kinase',
      log2FC: [2.41, 1.23, 0.87, 1.86, -0.42, 1.15, 2.04][i % 7].toFixed(2),
      pValue: [0.001, 0.014, 0.023, 0.003, 0.052][i % 5].toFixed(3),
      x: String(positions[i % positions.length][0]),
      y: String(positions[i % positions.length][1]),
    })),
    edges: links
      .filter(([s, t]) => s < list.length && t < list.length)
      .map(([s, t], i) => ({
        id: `${id}-e${i}`,
        source: `${id}-${s}`,
        target: `${id}-${t}`,
        interaction: i % 4 === 0 ? 'predicted' : 'physical',
        confidence: (0.65 + (i % 7) * 0.05).toFixed(2),
      })),
    properties: [
      { id: 'p1', property: 'name', value: name },
      { id: 'p2', property: 'organism', value: 'Homo sapiens' },
      {
        id: 'p3',
        property: 'description',
        value: 'Illustrative data for interface exploration',
      },
    ],
    style: structuredClone({
      ...defaultStyle,
      size: id === 'hierarchy' ? 56 : defaultStyle.size,
    }),
    columns: {
      nodes: ['name', 'type', 'log2FC', 'pValue'].map((key) => ({
        key,
        label: key,
      })),
      edges: ['source', 'target', 'interaction', 'confidence'].map((key) => ({
        key,
        label: key,
      })),
      network: ['property', 'value'].map((key) => ({ key, label: key })),
    },
  }
}
export function makeFixtures(): Record<string, Network> {
  return {
    egfr: fixture('egfr', 'EGFR signaling', names, connections),
    mapk: fixture(
      'mapk',
      'MAPK cascade',
      [
        'RAF1',
        'MAP2K1',
        'MAP2K2',
        'MAPK1',
        'MAPK3',
        'DUSP6',
        'ELK1',
        'JUN',
        'FOS',
      ],
      [
        [0, 1],
        [0, 2],
        [1, 3],
        [2, 4],
        [3, 5],
        [4, 5],
        [3, 6],
        [4, 6],
        [6, 7],
        [6, 8],
        [7, 8],
        [5, 1],
      ],
    ),
    hierarchy: fixture(
      'hierarchy',
      'Human cell hierarchy',
      [
        'Cellular processes',
        'Signal transduction',
        'MAPK cascade',
        'PI3K–AKT signaling',
        'Cell cycle',
        'DNA repair',
        'Metabolism',
      ],
      [
        [0, 1],
        [1, 2],
        [1, 3],
        [0, 4],
        [0, 5],
        [0, 6],
      ],
    ),
  }
}
function uniqueId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}
export function addNode(network: Network, name: string): Network {
  if (!name.trim()) throw new Error('Enter a node name.')
  return {
    ...network,
    nodes: [
      ...network.nodes,
      {
        id: uniqueId(network.id),
        name: name.trim(),
        type: 'protein',
        log2FC: '0',
        pValue: '1',
        x: String(150 + ((network.nodes.length * 71) % 650)),
        y: String(90 + ((network.nodes.length * 53) % 300)),
      },
    ],
  }
}
export function addEdge(
  network: Network,
  source: string,
  target: string,
): Network {
  if (
    !network.nodes.some((n) => n.id === source) ||
    !network.nodes.some((n) => n.id === target)
  )
    throw new Error('Choose an existing source and target.')
  return {
    ...network,
    edges: [
      ...network.edges,
      {
        id: uniqueId('edge'),
        source,
        target,
        interaction: 'physical',
        confidence: '1.00',
      },
    ],
  }
}
function validName(columns: Column[], label: string, except?: string) {
  if (!label.trim()) throw new Error('Enter a column name.')
  if (
    columns.some(
      (c) =>
        c.key !== except &&
        c.label.toLowerCase() === label.trim().toLowerCase(),
    )
  )
    throw new Error('That column already exists.')
}
export function addColumn(
  network: Network,
  kind: TableKind,
  label: string,
): Network {
  validName(network.columns[kind], label)
  return {
    ...network,
    columns: {
      ...network.columns,
      [kind]: [
        ...network.columns[kind],
        { key: uniqueId('column'), label: label.trim() },
      ],
    },
  }
}
export function renameColumn(
  network: Network,
  kind: TableKind,
  key: string,
  label: string,
): Network {
  validName(network.columns[kind], label, key)
  return {
    ...network,
    columns: {
      ...network.columns,
      [kind]: network.columns[kind].map((c) =>
        c.key === key ? { ...c, label: label.trim() } : c,
      ),
    },
  }
}
export function sortRows<T extends Row>(
  rows: T[],
  key: string,
  direction: 'asc' | 'desc',
): T[] {
  return [...rows].sort(
    (a, b) =>
      String(a[key] ?? '').localeCompare(String(b[key] ?? ''), undefined, {
        numeric: true,
      }) * (direction === 'asc' ? 1 : -1),
  )
}
