import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import { useOnboardingStore } from '@/features/Onboarding/store/OnboardingStore'
import { BACKUP_REMINDER_HINT_ID, BackupReminder } from './BackupReminder'

const seedNetworks = (count: number): void => {
  act(() => {
    useWorkspaceStore.setState((state) => {
      state.workspace.networkIds = Array.from(
        { length: count },
        (_, i) => `net-${i}`,
      )
      return state
    })
  })
}

describe('BackupReminder', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset()
  })

  it('stays quiet while the workspace holds little worth losing', () => {
    seedNetworks(2)
    render(<BackupReminder />)

    expect(screen.queryByTestId('backup-reminder')).toBeNull()
  })

  it('appears once the workspace is worth backing up', () => {
    seedNetworks(3)
    render(<BackupReminder />)

    expect(screen.getByTestId('backup-reminder')).toBeTruthy()
  })

  it('does not come back after being dismissed', () => {
    seedNetworks(3)
    const { unmount } = render(<BackupReminder />)

    fireEvent.click(screen.getByTestId('backup-reminder-dismiss'))
    expect(screen.queryByTestId('backup-reminder')).toBeNull()

    // The dismissal is persisted, so a remount (or a page reload) keeps it hidden.
    expect(useOnboardingStore.getState().dismissedHints).toContain(
      BACKUP_REMINDER_HINT_ID,
    )
    unmount()
    render(<BackupReminder />)
    expect(screen.queryByTestId('backup-reminder')).toBeNull()
  })

  it('withdraws dismissal while an export is running', () => {
    seedNetworks(3)
    render(<BackupReminder />)

    fireEvent.click(screen.getByTestId('backup-reminder-export'))

    // Dismissing mid-export would persist even if the export then failed,
    // hiding the reminder from someone who now has no backup at all.
    const dismiss = screen.getByTestId(
      'backup-reminder-dismiss',
    ) as HTMLButtonElement
    expect(dismiss.disabled).toBe(true)
    fireEvent.click(dismiss)
    expect(useOnboardingStore.getState().dismissedHints).not.toContain(
      BACKUP_REMINDER_HINT_ID,
    )
  })

  it('stays hidden when the hint was dismissed in an earlier session', () => {
    seedNetworks(3)
    act(() => {
      useOnboardingStore.getState().dismissHint(BACKUP_REMINDER_HINT_ID)
    })
    render(<BackupReminder />)

    expect(screen.queryByTestId('backup-reminder')).toBeNull()
  })
})
