import { logApi } from '../debug'

export function isValidUrl(input: string): boolean {
  try {
    const url = new URL(input)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export const getDomain = (url: string): string => {
  try {
    const parsedUrl = new URL(url)
    return `${parsedUrl.protocol}//${parsedUrl.host}/`
  } catch (error) {
    logApi.error(`[${getDomain.name}]:[${url}]: Invalid URL: ${error}`)
    return ''
  }
}
