import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { listLLMModels } from '../api/chatgpt'
import { getWebGPUSupport, NO_WEBGPU_REASON } from '../api/webgpu'
import { startWebLLMModelLoad, stopWebLLM } from '../api/webllmSession'
import { OLLAMA_DEFAULT_BASE_URL } from '../model/LLMProvider'
import { useLLMQueryStore } from '../store'
import { LLMQueryOptionsDialog } from './LLMQueryOptionsDialog'
import { LLM_QUERY_TAB_INDEX } from '@/models/UiModel/impl/panelTabs'

vi.mock('../api/chatgpt', () => ({
  listLLMModels: vi.fn(),
}))

vi.mock('../api/webgpu', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/webgpu')>()),
  getWebGPUSupport: vi.fn(),
}))

vi.mock('../api/webllmSession', () => ({
  startWebLLMModelLoad: vi.fn(),
  stopWebLLM: vi.fn(),
}))

const selectProvider = (id: string): void => {
  const select = screen.getByTestId('llm-query-options-provider-select')
  fireEvent.mouseDown(within(select).getByRole('combobox'))
  fireEvent.click(screen.getByTestId(`llm-query-options-provider-${id}`))
}

describe('LLMQueryOptionsDialog', () => {
  beforeEach(() => {
    act(() => {
      const state = useLLMQueryStore.getState()
      state.setLLMProvider('openai')
      state.setLLMBaseUrl('')
      state.setLLMModel('gpt-6-luna')
      state.setLLMApiKey('')
      state.setLLMCustomApiKey('')
    })
    vi.mocked(listLLMModels).mockReset()
    vi.mocked(getWebGPUSupport).mockReset().mockResolvedValue({
      supported: true,
      shaderF16: true,
      adapterName: 'Test GPU',
    })
    vi.mocked(startWebLLMModelLoad).mockReset()
    vi.mocked(stopWebLLM).mockReset()
    act(() => {
      useMessageStore.getState().resetMessages()
      useLLMQueryStore.getState().setWebLLMStatus({ state: 'idle' })
    })
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

  it('saves a custom endpoint key separately and never as the OpenAI key', () => {
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
    fireEvent.change(
      within(screen.getByTestId('llm-query-options-api-key-input')).getByRole(
        'textbox',
      ),
      { target: { value: ' custom-key ' } },
    )
    fireEvent.click(screen.getByTestId('llm-query-options-confirm-button'))

    const state = useLLMQueryStore.getState()
    expect(state.LLMCustomApiKey).toBe('custom-key')
    expect(state.LLMApiKey).toBe('sk-openai')
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
    fireEvent.change(
      within(screen.getByTestId('llm-query-options-api-key-input')).getByRole(
        'textbox',
      ),
      { target: { value: 'custom-key' } },
    )

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
    fireEvent.change(
      within(screen.getByTestId('llm-query-options-api-key-input')).getByRole(
        'textbox',
      ),
      { target: { value: 'unsaved-key' } },
    )
    fireEvent.click(screen.getByTestId('llm-query-options-preview-button'))

    // Cancel, then reopen
    rerender(<LLMQueryOptionsDialog open={false} handleClose={() => {}} />)
    rerender(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

    expect(screen.queryByTestId('llm-query-options-base-url-input')).toBeNull()
    expect(screen.getByTestId('llm-query-options-model-input')).toHaveProperty(
      'value',
      'gpt-6-luna',
    )
    expect(
      within(screen.getByTestId('llm-query-options-api-key-input')).getByRole(
        'textbox',
      ),
    ).toHaveProperty('value', '')
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

  describe('WebLLM (in-browser)', () => {
    const webLLMSelect = () =>
      screen.getByTestId('llm-query-options-webllm-model-select')
    const confirmButton = () =>
      screen.getByTestId('llm-query-options-confirm-button')

    it('blocks the model and Confirm when WebGPU is unsupported', async () => {
      vi.mocked(getWebGPUSupport).mockResolvedValue({
        supported: false,
        reason: NO_WEBGPU_REASON,
      })
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      selectProvider('webllm')
      expect(
        screen.getByTestId('llm-query-options-webgpu-checking'),
      ).toBeTruthy()

      const warning = await screen.findByTestId(
        'llm-query-options-webgpu-unsupported',
      )
      expect(warning.textContent).toContain('does not support WebGPU')
      expect(
        within(webLLMSelect())
          .getByRole('combobox')
          .getAttribute('aria-disabled'),
      ).toBe('true')
      expect(confirmButton()).toHaveProperty('disabled', true)
      // Cancel stays the way out
      expect(
        screen.getByTestId('llm-query-options-cancel-button'),
      ).toHaveProperty('disabled', false)
    })

    it('hides the endpoint, key and model listing controls', async () => {
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      selectProvider('webllm')
      await screen.findByTestId('llm-query-options-webgpu-supported')

      expect(
        screen.queryByTestId('llm-query-options-base-url-input'),
      ).toBeNull()
      expect(screen.queryByTestId('llm-query-options-api-key-input')).toBeNull()
      expect(
        screen.queryByTestId('llm-query-options-refresh-models-button'),
      ).toBeNull()
      expect(screen.queryByTestId('llm-query-options-model-input')).toBeNull()
    })

    it('offers the f16 builds and starts the load in the background on Confirm', async () => {
      act(() => {
        useUiStateStore.getState().setPanelState('left', 'closed')
        useUiStateStore.getState().setActiveNetworkBrowserPanelIndex(0)
      })
      const handleClose = vi.fn()
      render(<LLMQueryOptionsDialog open={true} handleClose={handleClose} />)

      selectProvider('webllm')
      await screen.findByTestId('llm-query-options-webgpu-supported')
      await waitFor(() =>
        expect(confirmButton()).toHaveProperty('disabled', false),
      )

      fireEvent.mouseDown(within(webLLMSelect()).getByRole('combobox'))
      expect(
        screen.getByTestId(
          'llm-query-options-webllm-model-Qwen2.5-3B-Instruct-q4f16_1-MLC',
        ).textContent,
      ).toContain('1.7 GB download')
      expect(
        screen.queryByTestId(
          'llm-query-options-webllm-model-Qwen2.5-3B-Instruct-q4f32_1-MLC',
        ),
      ).toBeNull()
      fireEvent.click(
        screen.getByTestId(
          'llm-query-options-webllm-model-Llama-3.2-3B-Instruct-q4f16_1-MLC',
        ),
      )
      fireEvent.click(confirmButton())

      const state = useLLMQueryStore.getState()
      expect(state.LLMProvider).toBe('webllm')
      expect(state.LLMModel).toBe('Llama-3.2-3B-Instruct-q4f16_1-MLC')
      expect(state.LLMBaseUrl).toBe('')
      expect(startWebLLMModelLoad).toHaveBeenCalledWith(
        'Llama-3.2-3B-Instruct-q4f16_1-MLC',
      )
      expect(stopWebLLM).not.toHaveBeenCalled()
      // The LLM Query panel opens to show the progress
      expect(useUiStateStore.getState().ui.panels.left).toBe('open')
      expect(
        useUiStateStore.getState().ui.networkBrowserPanelUi.activeTabIndex,
      ).toBe(LLM_QUERY_TAB_INDEX)
      expect(handleClose).toHaveBeenCalled()
    })

    it('picks an f32 build on a GPU without shader-f16', async () => {
      vi.mocked(getWebGPUSupport).mockResolvedValue({
        supported: true,
        shaderF16: false,
        adapterName: 'Old GPU',
      })
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      selectProvider('webllm')
      const notice = await screen.findByTestId(
        'llm-query-options-webgpu-supported',
      )
      expect(notice.textContent).toContain('does not support 16-bit shaders')
      await waitFor(() =>
        expect(confirmButton()).toHaveProperty('disabled', false),
      )
      fireEvent.click(confirmButton())

      expect(startWebLLMModelLoad).toHaveBeenCalledWith(
        'Qwen2.5-3B-Instruct-q4f32_1-MLC',
      )
    })

    it('shows the load state of the stored model on reopen', async () => {
      act(() => {
        const state = useLLMQueryStore.getState()
        state.setLLMProvider('webllm')
        state.setLLMModel('Qwen2.5-3B-Instruct-q4f16_1-MLC')
        state.setWebLLMStatus({
          state: 'loading',
          modelId: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
          progress: 0.37,
          text: '',
        })
      })
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      const status = await screen.findByTestId(
        'llm-query-options-webllm-status',
      )
      expect(status.textContent).toBe('Loading: 37%')
    })

    it('unloads the in-browser model when another provider is confirmed', () => {
      render(<LLMQueryOptionsDialog open={true} handleClose={() => {}} />)

      fireEvent.click(confirmButton())

      expect(stopWebLLM).toHaveBeenCalled()
      expect(startWebLLMModelLoad).not.toHaveBeenCalled()
    })
  })
})
