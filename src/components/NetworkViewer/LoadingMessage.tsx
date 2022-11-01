interface LoadingMessageProps {
  message?: string
}

export const LoadingMessage = ({
  message,
}: LoadingMessageProps): JSX.Element => (
  <>
    <h1>Loading Data</h1>
    <p>{message}</p>
  </>
)
