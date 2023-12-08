import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useUiStateStore } from './store/UiStateStore'

export const RedirectPanel = (): JSX.Element => {
  const location = useLocation()

  // Use global UI state
  const setErrorMessage = useUiStateStore((state) => state.setErrorMessage)

  useEffect(() => {
    setErrorMessage(
      `An invalid URL was entered (${location.pathname}). 
      Please double-check the URL you entered and try again. 
      Your workspace has now been initialized with the last cache.`,
    )
  }, [])

  return (
    <div>
      <h6>Invalid URL was given. Redirecting to the application root...</h6>
    </div>
  )
}
