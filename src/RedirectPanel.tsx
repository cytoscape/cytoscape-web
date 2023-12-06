import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useUiStateStore } from './store/UiStateStore'

export const RedirectPanel = (): JSX.Element => {
  const location = useLocation()
  console.log('---------------RED panel!!', location)

  // Use global UI state
  const setErrorMessage = useUiStateStore((state) => state.setErrorMessage)

  useEffect(() => {
    console.log('----ER RED panel!!', location)
    setErrorMessage('Wrong URL:' + location.pathname)
  }, [])

  return (
    <div>
      <h6>Invalid URL was given. Redirecting to the application root...</h6>
    </div>
  )
}
