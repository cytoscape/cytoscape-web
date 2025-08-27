import * as React from 'react'

interface FormStates {
  // Form visibility states
  showCreateColumnForm: boolean
  showDeleteColumnForm: boolean
  showEditColumnForm: boolean
  showSearch: boolean

  // Form error states
  createColumnFormError: string | undefined
  deleteColumnFormError: string | undefined
  columnFormError: string | undefined
}

interface FormActions {
  // Form visibility actions
  setShowCreateColumnForm: (show: boolean) => void
  setShowDeleteColumnForm: (show: boolean) => void
  setShowEditColumnForm: (show: boolean) => void
  setShowSearch: (show: boolean) => void

  // Form error actions
  setCreateColumnFormError: (error: string | undefined) => void
  setDeleteColumnFormError: (error: string | undefined) => void
  setColumnFormError: (error: string | undefined) => void

  // Utility actions
  clearAllErrors: () => void
  closeAllForms: () => void
}

export function useTableBrowserFormState(): FormStates & FormActions {
  // Form visibility states
  const [showCreateColumnForm, setShowCreateColumnForm] = React.useState(false)
  const [showDeleteColumnForm, setShowDeleteColumnForm] = React.useState(false)
  const [showEditColumnForm, setShowEditColumnForm] = React.useState(false)
  const [showSearch, setShowSearch] = React.useState(false)

  // Form error states
  const [createColumnFormError, setCreateColumnFormError] = React.useState<
    string | undefined
  >(undefined)
  const [deleteColumnFormError, setDeleteColumnFormError] = React.useState<
    string | undefined
  >(undefined)
  const [columnFormError, setColumnFormError] = React.useState<
    string | undefined
  >(undefined)

  // Utility functions
  const clearAllErrors = React.useCallback(() => {
    setCreateColumnFormError(undefined)
    setDeleteColumnFormError(undefined)
    setColumnFormError(undefined)
  }, [])

  const closeAllForms = React.useCallback(() => {
    setShowCreateColumnForm(false)
    setShowDeleteColumnForm(false)
    setShowEditColumnForm(false)
    setShowSearch(false)
  }, [])

  return {
    // Form visibility states
    showCreateColumnForm,
    showDeleteColumnForm,
    showEditColumnForm,
    showSearch,

    // Form error states
    createColumnFormError,
    deleteColumnFormError,
    columnFormError,

    // Form visibility actions
    setShowCreateColumnForm,
    setShowDeleteColumnForm,
    setShowEditColumnForm,
    setShowSearch,

    // Form error actions
    setCreateColumnFormError,
    setDeleteColumnFormError,
    setColumnFormError,

    // Utility actions
    clearAllErrors,
    closeAllForms,
  }
}
