/**
 * Dynamic Chord Generator Service
 * Generates chords on-demand using scale context from static data for proper note naming
 */

import { staticDataService } from './StaticDataService';
import type { ModeScaleChordDto, ScaleNoteDto } from '../api';

interface ChordDefinition {
    name: string;
    intervals: number[];
}

interface GeneratedChord {
    keyName: string;
    modeId: number;
    chordNote: number;
    chordNoteName: string;
    chordName: string;
    chordNotes: string;
    chordNoteNames: string;
}

class DynamicChordGenerator {
    private chordTypes: Record<string, number[]> = {
        // Basic triads
        '': [0, 4, 7],
        'm': [0, 3, 7],
        'aug': [0, 4, 8],
        'dim': [0, 3, 6],
        '5': [0, 7],
        'b5': [0, 4, 6],

        // Extended chords
        '6': [0, 4, 7, 9],
        'm6': [0, 3, 7, 9],
        '7': [0, 4, 7, 10],
        'm7': [0, 3, 7, 10],
        'maj7': [0, 4, 7, 11],
        'dim7': [0, 3, 6, 9],
        'aug7': [0, 4, 8, 10],
        'm7b5': [0, 3, 6, 10],
        'maj7#5': [0, 4, 8, 11],
        'maj7b5': [0, 4, 6, 11],
        'm7#5': [0, 3, 8, 10],
        'm7b9': [0, 3, 7, 10, 13], // ADDED: Missing from original

        // Ninth chords
        '9': [0, 4, 7, 10, 14],
        'm9': [0, 3, 7, 10, 14],
        'maj9': [0, 4, 7, 11, 14],
        'maj9#11': [0, 4, 7, 14, 18, 23], // ADDED: Missing from original
        '7b9': [0, 4, 7, 10, 13],
        '7#9': [0, 4, 7, 10, 15],
        '9#5': [0, 4, 8, 14, 22],
        '9b5': [0, 4, 6, 10, 14],

        // Eleventh chords
        '11': [0, 4, 7, 10, 14, 17],
        'm11': [0, 3, 7, 10, 14, 17],
        'maj11': [0, 4, 7, 11, 14, 17],
        '7#11': [0, 4, 7, 10, 18],
        'maj7#11': [0, 4, 7, 11, 18],
        'm7#11': [0, 3, 7, 10, 18],
        '11b9': [0, 4, 7, 13, 14, 17, 22],

        // Thirteenth chords
        '13': [0, 4, 7, 10, 14, 17, 21],
        'm13': [0, 3, 7, 10, 14, 17, 21],
        'maj13': [0, 4, 7, 11, 14, 17, 21],
        '13#11': [0, 4, 7, 14, 18, 21, 22],
        'maj13#11': [0, 4, 7, 14, 18, 21, 23],
        '13#b9': [0, 4, 7, 13, 21, 22],
        '13#sus4': [0, 2, 5, 7, 21, 22],

        // Suspended chords
        'sus2': [0, 2, 7],
        'sus4': [0, 5, 7],
        'sus2sus4': [0, 2, 5, 7],
        '7sus2': [0, 2, 7, 10],
        '7sus4': [0, 5, 7, 10],
        '9sus4': [0, 5, 7, 10, 14],

        // Added tone chords
        'add(2)': [0, 2, 4, 7],
        'add(4)': [0, 4, 5, 7],
        'add(9)': [0, 4, 7, 14],
        'add(2) add(4)': [0, 2, 4, 5, 7],
        'm add(2)': [0, 2, 3, 7],
        'm add(4)': [0, 3, 5, 7],
        'm add(9)': [0, 2, 3, 7],
        'm add(2) add(4)': [0, 2, 3, 5, 7],
        '7 add(4)': [0, 4, 5, 7, 22],
        'm7 add(4)': [0, 3, 5, 7, 22],

        // Special chords
        '6/9': [0, 4, 7, 9, 14],
        'm6/9': [0, 3, 7, 9, 14],
        'maj6/7': [0, 4, 7, 21, 23],
        '7/6': [0, 4, 7, 21, 22],
        'm7/6': [0, 3, 7, 21, 22],
        'm/Maj7': [0, 3, 7, 11],
        'm/Maj9': [0, 3, 7, 11, 14],
        'm/Maj11': [0, 3, 7, 11, 14, 17],
        'm/Maj13': [0, 3, 7, 11, 14, 17, 21],

        // Altered dominants
        '7b5': [0, 4, 6, 10],
        '7#5': [0, 4, 8, 10],
        '7b5b9': [0, 4, 6, 10, 13],
        '7b5#9': [0, 4, 6, 10, 15],
        '7#5b9': [0, 4, 8, 10, 13],
        '7#5#9': [0, 4, 8, 10, 15],
        '7aug5': [0, 4, 8, 10],
    };

    private chromaticNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    private chromaticNotesFlat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

    /**
     * Convert note name to MIDI note number (C = 0)
     */
    private noteNameToNumber(noteName: string): number {
        const noteMap: Record<string, number> = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'E#': 5, 'Fb': 4,
            'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10,
            'B': 11, 'B#': 0, 'Cb': 11
        };
        return noteMap[noteName] ?? 0;
    }

    /**
     * Get the appropriate chromatic note name based on key context
     */
    private getChromaticNoteName(noteNumber: number, keyName: string): string {
        const normalizedNote = ((noteNumber % 12) + 12) % 12;

        // Use flats if the key has flats, sharps if the key has sharps
        if (keyName.includes('b')) {
            return this.chromaticNotesFlat[normalizedNote];
        } else {
            return this.chromaticNotes[normalizedNote];
        }
    }

    /**
     * Find the best note name for a chord tone within the scale context
     */
    private findBestNoteName(targetNote: number, scaleNotes: ScaleNoteDto[], keyName: string): string {
        const normalizedTarget = ((targetNote % 12) + 12) % 12;

        // First, try to find the note in the scale context
        const scaleNote = scaleNotes.find(note => {
            const noteNum = this.noteNameToNumber(note.noteName!);
            return ((noteNum % 12) + 12) % 12 === normalizedTarget;
        });

        if (scaleNote) {
            return scaleNote.noteName!;
        }

        // Fall back to chromatic naming based on key context
        return this.getChromaticNoteName(normalizedTarget, keyName);
    }

    /**
     * Generate all chords for a specific mode and key (only compatible chords by default)
     */
    async generateChordsForScale(key: string, mode: string, includeAllChords: boolean = false): Promise<GeneratedChord[]> {
        try {
            // Get scale notes with correct naming from existing static data
            const scaleNotes = await staticDataService.getScaleNotes(key, mode);
            const modes = await staticDataService.getModes();

            const modeData = modes.find(m => m.name === mode);
            if (!modeData) {
                throw new Error(`Mode "${mode}" not found`);
            }

            // Get scale note numbers for compatibility checking
            const scaleNoteNumbers = scaleNotes.map(note =>
                ((this.noteNameToNumber(note.noteName!) % 12) + 12) % 12
            );

            const chords: GeneratedChord[] = [];

            // Generate chords for each scale degree
            scaleNotes.forEach(scaleNote => {
                const rootNote = this.noteNameToNumber(scaleNote.noteName!);

                // Generate each chord type on this root
                Object.entries(this.chordTypes).forEach(([chordType, intervals]) => {
                    const chordNoteNumbers: number[] = [];
                    const chordNoteNames: string[] = [];
                    let isCompatible = true;

                    intervals.forEach(interval => {
                        const chordNoteNumber = rootNote + interval;
                        const normalizedNote = ((chordNoteNumber % 12) + 12) % 12;

                        // Check if this chord tone exists in the scale
                        if (!scaleNoteNumbers.includes(normalizedNote)) {
                            isCompatible = false;
                        }

                        const noteName = this.findBestNoteName(chordNoteNumber, scaleNotes, key);
                        chordNoteNumbers.push(chordNoteNumber);
                        chordNoteNames.push(noteName);
                    });

                    // Only include chord if all notes are in scale (or if including all chords)
                    if (isCompatible || includeAllChords) {
                        chords.push({
                            keyName: key,
                            modeId: modeData.id!,
                            chordNote: rootNote,
                            chordNoteName: scaleNote.noteName!,
                            chordName: `${scaleNote.noteName}${chordType}`,
                            chordNotes: chordNoteNumbers.join(', '),
                            chordNoteNames: chordNoteNames.join(', ')
                        });
                    }
                });
            });

            return chords;
        } catch (error) {
            console.error('Error generating chords for scale:', error);
            throw error;
        }
    }

    /**
     * Generate a specific chord
     */
    async generateChord(rootNote: string, chordType: string, key: string, mode: string): Promise<GeneratedChord | null> {
        try {
            const intervals = this.chordTypes[chordType];
            if (!intervals) {
                throw new Error(`Unknown chord type: ${chordType}`);
            }

            const scaleNotes = await staticDataService.getScaleNotes(key, mode);
            const modes = await staticDataService.getModes();

            const modeData = modes.find(m => m.name === mode);
            if (!modeData) {
                throw new Error(`Mode "${mode}" not found`);
            }

            const rootNoteNumber = this.noteNameToNumber(rootNote);
            const chordNoteNumbers: number[] = [];
            const chordNoteNames: string[] = [];

            intervals.forEach(interval => {
                const chordNoteNumber = rootNoteNumber + interval;
                const noteName = this.findBestNoteName(chordNoteNumber, scaleNotes, key);

                chordNoteNumbers.push(chordNoteNumber);
                chordNoteNames.push(noteName);
            });

            return {
                keyName: key,
                modeId: modeData.id!,
                chordNote: rootNoteNumber,
                chordNoteName: rootNote,
                chordName: `${rootNote}${chordType}`,
                chordNotes: chordNoteNumbers.join(', '),
                chordNoteNames: chordNoteNames.join(', ')
            };
        } catch (error) {
            console.error('Error generating chord:', error);
            return null;
        }
    }

    /**
     * Check if a chord fits within a scale (no notes outside the scale)
     */
    async getCompatibleChords(key: string, mode: string): Promise<GeneratedChord[]> {
        // This is now just an alias for the default behavior
        return this.generateChordsForScale(key, mode, false);
    }

    /**
     * Get all possible chords (including those with notes outside the scale)
     */
    async getAllPossibleChords(key: string, mode: string): Promise<GeneratedChord[]> {
        return this.generateChordsForScale(key, mode, true);
    }

    /**
     * Get all available chord types
     */
    getChordTypes(): string[] {
        return Object.keys(this.chordTypes);
    }

    /**
     * Add a custom chord type
     */
    addChordType(name: string, intervals: number[]): void {
        this.chordTypes[name] = intervals;
    }
}

export const dynamicChordGenerator = new DynamicChordGenerator();