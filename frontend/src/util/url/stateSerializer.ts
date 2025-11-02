import { dynamicChordGenerator } from "../../services/DynamicChordService";
import {
    AddedChord,
    ChordTypesMap,
    ModeScaleChordDto,
    PianoSettings,
    EncodedState,
    VERSION,
    LIMITS
} from './types';
import {
    toBase36,
    fromBase36,
    generateChordTypeCodes,
    encodeChordName,
    decodeChordName,
    encodeChordNotes,
    decodeChordNotes,
    encodeTiming,
    decodeTiming,
    encodePianoSettings,
    decodePianoSettings,
    normalizePattern,
    parseChordNameForGeneration
} from './encoders';

// ============================================================================
// MAIN ENCODE FUNCTION
// ============================================================================

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
    chords: ModeScaleChordDto[] | undefined,
    chordTypes: ChordTypesMap
): string => {
    if (!chords?.length || !availableKeys.length || !availableModes.length) {
        return '';
    }

    try {
        const { typeToCode } = generateChordTypeCodes(chordTypes);

        // 1. Version
        const version = VERSION;

        // 2. Key
        const keyIndex = availableKeys.indexOf(key);
        const k = toBase36(Math.max(0, keyIndex));

        // 3. Mode
        const modeIndex = availableModes.indexOf(mode);
        const m = toBase36(Math.max(0, modeIndex));

        // 4. Pattern
        const p = globalPattern
            .slice(0, LIMITS.PATTERN_MAX_LENGTH)
            .map(step => step.replace(/[xX]/gi, '0'))
            .join('.');

        // 5. Timing
        const timing = encodeTiming(bpm, subdivision, swing, showPattern, liveMode);

        // 6. Piano settings
        const piano = encodePianoSettings(pianoSettings, availableInstruments);

        // 7. Chords
        const chordsStr = encodeChords(
            addedChords,
            globalPattern,
            availableKeys,
            availableModes,
            typeToCode
        );

        return `${version}_${k}_${m}_${p}_${timing}_${piano}_${chordsStr}`;

    } catch (error) {
        console.error('Failed to encode state:', error);
        return '';
    }
};

// ============================================================================
// MAIN DECODE FUNCTION
// ============================================================================

export const decodeState = async (
    state: string,
    availableKeys: string[],
    availableModes: string[],
    availableInstruments: string[],
    chords: ModeScaleChordDto[] | undefined,
    chordTypes: ChordTypesMap
): Promise<EncodedState | null> => {
    console.log('Decoding state:', state);

    if (!state || !chords?.length || !availableKeys.length || !availableModes.length) {
        console.log('Cannot decode - missing data');
        return null;
    }

    try {
        const parts = state.split('_');
        const version = parts[0];

        if (!['v7', 'v8', 'v9'].includes(version) || parts.length < 6) {
            console.log('Invalid state format - only v7/v8/v9 supported');
            return null;
        }

        const { codeToType } = generateChordTypeCodes(chordTypes);

        // 1. Key
        const keyIndex = fromBase36(parts[1] || '0');
        const key = availableKeys[keyIndex] || availableKeys[0];

        // 2. Mode
        const modeIndex = fromBase36(parts[2] || '0');
        const mode = availableModes[modeIndex] || availableModes[0];

        // 3. Pattern
        const patternStr = parts[3] || '1.2.3.4';
        const pattern = patternStr.split('.').map(c => c === '0' ? 'x' : c);

        // 4. Timing
        const timing = decodeTiming(parts[4] || '');

        // 5. Piano settings
        const pianoSettings = decodePianoSettings(parts[5] || '', availableInstruments, version);

        // 6. Chords
        const addedChords = await decodeChords(
            parts[6] || '',
            pattern,
            key,
            mode,
            availableKeys,
            availableModes,
            version,
            codeToType
        );

        return {
            key,
            mode,
            pattern,
            ...timing,
            addedChords,
            pianoSettings
        };

    } catch (error) {
        console.error('Failed to decode state:', error);
        return null;
    }
};

// ============================================================================
// CHORD ENCODING HELPER
// ============================================================================

function encodeChords(
    addedChords: AddedChord[],
    globalPattern: string[],
    availableKeys: string[],
    availableModes: string[],
    typeToCode: Record<string, string>
): string {
    const globalPatternNormalized = normalizePattern(globalPattern);
    
    const chordData = addedChords.map(ac => {
        const compactName = encodeChordName(ac.name, typeToCode);
        if (!compactName) {
            console.warn('Failed to encode chord name:', ac.name);
            return '';
        }

        const compactNotes = encodeChordNotes(ac.notes);
        if (!compactNotes) {
            console.warn('Failed to encode notes:', ac.notes);
            return '';
        }

        let chordId = `${compactName}n${compactNotes}`;

        // Add original key/mode if available
        if (ac.originalKey && ac.originalMode) {
            const origKeyIndex = availableKeys.indexOf(ac.originalKey);
            const origModeIndex = availableModes.indexOf(ac.originalMode);
            if (origKeyIndex >= 0 && origModeIndex >= 0) {
                chordId += `k${toBase36(origKeyIndex)}${toBase36(origModeIndex)}`;
            }
        }

        // Add custom pattern if different from global
        const chordPatternNormalized = normalizePattern(ac.pattern);
        if (chordPatternNormalized !== globalPatternNormalized) {
            const customPattern = ac.pattern
                .slice(0, LIMITS.PATTERN_MAX_LENGTH)
                .map(step => step.replace(/[xX]/gi, '0'))
                .join('.');
            return `${chordId}p${customPattern}`;
        }

        return chordId;
    }).filter(Boolean);

    return chordData.join(',');
}

// ============================================================================
// CHORD DECODING HELPER
// ============================================================================

async function decodeChords(
    chordsPart: string,
    globalPattern: string[],
    key: string,
    mode: string,
    availableKeys: string[],
    availableModes: string[],
    version: string,
    codeToType: Record<string, string>
): Promise<AddedChord[]> {
    if (!chordsPart) return [];

    const addedChords: AddedChord[] = [];
    const chordEntries = chordsPart.split(/[,|]/).filter(Boolean);

    for (const entry of chordEntries) {
        const decoded = await decodeChordEntry(
            entry,
            globalPattern,
            key,
            mode,
            availableKeys,
            availableModes,
            version,
            codeToType
        );

        if (decoded) {
            addedChords.push(decoded);
        }
    }

    return addedChords;
}

// ============================================================================
// INDIVIDUAL CHORD ENTRY DECODING
// ============================================================================

async function decodeChordEntry(
    entry: string,
    globalPattern: string[],
    key: string,
    mode: string,
    availableKeys: string[],
    availableModes: string[],
    version: string,
    codeToType: Record<string, string>
): Promise<AddedChord | null> {
    // Parse pattern (support both 'p' prefix and legacy ':' separator)
    let chordIdPart: string;
    let patternPart: string | undefined;

    if (entry.includes('p')) {
        const pIndex = entry.lastIndexOf('p');
        const nIndex = entry.indexOf('n');
        if (pIndex > nIndex && nIndex >= 0) {
            chordIdPart = entry.substring(0, pIndex);
            patternPart = entry.substring(pIndex + 1);
        } else {
            chordIdPart = entry;
        }
    } else if (entry.includes(':')) {
        [chordIdPart, patternPart] = entry.split(':');
    } else {
        chordIdPart = entry;
    }

    // Parse original key/mode (support both 'k' and '@' markers)
    let chordDataPart = chordIdPart;
    let originalKey: string | undefined;
    let originalMode: string | undefined;

    const kIndex = chordIdPart.indexOf('k');
    const atIndex = chordIdPart.indexOf('@');
    const markerIndex = kIndex >= 0 ? kIndex : atIndex;

    if (markerIndex >= 0) {
        chordDataPart = chordIdPart.substring(0, markerIndex);
        const origStr = chordIdPart.substring(markerIndex + 1);

        if (origStr.length >= 2) {
            const origKeyIndex = fromBase36(origStr[0]);
            const origModeIndex = fromBase36(origStr[1]);
            originalKey = availableKeys[origKeyIndex];
            originalMode = availableModes[origModeIndex];
        }
    }

    // Split name and notes (support both 'n' and '~' separators)
    let compactOrEncodedName: string;
    let compactOrEncodedNotes: string;

    const nIndex = chordDataPart.indexOf('n');
    const tildeIndex = chordDataPart.indexOf('~');

    if (nIndex >= 0 && (tildeIndex === -1 || nIndex < tildeIndex)) {
        compactOrEncodedName = chordDataPart.substring(0, nIndex);
        compactOrEncodedNotes = chordDataPart.substring(nIndex + 1);
    } else if (tildeIndex >= 0) {
        [compactOrEncodedName, compactOrEncodedNotes] = chordDataPart.split('~');
    } else {
        console.warn('Invalid chord format - no separator:', entry);
        return null;
    }

    // Decode chord name
    let name: string;
    if (version === VERSION && compactOrEncodedName.includes('.')) {
        name = decodeChordName(compactOrEncodedName, codeToType);
    } else {
        name = decodeURIComponent(compactOrEncodedName);
    }

    // Decode pattern
    const chordPattern = patternPart
        ? patternPart.split('.').map(c => c === '0' ? 'x' : c)
        : [...globalPattern];

    // Regenerate chord notes with proper scale-aware naming
    const notes = await regenerateChordNotes(
        name,
        key,
        mode,
        compactOrEncodedNotes,
        version
    );

    if (!notes) {
        console.warn('Failed to decode notes for chord:', name);
        return null;
    }

    // Update chord name to match the regenerated root note spelling
    const updatedName = updateChordNameFromNotes(name, notes);

    return {
        name: updatedName,
        notes,
        pattern: chordPattern,
        originalKey: originalKey || key,
        originalMode: originalMode || mode,
        originalNotes: notes
    };
}

// ============================================================================
// CHORD NAME UPDATE HELPER
// ============================================================================

export function updateChordNameFromNotes(chordName: string, regeneratedNotes: string): string {
    // Parse the old chord name to extract root note and suffix
    // Handle slash chords: e.g., "C#m/E" or "Dbmaj7/F#" or "Gm/Maj7/C"
    // Use lastIndexOf to handle chord types that contain slashes (like m/Maj7)
    const slashIndex = chordName.lastIndexOf('/');
    let mainPart: string;
    let slashPart: string | null = null;

    if (slashIndex >= 0) {
        mainPart = chordName.substring(0, slashIndex);
        const potentialSlashNote = chordName.substring(slashIndex + 1);
        
        // Check if this looks like a bass note (starts with A-G) or part of chord type
        // Bass notes start with A-G followed by optional accidentals
        if (/^[A-G](?:##|#|bb|b)?$/.test(potentialSlashNote)) {
            slashPart = potentialSlashNote;
        } else {
            // It's part of the chord type, not a slash chord
            mainPart = chordName;
        }
    } else {
        mainPart = chordName;
    }

    // Extract the regenerated root note
    // For slash chords, the first note is the bass note, so use the SECOND note as the root
    // For regular chords, use the FIRST note as the root
    const notesArray = regeneratedNotes.split(',').map(n => n.trim());
    const rootNoteIndex = slashPart ? 1 : 0; // If slash chord, skip first (bass) note
    
    if (rootNoteIndex >= notesArray.length) {
        return chordName; // Not enough notes, return original
    }
    
    const rootNoteWithOctave = notesArray[rootNoteIndex];
    const newRootNote = rootNoteWithOctave.replace(/\d+/g, '');

    // Extract old root note (matches note name with accidentals at the start)
    const rootMatch = mainPart.match(/^([A-G](?:##|#|bb|b)?)/);
    if (!rootMatch) {
        return chordName; // Can't parse, return original
    }

    const oldRootNote = rootMatch[1];
    
    // CRITICAL: Only update if the notes are enharmonically equivalent
    // This prevents "G" from becoming "C" when it shouldn't
    if (!areEnharmonic(oldRootNote, newRootNote)) {
        console.warn(`Root note mismatch: ${oldRootNote} → ${newRootNote} are not enharmonic. Keeping original.`);
        return chordName;
    }
    
    const chordSuffix = mainPart.substring(oldRootNote.length);

    // Build updated chord name
    let updatedName = newRootNote + chordSuffix;

    // Handle slash note if present
    if (slashPart) {
        // For slash chords, the first note in regeneratedNotes is already the slash note
        const slashNoteWithOctave = notesArray[0];
        const regeneratedSlashNote = slashNoteWithOctave.replace(/\d+/g, '');
        
        // Verify the slash note is enharmonically equivalent too
        if (areEnharmonic(slashPart, regeneratedSlashNote)) {
            updatedName += '/' + regeneratedSlashNote;
        } else {
            console.warn(`Slash note mismatch: ${slashPart} → ${regeneratedSlashNote} are not enharmonic. Keeping original.`);
            updatedName += '/' + slashPart;
        }
    }

    return updatedName;
}

/**
 * Check if two note names are enharmonically equivalent
 * E.g., C# and Db are enharmonic, but C and G are not
 */
function areEnharmonic(note1: string, note2: string): boolean {
    // Map note names to their chromatic pitch (0-11)
    const noteToPitch = (note: string): number => {
        const baseNotes: Record<string, number> = {
            'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
        };
        
        const baseLetter = note.charAt(0).toUpperCase();
        let pitch = baseNotes[baseLetter];
        
        if (pitch === undefined) return -1;
        
        // Count sharps and flats
        const sharps = (note.match(/#/g) || []).length;
        const flats = (note.match(/b/g) || []).length;
        
        pitch += sharps;
        pitch -= flats;
        
        // Normalize to 0-11
        return ((pitch % 12) + 12) % 12;
    };
    
    return noteToPitch(note1) === noteToPitch(note2);
}

// ============================================================================
// CHORD NOTES REGENERATION
// ============================================================================

async function regenerateChordNotes(
    chordName: string,
    key: string,
    mode: string,
    encodedNotes: string,
    version: string
): Promise<string> {
    try {
        
        // Parse slash note if present
        const slashMatch = chordName.match(/\/([A-G](##|#|bb|b)?)/);
        const slashNoteName = slashMatch ? slashMatch[1] : null;

        const { rootNote, chordType } = parseChordNameForGeneration(chordName);

        if (rootNote && chordType !== undefined) {
            // Generate chord with current key/mode for proper enharmonic spelling
            const generated = await dynamicChordGenerator.generateChord(
                rootNote,
                chordType,
                key,
                mode
            );

            if (generated) {
                let chordNotes = generated.chordNoteNames;

                // Handle slash note
                if (slashNoteName) {
                    chordNotes = await addSlashNote(slashNoteName, chordNotes, key, mode);
                }

                return chordNotes;
            }
        }
    } catch (error) {
        console.warn('Failed to regenerate chord notes for:', chordName, error);
    }

    // Fallback: decode from encoded string
    if (version === VERSION && encodedNotes.includes('-') && !encodedNotes.includes('%')) {
        return decodeChordNotes(encodedNotes);
    } else {
        return decodeURIComponent(encodedNotes);
    }
}

// ============================================================================
// SLASH NOTE HANDLING
// ============================================================================

async function addSlashNote(
    slashNoteName: string,
    chordNotes: string,
    key: string,
    mode: string
): Promise<string> {
    const slashNoteGenerated = await dynamicChordGenerator.generateChord(
        slashNoteName,
        '',
        key,
        mode
    );

    if (!slashNoteGenerated) return chordNotes;

    const regeneratedSlashNote = slashNoteGenerated.chordNoteNames.split(',')[0].trim();
    const chordNotesArray = chordNotes.split(',').map(n => n.trim());

    // Check if slash note already exists in chord
    const slashNoteExists = chordNotesArray.some(note => {
        const noteNameOnly = note.replace(/\d+/, '');
        const slashNoteNameOnly = regeneratedSlashNote.replace(/\d+/, '');
        return noteNameOnly === slashNoteNameOnly;
    });

    if (slashNoteExists) {
        // Remove existing occurrence and add to front
        const filteredNotes = chordNotesArray.filter(note => {
            const noteNameOnly = note.replace(/\d+/, '');
            const slashNoteNameOnly = regeneratedSlashNote.replace(/\d+/, '');
            return noteNameOnly !== slashNoteNameOnly;
        });
        return [regeneratedSlashNote, ...filteredNotes].join(', ');
    } else {
        // Add new slash note to front
        return `${regeneratedSlashNote}, ${chordNotes}`;
    }
}

// ============================================================================
// URL UTILITY FUNCTIONS
// ============================================================================

export const saveStateToUrl = (encodedState: string, paramName: string = 's'): void => {
    if (encodedState) {
        const url = new URL(window.location.href);
        url.searchParams.set(paramName, encodedState);
        window.history.replaceState({}, '', url.toString());
    }
};

export const loadStateFromUrl = (paramName: string = 's'): string | null => {
    const url = new URL(window.location.href);
    return url.searchParams.get(paramName);
};

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
    chordTypes: ChordTypesMap,
    paramName: string = 's'
): void => {
    const encoded = encodeState(
        key, mode, addedChords, globalPattern, bpm, subdivision, swing,
        showPattern, liveMode, pianoSettings, availableKeys, availableModes,
        availableInstruments, chords, chordTypes
    );
    saveStateToUrl(encoded, paramName);
};

export const loadAndDecodeFromUrl = async (
    availableKeys: string[],
    availableModes: string[],
    availableInstruments: string[],
    chords: ModeScaleChordDto[] | undefined,
    chordTypes: ChordTypesMap,
    paramName: string = 's'
): Promise<EncodedState | null> => {
    const stateString = loadStateFromUrl(paramName);
    if (!stateString) return null;
    return await decodeState(stateString, availableKeys, availableModes, availableInstruments, chords, chordTypes);
};