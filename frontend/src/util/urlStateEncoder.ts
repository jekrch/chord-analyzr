// Enhanced URL state management - robust and readable encoding

export interface AddedChord {
    name: string;
    notes: string;
    pattern: string[];
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

// Safe chord name encoding (alphanumeric only)
const encodeChordName = (name: string): string => {
    return name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8); // Max 8 chars
};

/**
 * Encodes application state into a robust URL-safe string
 * Format: v2_{k}_{m}_{pattern}_{timing}_{piano}_{chords}
 * Uses _ as main separator and | for sub-separators to avoid conflicts
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
    console.log('Encoding state - addedChords:', addedChords.length, 'chords available:', chords?.length);
    
    if (!chords?.length || !availableKeys.length || !availableModes.length) {
        console.log('Skipping encode due to missing data');
        return '';
    }
    
    try {
        // 1. Version identifier
        const version = 'v2';
        
        // 2. Key (index in available keys)
        const keyIndex = availableKeys.indexOf(key);
        const k = toBase36(Math.max(0, keyIndex));
        
        // 3. Mode (index in available modes)
        const modeIndex = availableModes.indexOf(mode);
        const m = toBase36(Math.max(0, modeIndex));
        
        // 4. Global pattern (simplified, max 16 steps)
        const p = globalPattern.slice(0, 16)
            .join('')
            .replace(/[xX]/g, '0')
            .replace(/[^0-9a-zA-Z+]/g, ''); // Keep + for octave up
        
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
        
        // 6. Piano settings
        const instrumentIndex = availableInstruments.indexOf(pianoSettings.instrumentName);
        const inst = toBase36(Math.max(0, instrumentIndex));
        
        const cutOff = pianoSettings.cutOffPreviousNotes ? '1' : '0';
        
        // EQ: -24 to +24 -> 0 to 48
        const eqBass = toBase36(Math.round(pianoSettings.eq.bass) + 24);
        const eqMid = toBase36(Math.round(pianoSettings.eq.mid) + 24);
        const eqTreble = toBase36(Math.round(pianoSettings.eq.treble) + 24);
        
        // Octave: -3 to +3 -> 0 to 6
        const octave = toBase36(pianoSettings.octaveOffset + 3);
        
        // Reverb: 0-1 -> 0-35 (base36)
        const reverb = toBase36(Math.round(pianoSettings.reverbLevel * 35));
        
        // Duration: 0.1-1.0 -> 1-10 -> 0-9
        const duration = toBase36(Math.max(0, Math.round(pianoSettings.noteDuration * 10) - 1));
        
        const piano = `${inst}|${cutOff}|${eqBass}|${eqMid}|${eqTreble}|${octave}|${reverb}|${duration}`;
        
        // 7. Chords (name:pattern format, or just name if using global pattern)
        const chordData = addedChords.map(ac => {
            const encodedName = encodeChordName(ac.name);
            
            // Compare chord pattern to global pattern
            const chordPatternStr = ac.pattern.join('').replace(/[xX]/g, '0');
            const globalPatternStr = globalPattern.join('').replace(/[xX]/g, '0');
            
            if (chordPatternStr === globalPatternStr) {
                return encodedName; // Just the name
            } else {
                // Custom pattern: name:pattern
                const customPattern = ac.pattern.slice(0, 16)
                    .join('')
                    .replace(/[xX]/g, '0')
                    .replace(/[^0-9a-zA-Z+]/g, '');
                return `${encodedName}:${customPattern}`;
            }
        }).filter(Boolean);
        
        const chordsStr = chordData.join('|');
        
        // Final format: version_key_mode_pattern_timing_piano_chords
        const result = `${version}_${k}_${m}_${p}_${timing}_${piano}_${chordsStr}`;
        console.log('Encoded state result:', result);
        return result;
        
    } catch (error) {
        console.error('Failed to encode state:', error);
        return '';
    }
};

/**
 * Decodes a state string back into application state
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
        console.log('State parts:', parts);
        
        // Check version
        if (parts[0] !== 'v2' || parts.length < 6) {
            console.log('Invalid state format or version');
            return null;
        }
        
        // 1. Key
        const keyIndex = fromBase36(parts[1] || '0');
        const key = availableKeys[keyIndex] || availableKeys[0];
        
        // 2. Mode  
        const modeIndex = fromBase36(parts[2] || '0');
        const mode = availableModes[modeIndex] || availableModes[0];
        
        // 3. Pattern
        const patternStr = parts[3] || '1234';
        const pattern = patternStr.split('').map(c => c === '0' ? 'x' : c);
        
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
        };
        
        // 6. Chords
        const addedChords: AddedChord[] = [];
        const chordsPart = parts[6] || '';
        
        if (chordsPart) {
            const chordEntries = chordsPart.split('|').filter(Boolean);
            
            for (const entry of chordEntries) {
                let chordName: string;
                let chordPattern: string[];
                
                if (entry.includes(':')) {
                    // Custom pattern: name:pattern
                    const [encodedName, patternStr] = entry.split(':');
                    chordName = encodedName;
                    chordPattern = patternStr.split('').map(c => c === '0' ? 'x' : c);
                } else {
                    // Uses global pattern
                    chordName = entry;
                    chordPattern = [...pattern];
                }
                
                // Find the actual chord by matching the encoded name
                const matchingChord = chords.find(c => 
                    c.chordName && encodeChordName(c.chordName) === chordName
                );
                
                if (matchingChord?.chordName && matchingChord?.chordNoteNames) {
                    addedChords.push({
                        name: matchingChord.chordName,
                        notes: matchingChord.chordNoteNames,
                        pattern: chordPattern
                    });
                } else {
                    console.warn('Could not find chord for encoded name:', chordName);
                }
            }
        }
        
        const result = {
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
        
        console.log('Decoded state:', result);
        return result;
        
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
    noteDuration: 0.8
});

/**
 * Saves encoded state to URL search params
 */
export const saveStateToUrl = (encodedState: string, paramName: string = 's'): void => {
    if (encodedState) {
        const url = new URL(window.location.href);
        url.searchParams.set(paramName, encodedState);
        window.history.replaceState({}, '', url.toString());
        console.log('URL updated with state:', encodedState);
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