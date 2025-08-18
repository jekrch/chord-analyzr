// URL state management - ultra compact encoding
const KEYS = ['C','Cs','D','Ds','E','F','Fs','G','Gs','A','As','B'];
const MODES = ['Ionian','Dorian','Phrygian','Lydian','Mixolydian','Aeolian','Locrian'];

// Types for the state being encoded/decoded
export interface AddedChord {
    name: string;
    notes: string;
    pattern: string[];
}

export interface ModeScaleChordDto {
    chordName?: string;
    chordNoteNames?: string;
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
}

/**
 * Encodes application state into a compact URL-safe string
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
    chords: ModeScaleChordDto[] | undefined
): string => {
    if (!chords?.length) return '';
    
    // Encode key as index (handle sharp keys)
    const normalizedKey = key === 'C#' ? 'Cs' : 
                         key === 'D#' ? 'Ds' : 
                         key === 'F#' ? 'Fs' : 
                         key === 'G#' ? 'Gs' : 
                         key === 'A#' ? 'As' : key;
    const k = KEYS.indexOf(normalizedKey);
    
    // Encode mode as index
    const m = MODES.indexOf(mode);
    
    // Encode pattern (replace x/X with 0 for compactness)
    const p = globalPattern.length ? 
        globalPattern.join('').replace(/x/g,'0').replace(/X/g,'0') : '1234';
    
    // Encode BPM as tens (120 -> 12, clamped 1-99)
    const b = Math.max(1, Math.min(99, Math.round(bpm/10)));
    
    // Encode subdivision
    const s = subdivision === 0.25 ? '4' : subdivision === 0.5 ? '2' : '1';
    
    // Encode swing as tens (0-90 -> 0-9)
    const w = Math.max(0, Math.min(9, Math.round(swing/10)));
    
    // Encode flags (showPattern + liveMode as binary string)
    const f = (showPattern ? '1' : '0') + (liveMode ? '1' : '0');
    
    // Encode chords with names for reliability across mode changes
    const chordData = addedChords.map(ac => {
        const chordPattern = ac.pattern.join('').replace(/x/g,'0').replace(/X/g,'0');
        const globalPatternStr = globalPattern.join('').replace(/x/g,'0').replace(/X/g,'0');
        
        // Use chord name for reliable lookup across modes (sanitize for URL safety)
        const chordName = ac.name.replace(/[^a-zA-Z0-9]/g, '');
        
        // If chord uses global pattern, just store name; otherwise store name:pattern
        if (chordPattern === globalPatternStr) {
            return chordName;
        } else {
            return `${chordName}:${chordPattern}`;
        }
    });
    
    const ci = chordData.join('|');
    
    // Format BPM with leading zero if needed
    const bStr = b < 10 ? '0' + b : b.toString();
    
    return `${k}-${m}-${p}-${bStr}-${s}-${w}-${f}-${ci}`;
};

/**
 * Decodes a state string back into application state
 */
export const decodeState = (
    state: string,
    chords: ModeScaleChordDto[] | undefined
): EncodedState | null => {
    if (!state || !chords?.length) return null;
    
    try {
        const parts = state.split('-');
        if (parts.length < 7) return null;
        
        // Decode key from index
        const k = KEYS[parseInt(parts[0]) || 0];
        
        // Decode mode from index
        const m = MODES[parseInt(parts[1]) || 0];
        
        // Decode pattern (convert 0s back to x)
        const p = parts[2] || '1234';
        const globalPattern = p.split('').map(c => c === '0' ? 'x' : c);
        
        // Decode BPM (multiply by 10)
        const b = (parseInt(parts[3]) || 12) * 10;
        
        // Decode subdivision
        const s = parts[4] === '4' ? 0.25 : parts[4] === '2' ? 0.5 : 1;
        
        // Decode swing (multiply by 10)
        const w = (parseInt(parts[5]) || 0) * 10;
        
        // Decode flags
        const f = parts[6] || '00';
        const showPattern = f[0] === '1';
        const liveMode = f[1] === '1';
        
        // Decode chords by name (works across mode changes)
        const ci = parts[7] || '';
        const addedChords: AddedChord[] = [];
        
        if (ci) {
            const chordEntries = ci.split('|');
            for (const entry of chordEntries) {
                if (entry.includes(':')) {
                    // Chord with custom pattern: "name:pattern"
                    const [chordName, patternStr] = entry.split(':');
                    const chord = chords.find(c => 
                        c.chordName?.replace(/[^a-zA-Z0-9]/g, '') === chordName
                    );
                    if (chord) {
                        const customPattern = patternStr.split('').map(c => c === '0' ? 'x' : c);
                        addedChords.push({
                            name: chord.chordName!,
                            notes: chord.chordNoteNames!,
                            pattern: customPattern
                        });
                    }
                } else {
                    // Chord using global pattern: just "name"
                    const chord = chords.find(c => 
                        c.chordName?.replace(/[^a-zA-Z0-9]/g, '') === entry
                    );
                    if (chord) {
                        addedChords.push({
                            name: chord.chordName!,
                            notes: chord.chordNoteNames!,
                            pattern: [...globalPattern]
                        });
                    }
                }
            }
        }
        
        // Convert key back to standard format (handle sharps)
        const normalizedKey = k === 'Cs' ? 'C#' : 
                             k === 'Ds' ? 'D#' : 
                             k === 'Fs' ? 'F#' : 
                             k === 'Gs' ? 'G#' : 
                             k === 'As' ? 'A#' : k;
        
        return { 
            key: normalizedKey,
            mode: m, 
            pattern: globalPattern, 
            bpm: b, 
            subdivision: s, 
            swing: w, 
            showPattern, 
            liveMode, 
            addedChords 
        };
    } catch (error) {
        console.error('Failed to decode state:', error);
        return null;
    }
};

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
    chords: ModeScaleChordDto[] | undefined,
    paramName: string = 's'
): void => {
    const encoded = encodeState(
        key, mode, addedChords, globalPattern, bpm, 
        subdivision, swing, showPattern, liveMode, chords
    );
    saveStateToUrl(encoded, paramName);
};

/**
 * Complete workflow: load from URL and decode state
 */
export const loadAndDecodeFromUrl = (
    chords: ModeScaleChordDto[] | undefined,
    paramName: string = 's'
): EncodedState | null => {
    const stateString = loadStateFromUrl(paramName);
    if (!stateString) return null;
    return decodeState(stateString, chords);
};