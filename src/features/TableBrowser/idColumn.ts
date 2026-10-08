export const ID_COLUMN_ID = '__elementId'
export const ID_COLUMN_TITLE = 'ID'

/**
 * The value shown in the read-only ID column of the Table Browser. This is the
 * element's internal id — exactly what the `selectednodes` / `selectededges`
 * URL parameters consume. Edge ids keep their `e` prefix so they round-trip
 * through the parameter unchanged (CW-537).
 */
export const getElementId = (
  dataRow: { id?: unknown } | undefined | null,
): string => (dataRow?.id != null ? String(dataRow.id) : '')
