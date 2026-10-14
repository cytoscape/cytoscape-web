/**
 * Structural encoding of "rich" values (Map/Set/Date) into plain,
 * IndexedDB-safe objects and back.
 *
 * Why: Safari's IndexedDB cannot structured-clone Maps (the reason the
 * table/view serializers in mapSerialization.ts exist), but undo-stack
 * params carry arbitrarily nested Maps (bypass maps, node-position maps,
 * embedded tables). These helpers make such payloads storable everywhere
 * (REVIEW.md R2-10).
 *
 * decodeRichValues also accepts legacy rows that stored raw Map/Set/Date
 * instances (written by structured clone on non-Safari browsers before
 * this encoding existed), so no migration is needed.
 */

const TYPE_TAG = '__cywebType'

export const encodeRichValues = (value: any): any => {
  if (value instanceof Date) {
    return { [TYPE_TAG]: 'Date', iso: value.toISOString() }
  }
  if (value instanceof Map) {
    return {
      [TYPE_TAG]: 'Map',
      entries: Array.from(value.entries(), ([key, entryValue]) => [
        encodeRichValues(key),
        encodeRichValues(entryValue),
      ]),
    }
  }
  if (value instanceof Set) {
    return {
      [TYPE_TAG]: 'Set',
      values: Array.from(value.values(), encodeRichValues),
    }
  }
  if (Array.isArray(value)) {
    return value.map(encodeRichValues)
  }
  if (value !== null && typeof value === 'object') {
    const encoded: Record<string, any> = {}
    for (const [key, propertyValue] of Object.entries(value)) {
      encoded[key] = encodeRichValues(propertyValue)
    }
    return encoded
  }
  return value
}

export const decodeRichValues = (value: any): any => {
  if (value instanceof Date) {
    return value
  }
  // Legacy rows stored by structured clone contain real Maps/Sets
  if (value instanceof Map) {
    return new Map(
      Array.from(value.entries(), ([key, entryValue]) => [
        decodeRichValues(key),
        decodeRichValues(entryValue),
      ]),
    )
  }
  if (value instanceof Set) {
    return new Set(Array.from(value.values(), decodeRichValues))
  }
  if (Array.isArray(value)) {
    return value.map(decodeRichValues)
  }
  if (value !== null && typeof value === 'object') {
    switch (value[TYPE_TAG]) {
      case 'Date':
        return new Date(value.iso)
      case 'Map':
        return new Map(
          (value.entries as any[][]).map(([key, entryValue]) => [
            decodeRichValues(key),
            decodeRichValues(entryValue),
          ]),
        )
      case 'Set':
        return new Set((value.values as any[]).map(decodeRichValues))
    }
    const decoded: Record<string, any> = {}
    for (const [key, propertyValue] of Object.entries(value)) {
      decoded[key] = decodeRichValues(propertyValue)
    }
    return decoded
  }
  return value
}
