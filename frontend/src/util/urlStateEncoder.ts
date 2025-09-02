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
 * Format: v7_{k}_{m}_{pattern}_{timing}_{piano}_{chords}
 * v7: Adds originalKey and originalMode to chord storage for edit functionality
 * v6: Adds volume, chorus, and delay controls
 * v5: Uses URI-encoded name~notes for robust, key-independent chord storage
 * v4: Uses chord indices + dot-separated patterns to preserve multi-character elements like "1+"
 * v3: Uses chord indices instead of lossy name encoding
 * v2: Legacy name-based encoding (maintained for compatibility)
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
    //console.log('Encoding state - addedChords:', addedChords.length, 'chords available:', chords?.length);
    
    if (!chords?.length || !availableKeys.length || !availableModes.length) {
        //console.log('Skipping encode due to missing data');
        return '';
    }
    
    try {
        // 1. Version identifier (v7 for original key/mode support)
        const version = 'v7';
        
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
        
        // 6. Piano settings (extended for v6)
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
        
        // v6 settings: Volume, Chorus, Delay: 0-1 -> 0-35 (base36)
        const volume = toBase36(Math.round(pianoSettings.volume * 35));
        const chorus = toBase36(Math.round(pianoSettings.chorusLevel * 35));
        const delay = toBase36(Math.round(pianoSettings.delayLevel * 35));
        
        const piano = `${inst}|${cutOff}|${eqBass}|${eqMid}|${eqTreble}|${octave}|${reverb}|${duration}|${volume}|${chorus}|${delay}`;
        
        // 7. Chords (using absolute name and notes for robustness + original key/mode for v7)
        const chordData = addedChords.map(ac => {
            const safeName = encodeURIComponent(ac.name);
            const safeNotes = encodeURIComponent(ac.notes);
            
            // v7: Add original key and mode indices if available
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
        const result = `${version}_${k}_${m}_${p}_${timing}_${piano}_${chordsStr}`;
        //console.log('Encoded state result:', result);
        return result;
        
    } catch (error) {
        console.error('Failed to encode state:', error);
        return '';
    }
};

/**
 * Decodes a state string back into application state
 * Handles v2, v3, v4, v5, v6, and v7 (with original key/mode support)
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
        //console.log('State parts:', parts);
        
        // Check version and handle v2, v3, v4, v5, v6, and v7
        const version = parts[0];
        if (!['v2', 'v3', 'v4', 'v5', 'v6', 'v7'].includes(version) || parts.length < 6) {
            console.log('Invalid state format or version');
            return null;
        }
        
        // 1. Key
        const keyIndex = fromBase36(parts[1] || '0');
        const key = availableKeys[keyIndex] || availableKeys[0];
        
        // 2. Mode  
        const modeIndex = fromBase36(parts[2] || '0');
        const mode = availableModes[modeIndex] || availableModes[0];
        
        // 3. Pattern (version-aware decoding)
        const patternStr = parts[3] || (version === 'v4' || version === 'v5' || version === 'v6' || version === 'v7' ? '1.2.3.4' : '1234');
        const pattern = (version === 'v4' || version === 'v5' || version === 'v6' || version === 'v7')
            ? patternStr.split('.').map(c => c === '0' ? 'x' : c)
            : patternStr.split('').map(c => c === '0' ? 'x' : c);
        
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
        
        // 5. Piano settings (version-aware for v6+ extensions)
        const pianoParts = (parts[5] || '').split('|');
        
        // Get default values for new v6+ fields
        const getDefaultPianoSettings = () => ({
            volume: 0.8, // 80% default volume
            chorusLevel: 0.0,
            delayLevel: 0.0
        });
        
        const defaults = getDefaultPianoSettings();
        
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
            // v6+ additions with defaults for older versions
            volume: (version === 'v6' || version === 'v7') ? fromBase36(pianoParts[8] || Math.round(defaults.volume * 35).toString(36)) / 35 : defaults.volume,
            chorusLevel: (version === 'v6' || version === 'v7') ? fromBase36(pianoParts[9] || '0') / 35 : defaults.chorusLevel,
            delayLevel: (version === 'v6' || version === 'v7') ? fromBase36(pianoParts[10] || '0') / 35 : defaults.delayLevel,
        };
        
        // 6. Chords
        const addedChords: AddedChord[] = [];
        const chordsPart = parts[6] || '';
        
        if (chordsPart) {
            const chordEntries = chordsPart.split('|').filter(Boolean);
            //console.log('Chord entries to decode:', chordEntries);
            
            for (const entry of chordEntries) {
                if (version === 'v5' || version === 'v6' || version === 'v7') {
                    // v5/v6/v7: {name}~{notes}[@origKey+origMode][:pattern]
                    const [chordIdPart, patternPart] = entry.split(':');
                    
                    // Parse original key/mode for v7
                    let chordDataPart = chordIdPart;
                    let originalKey: string | undefined;
                    let originalMode: string | undefined;
                    
                    if (version === 'v7' && chordIdPart.includes('@')) {
                        const [dataStr, origStr] = chordIdPart.split('@');
                        chordDataPart = dataStr;
                        
                        if (origStr.length >= 2) {
                            const origKeyIndex = fromBase36(origStr[0]);
                            const origModeIndex = fromBase36(origStr[1]);
                            originalKey = availableKeys[origKeyIndex]!;
                            originalMode = availableModes[origModeIndex];
                        }
                    }
                    
                    const [safeName, safeNotes] = chordDataPart.split('~');

                    if (safeName && safeNotes) {
                        const name = decodeURIComponent(safeName);
                        const notes = decodeURIComponent(safeNotes);
                        let chordPattern: string[];

                        if (patternPart) {
                            // Custom pattern for v5+ uses dot separator like v4
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
                        //console.log('Successfully decoded chord:', name);
                    } else {
                        console.warn('Invalid chord format:', entry);
                    }
                } else {
                    // Handle v2, v3, v4
                    let chordIndex: number;
                    let chordPattern: string[];
                    
                    if (entry.includes(':')) {
                        // Custom pattern: index:pattern (version-aware)
                        const [indexStr, patternStr_legacy] = entry.split(':');
                        chordIndex = fromBase36(indexStr);
                        chordPattern = version === 'v4'
                            ? patternStr_legacy.split('.').map(c => c === '0' ? 'x' : c)
                            : patternStr_legacy.split('').map(c => c === '0' ? 'x' : c);
                    } else {
                        // Uses global pattern
                        chordIndex = fromBase36(entry);
                        chordPattern = [...pattern];
                    }
                    
                    // Get the chord by index for v3/v4, or fall back to name matching for v2
                    let matchingChord: ModeScaleChordDto | undefined;
                    
                    if (version === 'v3' || version === 'v4') {
                        // v3/v4: Use direct index lookup
                        matchingChord = chords[chordIndex];
                    } else {
                        // v2 compatibility: Try to find by encoded name (fallback)
                        const encodedName = entry.includes(':') ? entry.split(':')[0] : entry;
                        matchingChord = chords.find(c => 
                            c.chordName && encodeChordNameLegacy(c.chordName) === encodedName
                        );
                    }
                    
                    if (matchingChord?.chordName && matchingChord?.chordNoteNames) {
                        addedChords.push({
                            name: matchingChord.chordName,
                            notes: matchingChord.chordNoteNames,
                            pattern: chordPattern,
                            // For legacy versions, assume they were added in current key/mode
                            originalKey: key,
                            originalMode: mode,
                            originalNotes: matchingChord.chordNoteNames
                        });
                        //console.log('Successfully decoded chord:', matchingChord.chordName);
                    } else {
                        console.warn('Could not find chord at index/name:', (version === 'v3' || version === 'v4') ? chordIndex : entry);
                    }
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
        
        //console.log('Decoded state result:', result);
        //console.log('Decoded addedChords:', addedChords.length);
        return result;
        
    } catch (error) {
        console.error('Failed to decode state:', error);
        return null;
    }
};

// Legacy chord name encoding for v2 compatibility
const encodeChordNameLegacy = (name: string): string => {
    return name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
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
    volume: 0.8, // 80% default volume
    chorusLevel: 0.0,
    delayLevel: 0.0
});

/**
 * Saves encoded state to URL search params
 */
export const saveStateToUrl = (encodedState: string, paramName: string = 's'): void => {
    if (encodedState) {
        const url = new URL(window.location.href);
        url.searchParams.set(paramName, encodedState);
        window.history.replaceState({}, '', url.toString());
        //console.log('URL updated with state:', encodedState);
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