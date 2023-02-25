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
}

export const defaultAppConfig: AppConfig = {
  ndexBaseUrl: 'https://dev.ndexbio.org',
  keycloakConfig: {
    url: 'https://dev.ndexbio.org/auth2',
    realm: 'ndex',
    clientId: 'localtestclient',
  },
}

export const AppConfigContext = createContext<AppConfig>(defaultAppConfig)
