export const dateFormatter = (timestamp: string | number | Date): string =>
  new Date(timestamp).toLocaleString('en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
