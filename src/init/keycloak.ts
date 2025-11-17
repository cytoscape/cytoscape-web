// @ts-expect-error-next-line: The @js4cytoscape/ndex-client package does not provide TypeScript types, but runtime usage is known to work safely.
import { NDEx } from '@js4cytoscape/ndex-client'
import Keycloak from 'keycloak-js'
import { createContext } from 'react'

import appConfig from '../assets/config.json'

export const KeycloakContext = createContext<Keycloak>(new Keycloak())

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
      const ndexClient = new NDEx(appConfig.ndexBaseUrl)
      await ndexClient.signInFromIdToken(keycloak.token)
      return {
        isVerified: true,
      }
    } catch (e) {
      // If response contains the verification error, trigger verification modal
      if (
        e.status === 401 &&
        e.response?.data?.errorCode === 'NDEx_User_Account_Not_Verified'
      ) {
        const userInfo = parseUserInfoFromErrorMessage(
          e.response?.data?.message,
        )
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
