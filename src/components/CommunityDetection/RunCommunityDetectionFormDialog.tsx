import InfoIcon from '@mui/icons-material/Info'
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  Select,
  SelectChangeEvent,
  TextField,
  Tooltip
} from '@mui/material'
import * as React from 'react'
import create from 'zustand'
import { AlgorithmEntry } from './CommunityDetectionAlgorithmModel'

interface RunCommunityDetectionFormDialogProps {
  open: boolean
}

const useRunCommunityDetectionFormDialogStore =
  create<RunCommunityDetectionFormDialogProps>((set) => ({
    open: false,
  }))

export const runCommunityDetectionFormDialog = (open: boolean): void => {
  useRunCommunityDetectionFormDialogStore.setState({
    open,
  })
}

const formatKey = (algorithm: string, key: string): string => {
  return `cd.${algorithm}.${key}`
}

export const RunCommunityDetectionFormDialog: React.FC = () => {
  const { open } = useRunCommunityDetectionFormDialogStore()

  const [algorithms, setAlgorithms] = React.useState<AlgorithmEntry[]>([])
  const [parameters, setParameters] = React.useState<React.ReactElement[]>([])
  const [parameterMapping, setParameterMapping] = React.useState(
    new Map<string, any>(),
  )

  const handleTextFieldChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void => {
    parameterMapping.set(event.target.id, event.target.value)
    const regex = /^[0-9\b]+$/

    Object.values(algorithms).forEach((a) => {
      a.customParameters
        .filter(
          (b) =>
            event.target.id.includes(a.name) &&
            event.target.id.includes(b.name),
        )
        .forEach((b) => {
          console.log(`validationType: ${String(b.validationType)}, validationRegex: ${String(b.validationRegex)}`)

          let ret = false
          if (b.validationType != null) {
            switch (b.validationType) {
              case 'number':
                ret = regex.test(event.target.value)
                break
              case 'value':
                ret =
                  event.target.value === '' || regex.test(event.target.value)
                break
            }
          }
          const key = `${formatKey(a.name, b.name)}.valid`
          console.log(`setting ${key} to ${String(ret)}`)
          parameterMapping.set(key, ret)
        })
    })
  }

  const handleCheckboxChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    parameterMapping.set(event.target.id, event.target.checked)
  }

  const drawInputParameters = (name: string) => (): React.ReactElement[] => {
    parameterMapping.clear()
    const fields: React.ReactElement[] = []

    Object.values(algorithms)
      .filter((a) => a.name === name)
      .forEach((a) => {
        parameterMapping.set('cd.algorithm', a.name)
        parameterMapping.set('cd.weight-column', '')
        a.customParameters.forEach((p) => {
          parameterMapping.set(
            formatKey(a.name, p.name),
            p.defaultValue != null ? p.defaultValue : '',
          )
          fields.push(<Divider key={p.name + '-divider'} />)
          switch (p.type) {
            case 'value': {
              fields.push(
                <TextField
                  variant="outlined"
                  key={p.name}
                  id={formatKey(a.name, p.name)}
                  required
                  error={parameterMapping.get(
                    `${formatKey(a.name, p.name)}.valid`,
                  )}
                  label={p.displayName}
                  onChange={handleTextFieldChange}
                  defaultValue={p.defaultValue != null ? p.defaultValue : ''}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={p.description}>
                          <InfoIcon />
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />,
              )
              break
            }
            case 'flag': {
              fields.push(
                <FormControlLabel
                  key={`${p.name}control-label`}
                  control={
                    <Checkbox
                      key={p.name}
                      id={formatKey(a.name, p.name)}
                      onChange={handleCheckboxChange}
                    />
                  }
                  label={p.displayName}
                />,
              )
              break
            }
          }
        })
      })
    return fields
  }

  const handleWeightColumnChange = (event: SelectChangeEvent): void => {
    parameterMapping.set('cd.weight-column', event.target.value)
  }

  const handleAlgorithmChange = (event: SelectChangeEvent): void => {
    setParameters(drawInputParameters(event.target.value))
  }

  const onClose = (): void => {
    useRunCommunityDetectionFormDialogStore.setState({ open: false })
    setParameters(drawInputParameters('None'))
  }

  const onSubmit = (event: React.FormEvent): void => {
    console.log(parameterMapping)

    const algorithm = String(parameterMapping.get('cd.algorithm'))
    const weightColumn = String(parameterMapping.get('cd.weight-column'))

    const map = {
      algorithm,
      data: "1\t2\n1\t3\n2\t3\n",
      customParameters: {},
    }

    parameterMapping.forEach((v, k) => {
      const trimmedKey = k.split('cd.' + algorithm + '.')[1]
      if (trimmedKey != null && trimmedKey !== '' && v != null && v !== '') {
        // console.log('trimmedKey: ' + trimmedKey + ', value: ' + String(v))
        map.customParameters[trimmedKey] = String(v)
      }
    })

    console.log(JSON.stringify(map))

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    const requestOptions = {
      method: 'POST',
      body: JSON.stringify(map),
      headers,
    }

    fetch(
      'http://cdservice.cytoscape.org/cd/communitydetection/v1',
      requestOptions,
    )
      .then((res) => res.json())
      .then((data) => {
        console.log(data)
        const jobId = String(data.id)

        const intervalId = window.setInterval(function () {

          const statusUrl = `http://cdservice.cytoscape.org/cd/communitydetection/v1/${jobId}/status`
          console.log(`statusUrl: ${statusUrl}`)

          fetch(statusUrl, {
            method: 'GET',
            headers
          })
            .then((res) => res.json())
            .then((statusData) => {
              console.log(statusData)
              const status = statusData.status
              // Object { id: "5a30a2f6-9eda-4167-a260-b4d7f01aecd8", status: "failed", message: "Received non zero exit code: 1 when running algorithm for task: 5a30a2f6-9eda-4167-a260-b4d7f01aecd8", progress: 100, wallTime: 2524, startTime: 1675692565411 }
              switch (status) {
                case 'complete':
                case 'failed':
                  console.log(`stopping task: ${jobId}`)
                  clearInterval(intervalId)
                  break;
                case 'submitted':
                case 'processing':
                  // do nothing???
                  break;
              }
            })
            .catch((err) => {
              console.log(err.message)
            })

        }, 5000)
        console.log(`intervalId: ${intervalId}`)

      })
      .catch((err) => {
        console.log(err.message)
      })

    useRunCommunityDetectionFormDialogStore.setState({ open: false })
  }

  const getAlgorithms = (): void => {
    const requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }

    fetch(
      'http://cdservice.cytoscape.org/cd/communitydetection/v1/algorithms',
      requestOptions,
    )
      .then((res) => res.json())
      .then((data) => {
        setAlgorithms(Object.values(data)[0] as AlgorithmEntry[])
      })
      .catch((err) => {
        console.log(err.message)
      })
  }

  React.useEffect(() => {
    getAlgorithms()
  }, [])

  return (
    <div>
      <Dialog open={open} onClose={close}>
        <DialogTitle>Run Community Detection</DialogTitle>
        <DialogContent>
          <DialogContentText></DialogContentText>
          <Box
            autoComplete="off"
            component="form"
            sx={{ '& > :not(style)': { m: 1 } }}
          >
            <InputLabel id="algorithm-select-label">Algorithm</InputLabel>
            <Select
              native
              labelId="algorithm-select-label"
              onChange={handleAlgorithmChange}
            >
              <option key="">None</option>
              {Object.values(algorithms)
                .filter((e) => e.inputDataFormat.includes('EDGELIST'))
                .map((e) => {
                  return (
                    <option key={e.name} value={e.name}>
                      {e.displayName}
                    </option>
                  )
                })}
            </Select>
          </Box>
          <Box
            autoComplete="off"
            component="form"
            sx={{ '& > :not(style)': { m: 1 } }}
          >
            <InputLabel id="weight-column-select-label">
              Weight Column
            </InputLabel>
            <Select
              native
              labelId="weight-column-select-label"
              onChange={handleWeightColumnChange}
            >
              <option key="none">(none)</option>
              <option key="scoreAverage">Score Average</option>
            </Select>
          </Box>
          <Box
            autoComplete="off"
            component="form"
            sx={{ '& > :not(style)': { m: 1 } }}
          >
            {parameters}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit}>Run</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
