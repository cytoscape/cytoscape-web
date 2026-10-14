/**
 * Row shape produced by Papa.parse with headers. Replaces primereact's
 * DataTableValue, which was structurally the same record type.
 */
export type ParsedRow = Record<string, any>
