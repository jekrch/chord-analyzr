import { Component, ChangeEvent } from 'react';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import Dropdown from '../components/Dropdown';
import InputLabel from '../components/InputLabel';
import PianoSettings from '../components/piano/PianoSettings';

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

interface EqSettings {
    bass: number;
    mid: number;
    treble: number;
}

interface PianoConfigProps {
    config: ConfigProps;
    setConfig: (config: Partial<ConfigProps>) => void;
    keyboardShortcuts: KeyboardShortcut[];
    instrumentList: string[];
    // Settings props
    cutOffPreviousNotes: boolean;
    setCutOffPreviousNotes: (value: boolean) => void;
    eq: EqSettings;
    setEq: (eq: EqSettings) => void;
    octaveOffset: number;
    setOctaveOffset: (offset: number) => void;
    reverbLevel: number;
    setReverbLevel: (level: number) => void;
    noteDuration: number;
    setNoteDuration: (duration: number) => void;
}

interface PianoConfigState {
    settingsOpen: boolean;
}

class PianoConfig extends Component<PianoConfigProps, PianoConfigState> {
    constructor(props: PianoConfigProps) {
        super(props);
        this.state = {
            settingsOpen: false
        };
    }
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
            <div>
                {/* Row 1: Centered dropdown and cog button */}
                <div className="flex justify-center items-end">
                    <div className="mr-2">
                        <div className="flex items-center space-x-2">
                            <InputLabel
                                value={'voice'}
                            />

                            <Dropdown
                                className="form-control mt-1"
                                value={this.props.config.instrumentName.replaceAll('_', ' ') || instrumentName.replaceAll('_', ' ')}
                                onChange={this.onChangeInstrument}
                                options={this.props.instrumentList.map((name) => name.replaceAll('_', ' '))}
                                showSearch={true}
                            />
                            <div className="mt-[0.2em]">
                            <button
                                onClick={() => this.setState({ settingsOpen: !this.state.settingsOpen })}
                                className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all duration-200 ${this.state.settingsOpen
                                        ? 'bg-[#4a5262] border-gray-600 text-slate-200'
                                        : 'bg-[#3d434f] border-gray-600 text-slate-400 hover:bg-[#4a5262] hover:border-gray-500 hover:text-slate-200'
                                    }`}
                                aria-label="Sound Settings"
                                aria-expanded={this.state.settingsOpen}
                            >
                                <Cog6ToothIcon className="w-4 h-4" />
                            </button>
                                            </div>

                        </div>
                    </div>
                </div>

                {/* Row 2: Centered settings panel */}
                <div className="flexx justify-center">
                    <PianoSettings
                        isOpen={this.state.settingsOpen}
                        cutOffPreviousNotes={this.props.cutOffPreviousNotes}
                        setCutOffPreviousNotes={this.props.setCutOffPreviousNotes}
                        eq={this.props.eq}
                        setEq={this.props.setEq}
                        octaveOffset={this.props.octaveOffset}
                        setOctaveOffset={this.props.setOctaveOffset}
                        reverbLevel={this.props.reverbLevel}
                        setReverbLevel={this.props.setReverbLevel}
                        noteDuration={this.props.noteDuration}
                        setNoteDuration={this.props.setNoteDuration}
                    />
                </div>
            </div>
        );
    }
}

export default PianoConfig;