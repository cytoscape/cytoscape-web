import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export const RedirectPanel = (): JSX.Element => {
  const navigate = useNavigate()
  const [showError, setShowError] = useState<boolean>(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowError(false)
    }, 2000)

    // Clean up the timer when the component is unmounted
    return () => clearTimeout(timer)
  }, [])

  if (!showError) {
    navigate('/')
  }

  return (
    <div>
      <h6>Invalid URL was given. Redirecting to the application root...</h6>
    </div>
  )
}
