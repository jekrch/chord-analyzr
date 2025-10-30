export interface AddedChord {
    name: string;
    notes: string;
    pattern: string[];
    originalKey: string;  
    originalMode?: string; 
    originalNotes?: string; 
}

export interface ModeScaleChordDto {
    chordName?: string;
    chordNoteNames?: string;
}

export interface PianoSettings {
    instrumentName: string;
    cutOffPreviousNotes: boolean;
    eq: {
        bass: number;
        mid: number;
        treble: number;
    };
    octaveOffset: number;
    reverbLevel: number;
    noteDuration: number;
    volume: number;
    chorusLevel: number;
    delayLevel: number;
    distortionLevel: number;
    bitcrusherLevel: number;
    phaserLevel: number;
    flangerLevel: number;
    ringModLevel: number;
    autoFilterLevel: number;
    tremoloLevel: number;
    stereoWidthLevel: number;
    compressorLevel: number;
}

export interface EncodedState {
    key: string;
    mode: string;
    pattern: string[];
    bpm: number;
    subdivision: number;
    swing: number;
    showPattern: boolean;
    liveMode: boolean;
    addedChords: AddedChord[];
    pianoSettings: PianoSettings;
}

// Base36 encoding for compact representation
const toBase36 = (num: number): string => Math.max(0, Math.round(num)).toString(36);
const fromBase36 = (str: string): number => parseInt(str, 36) || 0;

/**
 * Encodes application state into a robust URL-safe string
 * Format: v8_{k}_{m}_{pattern}_{timing}_{piano}_{chords}
 */
export const encodeState = (
    key: string,
    mode: string,
    addedChords: AddedChord[],
    globalPattern: string[],
    bpm: number,
    subdivision: number,
    swing: number,
    showPattern: boolean,
    liveMode: boolean,
    pianoSettings: PianoSettings,
    availableKeys: string[],
    availableModes: string[],
    availableInstruments: string[],
    chords: ModeScaleChordDto[] | undefined
): string => {
    if (!chords?.length || !availableKeys.length || !availableModes.length) {
        return '';
    }
    
    try {
        // 1. Version identifier - bumped to v8 for new effects
        const version = 'v8';
        
        // 2. Key (index in available keys)
        const keyIndex = availableKeys.indexOf(key);
        const k = toBase36(Math.max(0, keyIndex));
        
        // 3. Mode (index in available modes)
        const modeIndex = availableModes.indexOf(mode);
        const m = toBase36(Math.max(0, modeIndex));
        
        // 4. Global pattern (using . as separator to preserve multi-char elements like 1+)
        const p = globalPattern.slice(0, 16)
            .map(step => step.replace(/[xX]/gi, '0'))
            .join('.');
        
        // 5. Timing settings (BPM|subdivision|swing|flags)
        const bpmClamped = Math.max(60, Math.min(200, bpm));
        const bpmEncoded = toBase36(bpmClamped - 60);
        
        const subMap: { [key: number]: string } = {
            0.125: '0', 0.25: '1', 0.5: '2', 1.0: '3', 2.0: '4'
        };
        const sub = subMap[subdivision] || '1';
        
        const swingClamped = Math.max(0, Math.min(50, swing));
        const swingEncoded = toBase36(swingClamped);
        
        const flags = (showPattern ? 2 : 0) + (liveMode ? 1 : 0);
        const f = toBase36(flags);
        
        const timing = `${bpmEncoded}|${sub}|${swingEncoded}|${f}`;
        
        // 6. Piano settings (EXPANDED with new effects)
        const instrumentIndex = availableInstruments.indexOf(pianoSettings.instrumentName);
        const inst = toBase36(Math.max(0, instrumentIndex));
        
        const cutOff = pianoSettings.cutOffPreviousNotes ? '1' : '0';
        
        // EQ: -24 to +24 -> 0 to 48
        const eqBass = toBase36(Math.round(pianoSettings.eq.bass) + 24);
        const eqMid = toBase36(Math.round(pianoSettings.eq.mid) + 24);
        const eqTreble = toBase36(Math.round(pianoSettings.eq.treble) + 24);
        
        // Octave: -3 to +3 -> 0 to 6
        const octave = toBase36(pianoSettings.octaveOffset + 3);
        
        // All effects: 0-1 -> 0-35 (base36)
        const reverb = toBase36(Math.round(pianoSettings.reverbLevel * 35));
        const volume = toBase36(Math.round(pianoSettings.volume * 35));
        const chorus = toBase36(Math.round(pianoSettings.chorusLevel * 35));
        const delay = toBase36(Math.round(pianoSettings.delayLevel * 35));
        
        // NEW EFFECTS
        const distortion = toBase36(Math.round(pianoSettings.distortionLevel * 35));
        const bitcrusher = toBase36(Math.round(pianoSettings.bitcrusherLevel * 35));
        const phaser = toBase36(Math.round(pianoSettings.phaserLevel * 35));
        const flanger = toBase36(Math.round(pianoSettings.flangerLevel * 35));
        const ringMod = toBase36(Math.round(pianoSettings.ringModLevel * 35));
        const autoFilter = toBase36(Math.round(pianoSettings.autoFilterLevel * 35));
        const tremolo = toBase36(Math.round(pianoSettings.tremoloLevel * 35));
        const stereoWidth = toBase36(Math.round(pianoSettings.stereoWidthLevel * 35));
        const compressor = toBase36(Math.round(pianoSettings.compressorLevel * 35));
        
        // Duration: 0.1-1.0 -> 1-10 -> 0-9
        const duration = toBase36(Math.max(0, Math.round(pianoSettings.noteDuration * 10) - 1));
        
        const piano = `${inst}|${cutOff}|${eqBass}|${eqMid}|${eqTreble}|${octave}|${reverb}|${duration}|${volume}|${chorus}|${delay}|${distortion}|${bitcrusher}|${phaser}|${flanger}|${ringMod}|${autoFilter}|${tremolo}|${stereoWidth}|${compressor}`;
        
        // 7. Chords (using absolute name and notes + original key/mode)
        const chordData = addedChords.map(ac => {
            const safeName = encodeURIComponent(ac.name);
            const safeNotes = encodeURIComponent(ac.notes);
            
            // Add original key and mode indices if available
            let chordId = `${safeName}~${safeNotes}`;
            
            if (ac.originalKey && ac.originalMode) {
                const origKeyIndex = availableKeys.indexOf(ac.originalKey);
                const origModeIndex = availableModes.indexOf(ac.originalMode);
                if (origKeyIndex >= 0 && origModeIndex >= 0) {
                    chordId += `@${toBase36(origKeyIndex)}${toBase36(origModeIndex)}`;
                }
            }
            
            // Compare chord pattern to global pattern
            const chordPatternStr = ac.pattern.map(step => step.replace(/[xX]/gi, '0')).join('.');
            const globalPatternStr = globalPattern.map(step => step.replace(/[xX]/gi, '0')).join('.');
            
            if (chordPatternStr === globalPatternStr) {
                return chordId; // Just the ID
            } else {
                // Custom pattern: id:pattern
                const customPattern = ac.pattern.slice(0, 16)
                    .map(step => step.replace(/[xX]/gi, '0'))
                    .join('.');
                return `${chordId}:${customPattern}`;
            }
        }).filter(Boolean);
        
        const chordsStr = chordData.join('|');
        
        // Final format: version_key_mode_pattern_timing_piano_chords
        return `${version}_${k}_${m}_${p}_${timing}_${piano}_${chordsStr}`;
        
    } catch (error) {
        console.error('Failed to encode state:', error);
        return '';
    }
};

/**
 * Decodes a v7/v8 state string back into application state
 */
export const decodeState = (
    state: string,
    availableKeys: string[],
    availableModes: string[],
    availableInstruments: string[],
    chords: ModeScaleChordDto[] | undefined
): EncodedState | null => {
    console.log('Decoding state:', state);
    
    if (!state || !chords?.length || !availableKeys.length || !availableModes.length) {
        console.log('Cannot decode - missing data');
        return null;
    }
    
    try {
        const parts = state.split('_');
        
        // Check version - support v7 (old) and v8 (new)
        const version = parts[0];
        if ((version !== 'v7' && version !== 'v8') || parts.length < 6) {
            console.log('Invalid state format - only v7/v8 supported');
            return null;
        }
        
        // 1. Key
        const keyIndex = fromBase36(parts[1] || '0');
        const key = availableKeys[keyIndex] || availableKeys[0];
        
        // 2. Mode  
        const modeIndex = fromBase36(parts[2] || '0');
        const mode = availableModes[modeIndex] || availableModes[0];
        
        // 3. Pattern (dot-separated)
        const patternStr = parts[3] || '1.2.3.4';
        const pattern = patternStr.split('.').map(c => c === '0' ? 'x' : c);
        
        // 4. Timing
        const timingParts = (parts[4] || '').split('|');
        const bpm = fromBase36(timingParts[0] || '60') + 60;
        
        const subdivisionMap: { [key: string]: number } = {
            '0': 0.125, '1': 0.25, '2': 0.5, '3': 1.0, '4': 2.0
        };
        const subdivision = subdivisionMap[timingParts[1] || '1'] || 0.25;
        const swing = fromBase36(timingParts[2] || '0');
        
        const flags = fromBase36(timingParts[3] || '0');
        const showPattern = (flags & 2) !== 0;
        const liveMode = (flags & 1) !== 0;
        
        // 5. Piano settings
        const pianoParts = (parts[5] || '').split('|');
        
        const pianoSettings: PianoSettings = {
            instrumentName: availableInstruments[fromBase36(pianoParts[0] || '0')] || availableInstruments[0] || 'electric_piano_1',
            cutOffPreviousNotes: (pianoParts[1] || '1') === '1',
            eq: {
                bass: fromBase36(pianoParts[2] || 'o') - 24, // 'o' is 24 in base36
                mid: fromBase36(pianoParts[3] || 'o') - 24,
                treble: fromBase36(pianoParts[4] || 'o') - 24,
            },
            octaveOffset: fromBase36(pianoParts[5] || '3') - 3,
            reverbLevel: fromBase36(pianoParts[6] || '0') / 35,
            noteDuration: (fromBase36(pianoParts[7] || '7') + 1) / 10, // Default 0.8
            volume: fromBase36(pianoParts[8] || 'p') / 35, // 'p' is ~28 in base36 (~0.8)
            chorusLevel: fromBase36(pianoParts[9] || '0') / 35,
            delayLevel: fromBase36(pianoParts[10] || '0') / 35,
            // NEW EFFECTS (v8) - defaults to 0 for v7
            distortionLevel: version === 'v8' ? fromBase36(pianoParts[11] || '0') / 35 : 0,
            bitcrusherLevel: version === 'v8' ? fromBase36(pianoParts[12] || '0') / 35 : 0,
            phaserLevel: version === 'v8' ? fromBase36(pianoParts[13] || '0') / 35 : 0,
            flangerLevel: version === 'v8' ? fromBase36(pianoParts[14] || '0') / 35 : 0,
            ringModLevel: version === 'v8' ? fromBase36(pianoParts[15] || '0') / 35 : 0,
            autoFilterLevel: version === 'v8' ? fromBase36(pianoParts[16] || '0') / 35 : 0,
            tremoloLevel: version === 'v8' ? fromBase36(pianoParts[17] || '0') / 35 : 0,
            stereoWidthLevel: version === 'v8' ? fromBase36(pianoParts[18] || '0') / 35 : 0,
            compressorLevel: version === 'v8' ? fromBase36(pianoParts[19] || '0') / 35 : 0,
        };
        
        // 6. Chords (v7/v8 format: {name}~{notes}[@origKey+origMode][:pattern])
        const addedChords: AddedChord[] = [];
        const chordsPart = parts[6] || '';
        
        if (chordsPart) {
            const chordEntries = chordsPart.split('|').filter(Boolean);
            
            for (const entry of chordEntries) {
                const [chordIdPart, patternPart] = entry.split(':');
                
                // Parse original key/mode
                let chordDataPart = chordIdPart;
                let originalKey: string | undefined;
                let originalMode: string | undefined;
                
                if (chordIdPart.includes('@')) {
                    const [dataStr, origStr] = chordIdPart.split('@');
                    chordDataPart = dataStr;
                    
                    if (origStr.length >= 2) {
                        const origKeyIndex = fromBase36(origStr[0]);
                        const origModeIndex = fromBase36(origStr[1]);
                        originalKey = availableKeys[origKeyIndex];
                        originalMode = availableModes[origModeIndex];
                    }
                }
                
                const [safeName, safeNotes] = chordDataPart.split('~');

                if (safeName && safeNotes) {
                    const name = decodeURIComponent(safeName);
                    const notes = decodeURIComponent(safeNotes);
                    let chordPattern: string[];

                    if (patternPart) {
                        // Custom pattern (dot-separated)
                        chordPattern = patternPart.split('.').map(c => c === '0' ? 'x' : c);
                    } else {
                        // No custom pattern, use the global pattern
                        chordPattern = [...pattern]; 
                    }

                    const addedChord: AddedChord = {
                        name,
                        notes,
                        pattern: chordPattern,
                        originalKey: originalKey || key, // Fallback to current key if not provided
                        originalMode,
                        originalNotes: notes // Store original notes
                    };

                    addedChords.push(addedChord);
                } else {
                    console.warn('Invalid chord format:', entry);
                }
            }
        }
        
        return {
            key,
            mode,
            pattern,
            bpm,
            subdivision,
            swing,
            showPattern,
            liveMode,
            addedChords,
            pianoSettings
        };
        
    } catch (error) {
        console.error('Failed to decode state:', error);
        return null;
    }
};

/**
 * Default piano settings
 */
const getDefaultPianoSettings = (availableInstruments: string[]): PianoSettings => ({
    instrumentName: availableInstruments[0] || 'electric_piano_1',
    cutOffPreviousNotes: true,
    eq: { bass: 0, mid: 0, treble: 0 },
    octaveOffset: 0,
    reverbLevel: 0.0,
    noteDuration: 0.8,
    volume: 0.8,
    chorusLevel: 0.0,
    delayLevel: 0.0,
    distortionLevel: 0.0,
    bitcrusherLevel: 0.0,
    phaserLevel: 0.0,
    flangerLevel: 0.0,
    ringModLevel: 0.0,
    autoFilterLevel: 0.0,
    tremoloLevel: 0.0,
    stereoWidthLevel: 0.0,
    compressorLevel: 0.0,
});

/**
 * Saves encoded state to URL search params
 */
export const saveStateToUrl = (encodedState: string, paramName: string = 's'): void => {
    if (encodedState) {
        const url = new URL(window.location.href);
        url.searchParams.set(paramName, encodedState);
        window.history.replaceState({}, '', url.toString());
    }
};

/**
 * Loads state from URL search params
 */
export const loadStateFromUrl = (paramName: string = 's'): string | null => {
    const url = new URL(window.location.href);
    return url.searchParams.get(paramName);
};

/**
 * Complete workflow: encode current state and save to URL
 */
export const encodeAndSaveToUrl = (
    key: string,
    mode: string,
    addedChords: AddedChord[],
    globalPattern: string[],
    bpm: number,
    subdivision: number,
    swing: number,
    showPattern: boolean,
    liveMode: boolean,
    pianoSettings: PianoSettings,
    availableKeys: string[],
    availableModes: string[],
    availableInstruments: string[],
    chords: ModeScaleChordDto[] | undefined,
    paramName: string = 's'
): void => {
    const encoded = encodeState(
        key, mode, addedChords, globalPattern, bpm, subdivision, swing, 
        showPattern, liveMode, pianoSettings, availableKeys, availableModes, 
        availableInstruments, chords
    );
    saveStateToUrl(encoded, paramName);
};

/**
 * Complete workflow: load from URL and decode state
 */
export const loadAndDecodeFromUrl = (
    availableKeys: string[],
    availableModes: string[],
    availableInstruments: string[],
    chords: ModeScaleChordDto[] | undefined,
    paramName: string = 's'
): EncodedState | null => {
    const stateString = loadStateFromUrl(paramName);
    if (!stateString) return null;
    return decodeState(stateString, availableKeys, availableModes, availableInstruments, chords);
};