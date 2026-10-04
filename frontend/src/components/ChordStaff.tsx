import React, { useEffect, useMemo, useRef } from 'react';
import { Accidental, Formatter, Renderer, Stave, StaveNote, Voice } from 'vexflow';
import { useStaffKey } from '../hooks/useStaffKey';
import { spellChordForStaff } from '../util/NoteUtil';

// Stave top line sits 40px below STAVE_Y; this window keeps a couple of
// ledger lines of room either side so staves in a row line up
const STAVE_Y = 0;
const MIN_TOP = 20;
const MIN_BOTTOM = 100;
// Room after the key signature for accidentals plus the whole-note chord
const NOTE_ROOM = 60;
// Display size relative to VexFlow's default 10px line spacing
const SCALE = 0.75;

interface ChordStaffProps {
    notes: string;
    className?: string;
}

/**
 * The chord as a whole-note stack on a treble staff in the current key.
 * Drawn in currentColor so it follows the surrounding text color.
 */
const ChordStaff: React.FC<ChordStaffProps> = ({ notes, className = '' }) => {
    const { scaleNoteNames, keySignature } = useStaffKey();
    const drawRef = useRef<HTMLDivElement>(null);

    const keys = useMemo(
        () => spellChordForStaff(notes.split(','), scaleNoteNames, keySignature)
            .map(({ note, octave }) => `${note.toLowerCase()}/${octave}`),
        [notes, scaleNoteNames, keySignature]
    );

    useEffect(() => {
        const host = drawRef.current;
        if (!host) return;
        host.innerHTML = '';
        if (keys.length === 0) return;

        const stave = new Stave(0, STAVE_Y, 400);
        stave.addClef('treble').addKeySignature(keySignature);
        const width = Math.ceil(stave.getNoteStartX()) + NOTE_ROOM;
        stave.setWidth(width - 1);

        const renderer = new Renderer(host, Renderer.Backends.SVG);
        renderer.resize(width, MIN_BOTTOM);
        const context = renderer.getContext();
        context.setFillStyle('currentColor');
        context.setStrokeStyle('currentColor');
        stave.setStyle({ fillStyle: 'currentColor', strokeStyle: 'currentColor' });
        stave.setContext(context).draw();

        const chord = new StaveNote({ keys, duration: 'w' });
        const voice = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
        voice.addTickables([chord]);
        Accidental.applyAccidentals([voice], keySignature);
        new Formatter().joinVoices([voice]).format([voice], NOTE_ROOM - 10);
        voice.draw(context, stave);

        // Grow the window for chords that run past the usual ledger lines,
        // then let the SVG scale down to fit narrow pads
        const svg = host.querySelector('svg');
        if (!svg) return;
        const box = svg.getBBox();
        const top = Math.min(MIN_TOP, Math.floor(box.y) - 2);
        const bottom = Math.max(MIN_BOTTOM, Math.ceil(box.y + box.height) + 2);
        svg.setAttribute('viewBox', `0 ${top} ${width} ${bottom - top}`);
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.style.width = `${width * SCALE}px`;
        svg.style.height = 'auto';
        svg.style.maxWidth = '100%';
        host.style.width = '';
    }, [keys, keySignature]);

    return (
        <div
            ref={drawRef}
            aria-hidden="true"
            className={`pointer-events-none flex ${className}`}
        />
    );
};

export default React.memo(ChordStaff);
