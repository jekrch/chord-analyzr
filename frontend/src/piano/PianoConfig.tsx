import React, { Component, ChangeEvent } from 'react';
import { MidiNumbers } from 'react-piano';
import AutoblurSelect from './AutoblurSelect';
import Dropdown from '../components/Dropdown';
import InputLabel from '../components/InputLabel';

interface NoteRange {
    first: number;
    last: number;
}

interface ConfigProps {
    noteRange: NoteRange;
    keyboardShortcutOffset: number;
    instrumentName: string;
}

interface KeyboardShortcut {
    key: string;
    midiNumber: number;
}

interface PianoConfigProps {
    config: ConfigProps;
    setConfig: (config: Partial<ConfigProps>) => void;
    keyboardShortcuts: KeyboardShortcut[];
    instrumentList: string[];
}

class PianoConfig extends Component<PianoConfigProps> {
    componentDidMount() {
        window.addEventListener('keydown', this.handleKeyDown);
    }

    componentWillUnmount() {
        window.removeEventListener('keydown', this.handleKeyDown);
    }

    handleKeyDown = (event: KeyboardEvent) => {
        const { noteRange, keyboardShortcutOffset } = this.props.config;
        if (!noteRange) return;
        const numNotes = noteRange.last - noteRange.first + 1;
        const minOffset = 0;
        const maxOffset = numNotes - this.props.keyboardShortcuts.length;
        if (event.key === 'ArrowLeft') {
            const reducedOffset = keyboardShortcutOffset - 1;
            if (reducedOffset >= minOffset) {
                this.props.setConfig({
                    keyboardShortcutOffset: reducedOffset,
                });
            }
        } else if (event.key === 'ArrowRight') {
            const increasedOffset = keyboardShortcutOffset + 1;
            if (increasedOffset <= maxOffset) {
                this.props.setConfig({
                    keyboardShortcutOffset: increasedOffset,
                });
            }
        }
    };

    onChangeFirstNote = (event: ChangeEvent<HTMLSelectElement>) => {
        this.props.setConfig({
            noteRange: {
                first: parseInt(event.target.value, 10),
                last: this.props.config.noteRange.last,
            },
        });
    };

    onChangeLastNote = (event: ChangeEvent<HTMLSelectElement>) => {
        this.props.setConfig({
            noteRange: {
                first: this.props.config.noteRange.first,
                last: parseInt(event.target.value, 10),
            },
        });
    };

    onChangeInstrument = (value: any) => {
        this.props.setConfig({
            instrumentName: value.replaceAll(' ', '_'),
        });
    };

    render() {
        const { noteRange, instrumentName } = this.props.config;

        return (
            <div className="form-row">

                <div className="col-6">
                    <InputLabel
                        value={'voice'}
                    />
                    <Dropdown
                        className="form-control"
                        value={this.props.config.instrumentName.replaceAll('_', ' ') || instrumentName.replaceAll('_', ' ')}
                        onChange={this.onChangeInstrument}
                        options={this.props.instrumentList.map((name) => name.replaceAll('_', ' '))}
                        showSearch={true}
                    />
                </div>
            </div>
        );
    }
}


export default PianoConfig;
