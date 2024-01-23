import { createContext } from 'react'

import { IdType } from './models/IdType'
import { AppDefinition } from './components/ToolBar/AppMenu/AppDefinition'

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
  testNetworks: IdType[]
  urlBaseName: string
  openAIAPIKey: string
  defaultApps: AppDefinition[]
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
  testNetworks: [
    '4ae2709d-3055-11ec-94bf-525400c25d22',
    '8b3faf53-3056-11ec-94bf-525400c25d22',
    '8b51d7c5-3056-11ec-94bf-525400c25d22',
    '8b957078-3056-11ec-94bf-525400c25d22',
    '8baf882a-3056-11ec-94bf-525400c25d22',
    '8bd2797c-3056-11ec-94bf-525400c25d22',
    'f625f9ef-3055-11ec-94bf-525400c25d22',
    'f950ad02-3055-11ec-94bf-525400c25d22',
    'f96b39e4-3055-11ec-94bf-525400c25d22',
    'f99975d6-3055-11ec-94bf-525400c25d22',
    'f9aeab88-3055-11ec-94bf-525400c25d22',
    'f9ca49da-3055-11ec-94bf-525400c25d22',
    '8bd2797c-3056-11ec-94bf-525400c25d22',
    'ab0eeef6-25bd-11e9-a05d-525400c25d22',
  ],
  urlBaseName: '',
  openAIAPIKey: '',
  defaultApps: []
}

export const AppConfigContext = createContext<AppConfig>(defaultAppConfig)
