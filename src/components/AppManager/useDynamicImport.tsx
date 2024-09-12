import { useState, useEffect } from 'react'

interface DynamicImportResult {
  component: React.ComponentType<any> | null
  error: Error | null
}

/**
 * A custom hook to dynamically import remote modules
 *
 * @param importFunc - Function that returns a promise that resolves to a module
 * @returns {DynamicImportResult} - The imported module and any error that occurred
 */
const useDynamicImport = (
  importFunc: () => Promise<any>,
): DynamicImportResult => {
  const [component, setComponent] = useState<React.ComponentType<any> | null>(
    null,
  )
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isMounted = true

    importFunc()
      .then((module) => {
        if (isMounted) {
          setComponent(() => module.default)
        }
      })
      .catch((err) => {
        console.error('Failed to load module:', err)
        if (isMounted) {
          setError(err)
        }
      })

    return () => {
      isMounted = false
    }
  }, [importFunc])

  return { component, error }
}

export default useDynamicImport
