import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { AppConfig, defaultAppConfig } from './AppConfigContext'

/**
 * `boot/bootstrap.tsx` supplies the context with the parsed `config.json`
 * itself, so what that file contains is what every consumer of
 * AppConfigContext receives. These assertions read the real file rather than a
 * fixture: a field that type-checks but is missing from the shipped config
 * would leave the feature silently off with nothing failing.
 */
const committedConfig = JSON.parse(
  readFileSync(resolve(__dirname, './assets/config.json'), 'utf8'),
) as AppConfig

describe('AppConfigContext', () => {
  describe('allowsLocalhostAppsOn', () => {
    it('is absent from the built-in default, so saying nothing means off', () => {
      expect(defaultAppConfig.allowsLocalhostAppsOn).toBeUndefined()
    })

    // The committed config is the development server's (README, "Build for
    // production"), which is why naming dev1 here is correct and safe: the
    // value is honoured only against the origin actually being served.
    it('names dev1 in the committed config', () => {
      expect(committedConfig.allowsLocalhostAppsOn).toBe(
        'https://dev1.ndexbio.org',
      )
    })
  })

  it('the committed config still supplies every required field', () => {
    // Guards the delivery path rather than the type: bootstrap passes this
    // object straight through, so a key dropped here reaches consumers as
    // undefined without any compiler complaint.
    const required: Array<keyof AppConfig> = [
      'ndexBaseUrl',
      'keycloakConfig',
      'defaultServices',
      'testNetworks',
      'maxNetworkElementsThreshold',
      'maxEdgeCountThreshold',
      'maxNetworkFileSize',
      'urlBaseName',
      'undoStackSize',
      'errorReportEndpoint',
      'maxErrorReportSnapshotSizeMB',
      'appInstallAllowedOrigins',
    ]
    for (const key of required) {
      expect(committedConfig[key], `config.json is missing "${key}"`).toBeDefined()
    }
  })
})
