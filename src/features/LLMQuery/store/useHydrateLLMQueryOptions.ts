import { useEffect } from 'react'

import { useLLMQueryStore } from './index'

/**
 * Loads the LLM Query options saved in this browser (provider, endpoint and
 * model) the first time a component that uses them mounts.
 *
 * The read is asynchronous, so the store starts on its defaults and switches
 * when the read comes back. It is not a boot step: nothing before first
 * render needs these options. Calling this from several components is fine;
 * the store applies the saved options once.
 */
export const useHydrateLLMQueryOptions = (): void => {
  const hydrateOptions = useLLMQueryStore((state) => state.hydrateOptions)
  useEffect(() => {
    void hydrateOptions()
  }, [hydrateOptions])
}
