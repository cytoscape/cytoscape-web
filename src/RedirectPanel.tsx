import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useUiStateStore } from './store/UiStateStore'

export const RedirectPanel = (): JSX.Element => {
  const location = useLocation()

  // Use global UI state
  const setErrorMessage = useUiStateStore((state) => state.setErrorMessage)

  useEffect(() => {
    setErrorMessage(
      `Invalid URL was given (${location.pathname}). 
      The app was initialized with the default URL.`,
    )
  }, [])

  return (
    <div>
      <h6>Invalid URL was given. Redirecting to the application root...</h6>
    </div>
  )
}
