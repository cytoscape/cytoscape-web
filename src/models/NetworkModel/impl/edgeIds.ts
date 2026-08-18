import { IdType } from '@/models/IdType'

// Edge-id helpers, kept in their own leaf module: networkImpl is built on
// cytoscape.js, and boot-critical code (view-model deserialization) needs
// these one-liners without paying for the whole renderer-backed impl.

// cy.js does not allow nodes and edges to have the same ids
// when converting cx ids to cy ids, we add a prefix to edges
export const translateCXEdgeId = (id: IdType): IdType => `e${id}`

export const isEdgeId = (id: IdType): boolean => id.startsWith('e')

export const translateEdgeIdToCX = (id: IdType): IdType => id.slice(1)
