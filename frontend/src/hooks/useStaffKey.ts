import { useMemo } from 'react';
import { useMusicStore } from '../stores/musicStore';
import { convertScaleToMajorKey } from '../util/KeySignatureUtil';

/**
 * The current scale's spellings plus the key signature to draw them with:
 * the major key sharing the scale's accidentals, e.g. C Lydian -> G.
 */
export function useStaffKey(): { scaleNoteNames: string[]; keySignature: string } {
    const scaleNotes = useMusicStore(state => state.scaleNotes);

    return useMemo(() => {
        const scaleNoteNames = scaleNotes
            .map(scaleNote => scaleNote.noteName)
            .filter(Boolean) as string[];
        const majorKey = scaleNoteNames.length ? convertScaleToMajorKey(scaleNoteNames) : null;
        return {
            scaleNoteNames,
            keySignature: majorKey ? majorKey.split(' ')[0] : 'C',
        };
    }, [scaleNotes]);
}
