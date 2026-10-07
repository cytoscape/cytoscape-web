import type { IdType } from '../../../models/IdType'

/**
 * NDEx access keys from share links (`?accesskey=`), by network UUID.
 *
 * A share link grants read access to a private network without a login. Boot
 * reads the key from the deep link, but strips every search param before the
 * editor fetches the CX2 (ROUTE phase), so the key is held here until then.
 *
 * Memory only, on purpose: anyone holding the key can read the network, so it
 * never reaches IndexedDB. Once the CX2 is cached, later loads need no key.
 */
const accessKeys = new Map<IdType, string>()

export const rememberNdexAccessKey = (
  networkId: IdType,
  accessKey: string,
): void => {
  accessKeys.set(networkId, accessKey)
}

export const getNdexAccessKey = (networkId: IdType): string | undefined =>
  accessKeys.get(networkId)

export const clearNdexAccessKeysForTesting = (): void => {
  accessKeys.clear()
}
