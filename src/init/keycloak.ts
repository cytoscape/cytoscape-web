import Keycloak from 'keycloak-js'
import appConfig from '../assets/config.json'
import { createContext } from 'react'
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'

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

  // Function to parse the error message to get the user information
  const parseMessage = (
    message: string,
  ): { userName: string; userEmail: string } | null => {
    const pattern = /NDEx user account ([\w.]+) <([\w.]+@[\w.]+)>/
    const match = message.match(pattern)

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
        const userInfo = parseMessage(e.response?.data?.message)
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
