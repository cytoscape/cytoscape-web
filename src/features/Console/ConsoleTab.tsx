import {
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useState } from 'react'

import { parseCommand } from './commandParser'
import { executeCommand } from './commandExecutor'
import {
  ConsoleEntryStatus,
  useConsoleStore,
} from './store'

const statusColor: Record<ConsoleEntryStatus, string> = {
  success: 'success.main',
  error: 'error.main',
  info: 'info.main',
  warning: 'warning.main',
}

const ConsoleTab = (): React.ReactElement => {
  const [input, setInput] = useState('')
  const addEntry = useConsoleStore((state) => state.addEntry)
  const clear = useConsoleStore((state) => state.clear)
  const entries = useConsoleStore((state) => state.entries)

  const runCommand = useCallback(() => {
    const parsed = parseCommand(input)
    if ('error' in parsed) {
      addEntry({
        command: input,
        status: 'error',
        output: [parsed.error],
      })
      return
    }

    const result = executeCommand(parsed)
    addEntry({
      command: parsed.raw,
      status: result.status,
      output: result.messages,
    })
    setInput('')
  }, [input, addEntry])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        p: 1,
        boxSizing: 'border-box',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
        <TextField
          size="small"
          fullWidth
          placeholder="Enter command (e.g., view fit content)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              runCommand()
            }
          }}
        />
        <Button variant="contained" onClick={runCommand}>
          Run
        </Button>
        <Button variant="outlined" onClick={clear}>
          Clear
        </Button>
      </Stack>
      <Divider />
      <Box sx={{ flexGrow: 1, overflowY: 'auto', mt: 1 }}>
        {entries.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No console history yet. Try commands like &quot;view fit content&quot; or
            &quot;node list nodeList=selected&quot;.
          </Typography>
        ) : (
          <List dense>
            {entries.map((entry) => (
              <ListItem
                key={entry.id}
                sx={{
                  alignItems: 'flex-start',
                  borderBottom: '1px solid #eee',
                }}
              >
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      sx={{ color: statusColor[entry.status], fontWeight: 600 }}
                    >
                      {entry.command}
                    </Typography>
                  }
                  secondary={
                    <Box component="span" sx={{ display: 'block', whiteSpace: 'pre-wrap' }}>
                      {entry.output.join('\n')}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  )
}

export default ConsoleTab
