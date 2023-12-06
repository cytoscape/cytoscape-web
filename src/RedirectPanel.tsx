import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUiStateStore } from './store/UiStateStore'

export const RedirectPanel = (): JSX.Element => {
  console.log('RED panel!!')
  const navigate = useNavigate()
  const [showError, setShowError] = useState<boolean>(true)

  // Use global UI state
  const setErrorMessage = useUiStateStore(
    (state) => state.setErrorMessage,
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowError(false)
      setErrorMessage('Wrong URL')
    }, 5000)

    // Clean up the timer when the component is unmounted
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!showError) {
      navigate('/')
    }
  }, [showError])

  return (
    <div>
      <h6>Invalid URL was given. Redirecting to the application root...</h6>
    </div>
  )
}
