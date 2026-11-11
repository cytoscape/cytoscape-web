/**
 * What installing an app entry would do to the version already in the catalog
 * under the same id. Versions are compared as semantic versions
 * (`compareAppVersions`), so 3.2.0 is newer than 3.1.23.
 *
 * - `new`: nothing is installed under the id
 * - `update`: the offered entry replaces the installed one, because it is
 *   newer or because the versions cannot be compared (an install always
 *   replaced before versions were compared)
 * - `same`: the same version, or the same remote entry URL, is installed
 * - `older`: a newer version is installed and is kept
 */
export type AppVersionChange =
  | { readonly kind: 'new' }
  | { readonly kind: 'update'; readonly from?: string; readonly to?: string }
  | { readonly kind: 'same'; readonly version?: string }
  | {
      readonly kind: 'older'
      readonly installed: string
      readonly offered: string
    }

/**
 * The result of `installApp`: the version change it made, or `rejected` when
 * the entry failed the trust boundary (the reason is already reported).
 */
export type AppInstallOutcome = AppVersionChange | { readonly kind: 'rejected' }
