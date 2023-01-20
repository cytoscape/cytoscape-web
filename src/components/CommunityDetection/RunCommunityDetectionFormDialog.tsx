import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, FormControlLabel, InputLabel, Select, SelectChangeEvent, TextField } from '@mui/material';
import * as React from 'react';
import create from 'zustand';
import { AlgorithmEntry } from './CommunityDetectionAlgorithmModel';


interface RunCommunityDetectionFormDialogProps {
    open: boolean
}

const useRunCommunityDetectionFormDialogStore = create<RunCommunityDetectionFormDialogProps>((set) => ({
    open: false
}))

export const runCommunityDetectionFormDialog = (open: boolean): void => {
    useRunCommunityDetectionFormDialogStore.setState({
        open
    });
}

export const RunCommunityDetectionFormDialog: React.FC = () => {
    const { open } = useRunCommunityDetectionFormDialogStore();

    const [algorithms, setAlgorithms] = React.useState<AlgorithmEntry[]>([]);
    const [parameters, setParameters] = React.useState<React.ReactElement[]>([]);
    const [parameterMapping, setParameterMapping] = React.useState(new Map());


    const handleTextFieldChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        parameterMapping.set(event.target.id, event.target.value);
    }

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        parameterMapping.set(event.target.id, event.target.checked);
    }

    const formatKey = (algorithm: string, key: string): string => {
        return 'cd.' + algorithm + '.' + key;
    }

    const drawInputParameters = (name: string) => (): React.ReactElement[] => {
        parameterMapping.clear();
        const fields: React.ReactElement[] = [];

        Object.values(algorithms).filter(a => a.name === name).forEach(a => {
            parameterMapping.set('cd.algorithm', a.name);
            parameterMapping.set('cd.weight-column', '');
            a.customParameters.forEach(p => {
                parameterMapping.set(formatKey(a.name, p.name), p.defaultValue != null ? p.defaultValue : '');
                fields.push(<Divider key={p.name + '-divider'} />)
                switch (p.type) {
                    case 'value': {
                        fields.push(<TextField key={p.name} id={formatKey(a.name, p.name)} label={p.displayName} onChange={handleTextFieldChange} defaultValue={p.defaultValue != null ? p.defaultValue : ''} ></TextField >)
                        break;
                    }
                    case 'flag': {
                        fields.push(<FormControlLabel key={p.name + 'control-label'} control={<Checkbox key={p.name} id={formatKey(a.name, p.name)} onChange={handleCheckboxChange} />} label={p.displayName} />)
                        break;
                    }
                }
            })
        })
        return fields;
    }

    const handleWeightColumnChange = (event: SelectChangeEvent): void => {
        parameterMapping.set('cd.weight-column', event.target.value);
    }

    const handleAlgorithmChange = (event: SelectChangeEvent): void => {
        setParameters(drawInputParameters(event.target.value));
    }

    const onClose = (): void => {
        useRunCommunityDetectionFormDialogStore.setState({ open: false });
        setParameters(drawInputParameters('None'));
    }

    const onSubmit = (event: React.FormEvent): void => {
        console.log(parameterMapping);

        useRunCommunityDetectionFormDialogStore.setState({ open: false });
    }

    const getAlgorithms = (): void => {
        fetch('http://cdservice.cytoscape.org/cd/communitydetection/v1/algorithms', {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        })
            .then((res) => res.json())
            .then((data) => {
                // console.log(data);
                // console.log(Object.values(data)[0]);
                setAlgorithms(Object.values(data)[0] as AlgorithmEntry[]);
            })
            .catch((err) => {
                console.log(err.message);
            });
    }

    React.useEffect(() => {
        getAlgorithms();
    }, []);

    return (
        <div>
            <Dialog open={open} onClose={close}>
                <DialogTitle>Run Community Detection</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                    </DialogContentText>
                    <Box autoComplete="off" noValidate component="form" sx={{ '& > :not(style)': { m: 1 }, }}>
                        <InputLabel id='algorithm-select-label'>Algorithm</InputLabel>
                        <Select native labelId='algorithm-select-label' onChange={handleAlgorithmChange}>
                            <option key=''>None</option>
                            {
                                Object.values(algorithms).filter(e => e.inputDataFormat.includes('EDGELIST')).map(e => {
                                    return (<option key={e.name} value={e.name}>{e.displayName}</option>);
                                })
                            }
                        </Select>
                    </Box>
                    <Box autoComplete="off" noValidate component="form" sx={{ '& > :not(style)': { m: 1 }, }}>
                        <InputLabel id='weight-column-select-label'>Weight Column</InputLabel>
                        <Select native labelId='weight-column-select-label' onChange={handleWeightColumnChange}>
                            <option key='none'>(none)</option>
                            <option key='scoreAverage'>Score Average</option>
                        </Select>
                    </Box>
                    <Box autoComplete="off" noValidate component="form" sx={{ '& > :not(style)': { m: 1 }, }}>
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

