import Keycloak from 'keycloak-js'
import * as appConfig from '../assets/config.json'

const { keycloakConfig } = appConfig

const keycloak: Keycloak = new Keycloak({ ...keycloakConfig })

keycloak
  .init({
    onLoad: 'check-sso',
    silentCheckSsoRedirectUri:
      window.location.origin + '/silent-check-sso.html',
  })
  .then((authenticated) => {
    console.log('authenticated: ', authenticated, keycloak)
  })
  .catch((e) => {
    console.warn('Failed to initialize Keycloak client:', e)
  })

export { keycloak }
