import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { deleteProfileDb, getProfileSetting } from '../../../data/db/profileDb'
import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { listLLMModels } from '../api/chatgpt'
import { OLLAMA_DEFAULT_BASE_URL } from '../model/LLMProvider'
import { useLLMQueryStore } from '../store'
import { loadLLMSessionKeys } from '../store/llmKeySession'
import { saveLLMQueryOptions } from '../store/llmOptionsPersistence'
import { LLM_QUERY_OPTIONS_SETTING } from '../store/storageKeys'
import { LLMQueryOptionsDialog } from './LLMQueryOptionsDialog'

vi.mock('../api/chatgpt', () => ({
  listLLMModels: vi.fn(),
}))

const selectProvider = (id: string): void => {
  const select = screen.getByTestId('llm-query-options-provider-select')
  fireEvent.mouseDown(within(select).getByRole('combobox'))
  fireEvent.click(screen.getByTestId(`llm-query-options-provider-${id}`))
}

// The key field is a password input, which has no accessible role to query.
const apiKeyInput = (): HTMLInputElement => {
  const input = screen
    .getByTestId('llm-query-options-api-key-input')
    .querySelector('input')
  if (input === null) {
    throw new Error('The API key field has no input')
  }
  return input
}

describe('LLMQueryOptionsDialog', () => {
  beforeEach(async () => {
    window.sessionStorage.clear()
    await deleteProfileDb()
    act(() => {
      const state = useLLMQueryStore.getState()
      state.setLLMProvider('openai')
      state.setLLMBaseUrl('')
      state.setLLMModel('gpt-6-luna')
      state.setLLMApiKey('')
      state.setLLMCustomApiKey('')
    })
    vi.mocked(listLLMModels).mockReset()
    act(() => useMessageStore.getState().resetMessages())
  })

  it('hides the endpoint field for OpenAI', () => {
    render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

    expect(screen.queryByTestId('llm-query-options-base-url-input')).toBeNull()
    expect(screen.getByLabelText('OpenAI API Key')).toBeTruthy()
  })

  it('switching to Ollama pre-fills the local endpoint and a model suggestion', () => {
    render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

    selectProvider('ollama')

    const baseUrl = screen.getByTestId('llm-query-options-base-url-input')
    expect(within(baseUrl).getByRole('textbox')).toHaveProperty(
      'value',
      OLLAMA_DEFAULT_BASE_URL,
    )
    const modelInput = screen.getByTestId('llm-query-options-model-input')
    expect(modelInput).toHaveProperty('value', 'llama3.1')
    // Ollama is never sent a key, so there is nothing to enter
    expect(screen.queryByTestId('llm-query-options-api-key-input')).toBeNull()
  })

  it('accepts a typed model name and saves provider, endpoint and model on confirm', () => {
    const handleClose = vi.fn()
    render(<LLMQueryOptionsDialog open={true} handleClose={handleClose} />)

    selectProvider('ollama')
    const modelInput = screen.getByTestId('llm-query-options-model-input')
    fireEvent.change(modelInput, { target: { value: 'qwen2.5:7b' } })
    fireEvent.click(screen.getByTestId('llm-query-options-confirm-button'))

    const state = useLLMQueryStore.getState()
    expect(state.LLMProvider).toBe('ollama')
    expect(state.LLMBaseUrl).toBe(OLLAMA_DEFAULT_BASE_URL)
    expect(state.LLMModel).toBe('qwen2.5:7b')
    expect(state.LLMApiKey).toBe('')
    expect(handleClose).toHaveBeenCalled()
  })

  it('disables confirm while the model name is blank', () => {
    render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

    fireEvent.change(screen.getByTestId('llm-query-options-model-input'), {
      target: { value: '' },
    })

    expect(
      screen.getByTestId('llm-query-options-confirm-button'),
    ).toHaveProperty('disabled', true)
  })

  it('saves a custom endpoint key as the custom key and forgets the OpenAI key', () => {
    act(() => useLLMQueryStore.getState().setLLMApiKey('sk-openai'))
    render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

    selectProvider('custom')
    fireEvent.change(
      within(screen.getByTestId('llm-query-options-base-url-input')).getByRole(
        'textbox',
      ),
      { target: { value: 'https://llm.example.org/v1' } },
    )
    fireEvent.change(screen.getByTestId('llm-query-options-model-input'), {
      target: { value: 'my-model' },
    })
    fireEvent.change(apiKeyInput(), { target: { value: ' custom-key ' } })
    fireEvent.click(screen.getByTestId('llm-query-options-confirm-button'))

    const state = useLLMQueryStore.getState()
    expect(state.LLMCustomApiKey).toBe('custom-key')
    expect(state.LLMCustomApiKeyOrigin).toBe('https://llm.example.org')
    // Never saved as the OpenAI key, and the OpenAI key does not linger
    expect(state.LLMApiKey).toBe('')
  })

  it('does not send the stored OpenAI key when listing Ollama models', async () => {
    act(() => useLLMQueryStore.getState().setLLMApiKey('sk-openai'))
    vi.mocked(listLLMModels).mockResolvedValue(['llama3.1'])
    render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

    selectProvider('ollama')
    fireEvent.click(
      screen.getByTestId('llm-query-options-refresh-models-button'),
    )

    await waitFor(() => expect(listLLMModels).toHaveBeenCalled())
    expect(listLLMModels).toHaveBeenCalledWith({
      apiKey: '',
      baseUrl: OLLAMA_DEFAULT_BASE_URL,
    })
  })

  it('blocks confirm when a key would travel over plain HTTP to a remote host', () => {
    render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

    selectProvider('custom')
    fireEvent.change(
      within(screen.getByTestId('llm-query-options-base-url-input')).getByRole(
        'textbox',
      ),
      { target: { value: 'http://llm.example.org/v1' } },
    )
    fireEvent.change(screen.getByTestId('llm-query-options-model-input'), {
      target: { value: 'my-model' },
    })
    fireEvent.change(apiKeyInput(), { target: { value: 'custom-key' } })

    expect(
      screen.getByTestId('llm-query-options-confirm-button'),
    ).toHaveProperty('disabled', true)
  })

  it('discards a model listing that resolves after the provider changed', async () => {
    let resolveList: (ids: string[]) => void = () => {}
    vi.mocked(listLLMModels).mockReturnValue(
      new Promise<string[]>((resolve) => {
        resolveList = resolve
      }),
    )
    render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

    selectProvider('ollama')
    fireEvent.click(
      screen.getByTestId('llm-query-options-refresh-models-button'),
    )
    await waitFor(() => expect(listLLMModels).toHaveBeenCalled())

    // The user moves on before the Ollama listing comes back
    selectProvider('openai')
    await act(async () => {
      resolveList(['stale-ollama-model'])
    })

    expect(screen.getByTestId('llm-query-options-model-input')).toHaveProperty(
      'value',
      'gpt-6-luna',
    )
  })

  it('discards unsaved edits on Cancel: reopening shows the stored settings', () => {
    // AnalysisMenu keeps the dialog mounted and only toggles `open`
    const { rerender } = render(
      <LLMQueryOptionsDialog open={true} handleClose={() => {}} />,
    )

    selectProvider('custom')
    fireEvent.change(
      within(screen.getByTestId('llm-query-options-base-url-input')).getByRole(
        'textbox',
      ),
      { target: { value: 'https://llm.example.org/v1' } },
    )
    fireEvent.change(screen.getByTestId('llm-query-options-model-input'), {
      target: { value: 'unsaved-model' },
    })
    fireEvent.change(apiKeyInput(), { target: { value: 'unsaved-key' } })
    fireEvent.click(screen.getByTestId('llm-query-options-preview-button'))

    // Cancel, then reopen
    rerender(<LLMQueryOptionsDialog open={false} handleClose={() => {}} />)
    rerender(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

    expect(screen.queryByTestId('llm-query-options-base-url-input')).toBeNull()
    expect(screen.getByTestId('llm-query-options-model-input')).toHaveProperty(
      'value',
      'gpt-6-luna',
    )
    expect(apiKeyInput()).toHaveProperty('value', '')
    expect(screen.getByLabelText('OpenAI API Key')).toBeTruthy()
  })

  it('reopening after Confirm shows the settings that were saved', () => {
    const { rerender } = render(
      <LLMQueryOptionsDialog open={true} handleClose={() => {}} />,
    )

    selectProvider('ollama')
    fireEvent.click(screen.getByTestId('llm-query-options-confirm-button'))
    rerender(<LLMQueryOptionsDialog open={false} handleClose={() => {}} />)
    rerender(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

    expect(
      within(screen.getByTestId('llm-query-options-base-url-input')).getByRole(
        'textbox',
      ),
    ).toHaveProperty('value', OLLAMA_DEFAULT_BASE_URL)
    expect(screen.getByTestId('llm-query-options-model-input')).toHaveProperty(
      'value',
      'llama3.1',
    )
  })

  it('reports the result of a model listing while the dialog is open', async () => {
    vi.mocked(listLLMModels).mockResolvedValue(['llama3.1'])
    render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

    selectProvider('ollama')
    fireEvent.click(
      screen.getByTestId('llm-query-options-refresh-models-button'),
    )

    await waitFor(() =>
      expect(useMessageStore.getState().messages.map((m) => m.message)).toEqual(
        ['Found 1 model'],
      ),
    )
  })

  it.each([
    ['success', (resolve: (ids: string[]) => void) => resolve(['llama3.1'])],
    [
      'failure',
      (_resolve: (ids: string[]) => void, reject: (e: Error) => void) =>
        reject(new Error('connection refused')),
    ],
  ])(
    'shows no toast when a model listing ends in %s after the dialog closed',
    async (_name, settle) => {
      let resolveList: (ids: string[]) => void = () => {}
      let rejectList: (e: Error) => void = () => {}
      vi.mocked(listLLMModels).mockReturnValue(
        new Promise<string[]>((resolve, reject) => {
          resolveList = resolve
          rejectList = reject
        }),
      )
      const { rerender } = render(
        <LLMQueryOptionsDialog open={true} handleClose={() => {}} />,
      )

      selectProvider('ollama')
      fireEvent.click(
        screen.getByTestId('llm-query-options-refresh-models-button'),
      )
      await waitFor(() => expect(listLLMModels).toHaveBeenCalled())

      // The user cancels before the endpoint answers
      rerender(<LLMQueryOptionsDialog open={false} handleClose={() => {}} />)
      await act(async () => {
        settle(resolveList, rejectList)
      })

      expect(useMessageStore.getState().messages).toEqual([])
    },
  )

  describe('API key handling', () => {
    it('masks the key and marks it up for a password manager', () => {
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      const input = apiKeyInput()
      expect(input.type).toBe('password')
      expect(input.getAttribute('autocomplete')).toBe('current-password')
      expect(input.closest('form')).not.toBeNull()
    })

    /**
     * The username beside the key is for password managers and must take no
     * room. In `sx`, `width: 1` means 100%, which once made it as large as
     * the dialog and gave the dialog scrollbars.
     */
    it('keeps the hidden username input at one pixel', () => {
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      const username = apiKeyInput()
        .closest('form')
        ?.querySelector('input[name="username"]')
      expect(username).not.toBeNull()
      const style = getComputedStyle(username as Element)
      expect(style.width).toBe('1px')
      expect(style.height).toBe('1px')
      expect(style.margin).toBe('-1px')
    })

    it('never renders a stored key', () => {
      act(() => useLLMQueryStore.getState().setLLMApiKey('sk-secret-value'))

      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      expect(apiKeyInput().value).toBe('')
      expect(document.body.innerHTML).not.toContain('sk-secret-value')
    })

    it('says how long the key is kept and how to limit the damage', () => {
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      expect(screen.getByText(/removed when you close the tab/)).toBeTruthy()
      expect(screen.getByText(/spending limit/)).toBeTruthy()
    })

    it('keeps a confirmed key in sessionStorage', () => {
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      fireEvent.change(apiKeyInput(), { target: { value: 'sk-openai' } })
      fireEvent.click(screen.getByTestId('llm-query-options-confirm-button'))

      expect(loadLLMSessionKeys()).toEqual({
        openAiKey: 'sk-openai',
        customKey: '',
        customKeyOrigin: '',
      })
    })

    it('does not keep a key the user typed and then cancelled', () => {
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      fireEvent.change(apiKeyInput(), { target: { value: 'sk-openai' } })
      fireEvent.click(screen.getByTestId('llm-query-options-cancel-button'))

      expect(window.sessionStorage.length).toBe(0)
      expect(useLLMQueryStore.getState().LLMApiKey).toBe('')
    })

    it('offers to forget a key only when one was entered', () => {
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      expect(
        screen.queryByTestId('llm-query-options-forget-key-button'),
      ).toBeNull()
    })

    it('forgets the key at once, without waiting for Confirm', () => {
      act(() => {
        useLLMQueryStore.getState().setLLMApiKey('sk-openai')
        useLLMQueryStore.getState().setLLMCustomApiKey('custom-key')
      })
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      fireEvent.click(screen.getByTestId('llm-query-options-forget-key-button'))

      expect(useLLMQueryStore.getState().LLMApiKey).toBe('')
      // Only the selected provider's key goes
      expect(loadLLMSessionKeys()).toEqual({
        openAiKey: '',
        customKey: 'custom-key',
        customKeyOrigin: '',
      })
      expect(
        screen.queryByTestId('llm-query-options-forget-key-button'),
      ).toBeNull()
    })
  })

  describe('options across reloads', () => {
    it('saves provider, endpoint and model on confirm, and no key', async () => {
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      selectProvider('custom')
      fireEvent.change(
        within(
          screen.getByTestId('llm-query-options-base-url-input'),
        ).getByRole('textbox'),
        { target: { value: 'https://llm.example.org/v1' } },
      )
      fireEvent.change(screen.getByTestId('llm-query-options-model-input'), {
        target: { value: 'my-model' },
      })
      fireEvent.change(apiKeyInput(), { target: { value: 'secret-custom' } })
      fireEvent.click(screen.getByTestId('llm-query-options-confirm-button'))

      await waitFor(async () => {
        expect(await getProfileSetting(LLM_QUERY_OPTIONS_SETTING)).toEqual({
          provider: 'custom',
          baseUrl: 'https://llm.example.org/v1',
          model: 'my-model',
        })
      })
      expect(window.localStorage.length).toBe(0)
    })

    it('shows the saved options when they arrive after the dialog opened', async () => {
      await saveLLMQueryOptions({
        provider: 'ollama',
        baseUrl: OLLAMA_DEFAULT_BASE_URL,
        model: 'qwen2.5',
      })
      // A fresh page load: defaults in memory, nothing read yet
      act(() => useLLMQueryStore.setState({ optionsHydrated: false }))

      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      await waitFor(() => {
        expect(
          screen.getByTestId('llm-query-options-model-input'),
        ).toHaveProperty('value', 'qwen2.5')
      })
      expect(
        within(
          screen.getByTestId('llm-query-options-base-url-input'),
        ).getByRole('textbox'),
      ).toHaveProperty('value', OLLAMA_DEFAULT_BASE_URL)
    })
  })

  /**
   * A key is kept only for the provider, and for a custom endpoint the host,
   * it was entered for. The dialog says so before Confirm, and never uses a
   * stored key for anything else in the meantime.
   */
  describe('keys follow the provider and the endpoint', () => {
    const FORGET_WARNING = 'llm-query-options-forget-warning'
    const baseUrlInput = (): HTMLElement =>
      within(screen.getByTestId('llm-query-options-base-url-input')).getByRole(
        'textbox',
      )
    const useCustomEndpoint = (): void => {
      act(() => {
        const state = useLLMQueryStore.getState()
        state.setLLMOptions({
          provider: 'custom',
          baseUrl: 'https://llm.example.org/v1',
          model: 'my-model',
        })
        state.setLLMCustomApiKey('custom-key')
      })
    }

    it('has nothing to warn about while the provider stays the same', () => {
      act(() => useLLMQueryStore.getState().setLLMApiKey('sk-openai'))
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      expect(screen.queryByTestId(FORGET_WARNING)).toBeNull()
    })

    it('has nothing to warn about when no key was entered', () => {
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      selectProvider('ollama')

      expect(screen.queryByTestId(FORGET_WARNING)).toBeNull()
    })

    it('warns that confirming another provider forgets the OpenAI key', () => {
      act(() => useLLMQueryStore.getState().setLLMApiKey('sk-openai'))
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      selectProvider('ollama')

      expect(screen.getByTestId(FORGET_WARNING).textContent).toContain(
        'OpenAI API key',
      )
    })

    it('forgets the OpenAI key when another provider is confirmed', () => {
      act(() => useLLMQueryStore.getState().setLLMApiKey('sk-openai'))
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      selectProvider('ollama')
      fireEvent.click(screen.getByTestId('llm-query-options-confirm-button'))

      expect(useLLMQueryStore.getState().LLMApiKey).toBe('')
      expect(window.sessionStorage.length).toBe(0)
    })

    it('keeps the key when another provider is selected and then cancelled', () => {
      act(() => useLLMQueryStore.getState().setLLMApiKey('sk-openai'))
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      selectProvider('ollama')
      fireEvent.click(screen.getByTestId('llm-query-options-cancel-button'))

      expect(useLLMQueryStore.getState().LLMApiKey).toBe('sk-openai')
      expect(loadLLMSessionKeys().openAiKey).toBe('sk-openai')
    })

    it('warns that changing the endpoint forgets the key entered for the old one', () => {
      useCustomEndpoint()
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)
      expect(screen.queryByTestId(FORGET_WARNING)).toBeNull()

      fireEvent.change(baseUrlInput(), {
        target: { value: 'https://other.example.org/v1' },
      })

      expect(screen.getByTestId(FORGET_WARNING).textContent).toContain(
        'https://llm.example.org',
      )
    })

    it('does not warn when the endpoint only moves on the same host', () => {
      useCustomEndpoint()
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      fireEvent.change(baseUrlInput(), {
        target: { value: 'https://llm.example.org/v2' },
      })

      expect(screen.queryByTestId(FORGET_WARNING)).toBeNull()
    })

    it('forgets the custom key when a different endpoint is confirmed', () => {
      useCustomEndpoint()
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      fireEvent.change(baseUrlInput(), {
        target: { value: 'https://other.example.org/v1' },
      })
      fireEvent.click(screen.getByTestId('llm-query-options-confirm-button'))

      const state = useLLMQueryStore.getState()
      expect(state.LLMBaseUrl).toBe('https://other.example.org/v1')
      expect(state.LLMCustomApiKey).toBe('')
      expect(window.sessionStorage.length).toBe(0)
    })

    it('keeps a key typed together with the new endpoint, for that endpoint', () => {
      useCustomEndpoint()
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      fireEvent.change(baseUrlInput(), {
        target: { value: 'https://other.example.org/v1' },
      })
      fireEvent.change(apiKeyInput(), { target: { value: 'new-key' } })
      fireEvent.click(screen.getByTestId('llm-query-options-confirm-button'))

      expect(loadLLMSessionKeys()).toEqual({
        openAiKey: '',
        customKey: 'new-key',
        customKeyOrigin: 'https://other.example.org',
      })
    })

    /**
     * The model listing goes out before Confirm, to whatever URL is in the
     * field. The stored key was entered for another host and must not ride
     * along: https://llm.example.org.evil.test would otherwise receive it.
     */
    it('does not send the stored key to a different endpoint when listing models', async () => {
      useCustomEndpoint()
      vi.mocked(listLLMModels).mockResolvedValue([])
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      fireEvent.change(baseUrlInput(), {
        target: { value: 'https://llm.example.org.evil.test/v1' },
      })
      fireEvent.click(
        screen.getByTestId('llm-query-options-refresh-models-button'),
      )

      await waitFor(() => expect(listLLMModels).toHaveBeenCalled())
      expect(vi.mocked(listLLMModels).mock.calls[0][0]).toEqual({
        apiKey: '',
        baseUrl: 'https://llm.example.org.evil.test/v1',
      })
    })

    it('still sends the stored key when listing models from its own endpoint', async () => {
      useCustomEndpoint()
      vi.mocked(listLLMModels).mockResolvedValue([])
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      fireEvent.click(
        screen.getByTestId('llm-query-options-refresh-models-button'),
      )

      await waitFor(() => expect(listLLMModels).toHaveBeenCalled())
      expect(vi.mocked(listLLMModels).mock.calls[0][0]).toEqual({
        apiKey: 'custom-key',
        baseUrl: 'https://llm.example.org/v1',
      })
    })
  })

  /**
   * The saved row has limits. An option the dialog accepted but the row
   * cannot hold would come back as the defaults after a reload.
   */
  describe('options that could not be saved', () => {
    const confirmButton = (): HTMLElement =>
      screen.getByTestId('llm-query-options-confirm-button')

    it('does not confirm an over-long model name', () => {
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      fireEvent.change(screen.getByTestId('llm-query-options-model-input'), {
        target: { value: 'm'.repeat(201) },
      })

      expect(confirmButton()).toHaveProperty('disabled', true)
      expect(screen.getByText(/model name is too long/)).toBeTruthy()
    })

    it('does not confirm an over-long endpoint URL', () => {
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      selectProvider('custom')
      fireEvent.change(
        within(
          screen.getByTestId('llm-query-options-base-url-input'),
        ).getByRole('textbox'),
        { target: { value: 'https://h/'.padEnd(2049, 'a') } },
      )
      fireEvent.change(screen.getByTestId('llm-query-options-model-input'), {
        target: { value: 'my-model' },
      })

      expect(confirmButton()).toHaveProperty('disabled', true)
      expect(screen.getByText(/endpoint URL is too long/)).toBeTruthy()
    })
  })

  /**
   * The saved options can arrive after the dialog opened. An untouched form
   * re-seeds from them (tested above); a form the user already typed in must
   * keep what they typed, a key above all.
   */
  describe('saved options that arrive while the user is typing', () => {
    const realHydrate = useLLMQueryStore.getState().hydrateOptions

    beforeEach(() => {
      act(() => {
        useLLMQueryStore.setState({
          optionsHydrated: false,
          // The read is still pending when the dialog opens
          hydrateOptions: async () => {},
        })
      })
    })

    const savedOptionsArrive = (): void => {
      act(() => {
        useLLMQueryStore.setState({
          LLMModel: 'gpt-5',
          optionsHydrated: true,
        })
      })
    }

    it('keeps a key typed before they arrived', () => {
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)
      fireEvent.change(apiKeyInput(), { target: { value: 'sk-typed' } })

      savedOptionsArrive()

      expect(apiKeyInput().value).toBe('sk-typed')
    })

    it('keeps a model typed before they arrived', () => {
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)
      fireEvent.change(screen.getByTestId('llm-query-options-model-input'), {
        target: { value: 'my-choice' },
      })

      savedOptionsArrive()

      expect(
        screen.getByTestId('llm-query-options-model-input'),
      ).toHaveProperty('value', 'my-choice')
    })

    it('still shows them in a form that was not touched', () => {
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      savedOptionsArrive()

      expect(
        screen.getByTestId('llm-query-options-model-input'),
      ).toHaveProperty('value', 'gpt-5')
    })

    // Typing a key must not leave the default provider in the form, or
    // Confirm would save the defaults over the options that just arrived.
    it('shows them when only a key was typed before they arrived', () => {
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)
      fireEvent.change(apiKeyInput(), { target: { value: 'sk-typed' } })

      act(() => {
        useLLMQueryStore.setState({
          LLMProvider: 'custom',
          LLMBaseUrl: 'https://llm.example.org/v1',
          LLMModel: 'my-model',
          optionsHydrated: true,
        })
      })

      expect(
        within(
          screen.getByTestId('llm-query-options-base-url-input'),
        ).getByRole('textbox'),
      ).toHaveProperty('value', 'https://llm.example.org/v1')
      expect(
        screen.getByTestId('llm-query-options-model-input'),
      ).toHaveProperty('value', 'my-model')
      expect(apiKeyInput().value).toBe('sk-typed')
    })

    // Restored here, not in afterEach, so the describe needs no extra import
    it('restores the real read', () => {
      act(() => useLLMQueryStore.setState({ hydrateOptions: realHydrate }))
      expect(useLLMQueryStore.getState().hydrateOptions).toBe(realHydrate)
    })
  })

  describe('a key too long to keep', () => {
    it('is not confirmed, and the field says why', () => {
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      fireEvent.change(apiKeyInput(), { target: { value: 'k'.repeat(4097) } })

      expect(
        screen.getByTestId('llm-query-options-confirm-button'),
      ).toHaveProperty('disabled', true)
      expect(screen.getByText(/API key is too long/)).toBeTruthy()
    })

    it('accepts a long bearer token within the limit', () => {
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      fireEvent.change(apiKeyInput(), { target: { value: 'k'.repeat(4096) } })
      fireEvent.click(screen.getByTestId('llm-query-options-confirm-button'))

      expect(loadLLMSessionKeys().openAiKey).toBe('k'.repeat(4096))
    })
  })
})
