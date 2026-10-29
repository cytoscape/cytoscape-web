const AUTH_RETURN_LOCATION_KEY = 'cyweb:keycloak:return-location'
const AUTH_RETURN_LOCATION_MAX_AGE_MS = 5 * 60 * 1000

interface AuthReturnLocation {
  relativeUrl: string
  createdAt: number
}

const getBaseName = (urlBaseName: string): string =>
  urlBaseName.endsWith('/') ? urlBaseName : `${urlBaseName}/`

const isValidReturnLocation = (
  value: unknown,
  urlBaseName: string,
): value is AuthReturnLocation => {
  if (typeof value !== 'object' || value === null) return false

  const record = value as Partial<AuthReturnLocation>

  if (typeof record.relativeUrl !== 'string') return false
  if (typeof record.createdAt !== 'number') return false

  if (!record.relativeUrl.startsWith('/')) return false

  const baseName = getBaseName(urlBaseName)

  if (baseName !== '/' && !record.relativeUrl.startsWith(baseName)) {
    return false
  }

  const age = Date.now() - record.createdAt

  if (age > AUTH_RETURN_LOCATION_MAX_AGE_MS || age < 0) {
    return false
  }

  return true
}

export const saveAuthReturnLocation = (urlBaseName: string): void => {
  const url = new URL(window.location.href)

  // Canonicalize the query string so user-supplied values are safely encoded.
  url.search = url.searchParams.toString()

  const relativeUrl = `${url.pathname}${url.search}`
  const baseName = getBaseName(urlBaseName)

  if (baseName !== '/' && !relativeUrl.startsWith(baseName)) {
    return
  }

  const record: AuthReturnLocation = {
    relativeUrl,
    createdAt: Date.now(),
  }

  window.sessionStorage.setItem(
    AUTH_RETURN_LOCATION_KEY,
    JSON.stringify(record),
  )
}

export const restoreAuthReturnLocation = (urlBaseName: string): void => {
  const stored = window.sessionStorage.getItem(AUTH_RETURN_LOCATION_KEY)

  if (stored === null) return

  window.sessionStorage.removeItem(AUTH_RETURN_LOCATION_KEY)

  try {
    const record: unknown = JSON.parse(stored)

    if (!isValidReturnLocation(record, urlBaseName)) return

    window.history.replaceState(
      window.history.state,
      '',
      record.relativeUrl,
    )
  } catch {
    // Invalid sessionStorage data is ignored.
  }
}

export const clearAuthReturnLocation = (): void => {
  window.sessionStorage.removeItem(AUTH_RETURN_LOCATION_KEY)
}
