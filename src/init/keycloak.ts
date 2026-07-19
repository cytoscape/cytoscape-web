import { NDExAuthError, NDExClient } from '@js4cytoscape/ndex-client'
import Keycloak, { KeycloakInitOptions } from 'keycloak-js'
import { createContext } from 'react'

import appConfig from '../assets/config.json'
import { getNDExBaseUrl } from '../data/external-api/ndex/config'

export const KeycloakContext = createContext<Keycloak>(new Keycloak())

export const buildKeycloakInitOptions = (
  isLocalDevHost: boolean,
  urlBaseName: string,
): KeycloakInitOptions => {
  if (isLocalDevHost) {
    return { checkLoginIframe: false }
  }
  return {
    onLoad: 'check-sso',
    checkLoginIframe: false,
    // CW-663: with third-party cookies blocked (e.g. incognito), keycloak-js
    // would otherwise fall back to a full-page redirect check-sso whose
    // redirect_uri is location.href — including user-supplied params such as
    // ?import=<url> — which NDEx Keycloak can reject with
    // "Invalid parameter: redirect_uri". With the fallback disabled, the
    // silent iframe check still runs and simply resolves unauthenticated.
    silentCheckSsoFallback: false,
    silentCheckSsoRedirectUri:
      window.location.origin + urlBaseName + 'silent-check-sso.html',
  }
}

export const initializeKeycloak = () => {
  const { keycloakConfig, urlBaseName } = appConfig

  const keycloak = new Keycloak(keycloakConfig)

  const handleVerify = async () => {
    window.location.reload()
  }

  const handleCancel = () => {
    keycloak.logout({ redirectUri: window.location.origin + urlBaseName })
  }

  /**
   * Parses the NDEx error message to extract user information
   * @param errorMessage - The error message from NDEx API
   * @returns User name and email if found, null otherwise
   */
  const parseUserInfoFromErrorMessage = (
    errorMessage: string,
  ): { userName: string; userEmail: string } | null => {
    const userInfoPattern = /NDEx user account ([\w.]+) <([\w.]+@[\w.]+)>/
    const match = errorMessage.match(userInfoPattern)

    if (match) {
      const userName = match[1]
      const userEmail = match[2]
      return { userName, userEmail }
    }
    return null
  }

  // Function to check if the user's email is verified
  const checkUserVerification = async () => {
    try {
      const ndexClient = new NDExClient({
        baseURL: getNDExBaseUrl(),
        auth: {
          type: 'oauth',
          idToken: keycloak.token as string,
        },
      })
      await ndexClient.user.authenticate()
      return {
        isVerified: true,
      }
    } catch (e) {
      // If response contains the verification error, trigger verification modal
      if (
        e instanceof NDExAuthError &&
        e.errorCode === 'NDEx_User_Account_Not_Verified'
      ) {
        const userInfo = parseUserInfoFromErrorMessage(e.message)
        return {
          isVerified: false,
          userName: userInfo?.userName,
          userEmail: userInfo?.userEmail,
        }
      }
      return {
        isVerified: true,
      }
    }
  }

  return {
    keycloak,
    handleVerify,
    handleCancel,
    checkUserVerification,
  }
}
