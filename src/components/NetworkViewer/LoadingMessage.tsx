interface LoadingMessageProps {
  message?: string
}

export const LoadingMessage = ({
  message,
}: LoadingMessageProps): JSX.Element => (
  <>
    <h1 style={{ color: 'red' }}>Loading Data</h1>
    <p>{message}</p>
  </>
)
