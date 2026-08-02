/**
 * sessionStorage keys for this tab's private view state.
 *
 * A leaf module on purpose: nothing here imports anything. The Playwright specs
 * need these keys to seed and assert per-tab state, and Playwright loads spec
 * files in Node — where importing `tabViewState.ts` pulls in `@/debug` and dies
 * on `import.meta`. Splitting the constants out lets the tests name the key
 * instead of repeating the literal, which is the whole point of having one.
 *
 * The values are a storage contract. Changing one silently orphans whatever
 * every open tab has already written under the old name.
 */

/** Panels and the three active tab indices. Owned by `tabViewState.ts`. */
export const TAB_VIEW_STATE_KEY = 'cyweb.tab.viewState'

/** This tab's active network id. Owned by `tabNetwork.ts`. */
export const TAB_NETWORK_KEY = 'cyweb.tab.networkId'
