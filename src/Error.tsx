import { ReactElement } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

export const Error = (): ReactElement => {
  const error = useRouteError()

  let status = 'Unknown'
  if (isRouteErrorResponse(error)) {
    const { statusText } = error
    status = statusText
  }

  return (
    <div id="error-page">
      <h1>Error:</h1>
      <p>An unexpected error has occurred.</p>
      <p>
        <i>{status}</i>
      </p>
    </div>
  )
}
