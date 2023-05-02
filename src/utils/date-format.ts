export const dateFormatter = (timestamp: number): string =>
  new Date(timestamp).toLocaleString('en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
