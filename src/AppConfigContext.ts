import { createContext } from 'react'

export interface KeycloakConfig {
  url: string
  realm: string
  clientId: string
}
export interface AppConfig {
  ndexBaseUrl: string
  options?: {}
  keycloakConfig: KeycloakConfig
  maxNetworkElementsThreshold: number
  maxNetworkFileSize: number
}

export const defaultAppConfig: AppConfig = {
  ndexBaseUrl: 'https://dev.ndexbio.org',
  keycloakConfig: {
    url: 'https://dev.ndexbio.org/auth2',
    realm: 'ndex',
    clientId: 'localtestclient',
  },
  maxNetworkElementsThreshold: 20000, // max number of elements (nodes + edges) that can be rendered with cy.js
  maxNetworkFileSize: 524288000, // 500MB in bytes file size limit in mb that a user can upload
}

export const AppConfigContext = createContext<AppConfig>(defaultAppConfig)
