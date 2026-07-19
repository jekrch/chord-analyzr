import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InstrumentPanel from './components/InstrumentPanel';
import ChordGrid from './components/ChordGrid';
import ProgressionRail from './components/ProgressionRail';
import GeneratePanel from './components/GeneratePanel';
import LinkPanel from './components/LinkPanel';
import { useProgressionBuilder } from './hooks/useProgressionBuilder';
import { useAudio } from './audio/useAudio';
import { noteRingMs } from './audio/synth';
import { voiceChord } from './audio/voicing';
import type { ModeScaleChord, ProgressionStep } from './api/types';
import { chordBaseName } from './util/chordNotes';
import { pitchClass } from './util/notes';

const STEP_MS = 1150;

export default function App() {
  const {
    modes,
    modesError,
    key,
    setKey,
    mode,
    setMode,
    chords,
    chordsLoading,
    chordsError,
    scaleNotes,
    progression,
    addChord,
    removeChord,
    moveChord,
    shiftChord,
    replaceChord,
    clearProgression,
    swap,
    openSwap,
    closeSwap,
    results,
    generating,
    generateError,
    generate,
    useResult,
    notesForChord,
    buildrLink,
    resultLink,
  } = useProgressionBuilder();

  const { volume, setVolume, muted, setMuted, playNotes, releaseAll } = useAudio();

  const modeNames = useMemo(() => modes.map((m) => m.name), [modes]);

  const scalePitchClasses = useMemo(() => {
    const set = new Set<number>();
    for (const note of scaleNotes) {
      const pc = pitchClass(note);
      if (pc !== undefined) set.add(pc);
    }
    return set;
  }, [scaleNotes]);

  // Keys currently sounding on the keybed, and silent hover previews.
  // Kept separate so a hover preview ending can't wipe playback lighting.
  const [soundingNotes, setSoundingNotes] = useState<number[]>([]);
  const [previewLit, setPreviewLit] = useState<number[]>([]);
  const litTimers = useRef<number[]>([]);

  // Sequence playback: which source is playing ('rail' or 'result-N') and its step.
  const [playing, setPlaying] = useState<{ source: string; step: number } | null>(null);
  const seqTimer = useRef<number | null>(null);
  // Momentary pad flash for a manually triggered progression step.
  const [flashStep, setFlashStep] = useState<number | null>(null);

  // Light keys for as long as their notes audibly ring: each key clears on
  // its own schedule, so low notes — which decay slower — stay lit longer.
  const light = useCallback((midis: number[]) => {
    for (const timer of litTimers.current) window.clearTimeout(timer);
    litTimers.current = [];
    setSoundingNotes(midis);
    litTimers.current = midis.map((midi) =>
      window.setTimeout(
        () => setSoundingNotes((current) => current.filter((m) => m !== midi)),
        noteRingMs(midi),
      ),
    );
  }, []);

  const playChordNotes = useCallback(
    (notes: string | null | undefined) => {
      const midis = voiceChord(notes);
      if (midis.length === 0) return;
      playNotes(midis);
      light(midis);
    },
    [playNotes, light],
  );

  const playKey = useCallback(
    (midi: number) => {
      playNotes([midi]);
      light([midi]);
    },
    [playNotes, light],
  );

  // Silent hover preview: light the voicing without sounding it.
  const previewNotes = useCallback(
    (notes: string | null) => setPreviewLit(notes ? voiceChord(notes) : []),
    [],
  );

  const stopPlayback = useCallback(() => {
    if (seqTimer.current) {
      window.clearInterval(seqTimer.current);
      seqTimer.current = null;
    }
    setPlaying(null);
    releaseAll();
    light([]);
  }, [releaseAll, light]);

  const playSequence = useCallback(
    (noteLists: (string | null)[], source: string) => {
      if (seqTimer.current) window.clearInterval(seqTimer.current);
      let step = 0;
      const tick = () => {
        if (step >= noteLists.length) {
          stopPlayback();
          return;
        }
        setPlaying({ source, step });
        playChordNotes(noteLists[step]);
        step++;
      };
      tick();
      seqTimer.current = window.setInterval(tick, STEP_MS);
    },
    [playChordNotes, stopPlayback],
  );

  const triggerStep = useCallback(
    (index: number) => {
      const chord = progression[index];
      if (!chord) return;
      if (seqTimer.current) {
        window.clearInterval(seqTimer.current);
        seqTimer.current = null;
        setPlaying(null);
      }
      playChordNotes(chord.notes);
      setFlashStep(index);
      window.setTimeout(() => setFlashStep((s) => (s === index ? null : s)), 300);
    },
    [progression, playChordNotes],
  );

  // Live performance: number keys 1–9 (and 0 for step ten) trigger progression pads.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
      const index = '1234567890'.indexOf(e.key);
      if (index === -1 || index >= progression.length) return;
      e.preventDefault();
      triggerStep(index);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [progression.length, triggerStep]);

  useEffect(() => stopPlayback, [stopPlayback]);

  const handleChordPreview = useCallback(
    (chord: ModeScaleChord | null) => previewNotes(chord?.chordNoteNames ?? null),
    [previewNotes],
  );

  const handleAddChord = useCallback(
    (chord: ModeScaleChord) => {
      addChord(chord);
      playChordNotes(chord.chordNoteNames);
    },
    [addChord, playChordNotes],
  );

  const handleUseResult = useCallback(
    (steps: ProgressionStep[]) => {
      stopPlayback();
      useResult(steps);
    },
    [stopPlayback, useResult],
  );

  const handleClear = useCallback(() => {
    stopPlayback();
    clearProgression();
  }, [stopPlayback, clearProgression]);

  // Shifting a voicing sounds the new register right away.
  const handleShift = useCallback(
    (id: string, direction: -1 | 1) => {
      const notes = shiftChord(id, direction);
      if (notes) playChordNotes(notes);
    },
    [shiftChord, playChordNotes],
  );

  // Swapping a chord into a slot commits it and sounds it right away.
  const handleReplace = useCallback(
    (id: string, name: string) => {
      replaceChord(id, name);
      playChordNotes(notesForChord(name));
    },
    [replaceChord, playChordNotes, notesForChord],
  );

  // Base name only: a shifted last chord ("C/G") isn't a start chord the
  // engine or the start-chord dropdown knows.
  const lastChord = progression[progression.length - 1];
  const lastChordName = lastChord ? chordBaseName(lastChord.name) : undefined;

  return (
    <div className="min-h-screen bg-[var(--pb-bg-app)]">
      <main className="mx-auto flex max-w-6xl flex-col gap-4 p-4 sm:p-6">
        <InstrumentPanel
          musicKey={key}
          onKeyChange={setKey}
          mode={mode}
          onModeChange={setMode}
          modes={modes}
          modesError={modesError}
          scalePitchClasses={scalePitchClasses}
          litNotes={soundingNotes}
          previewNotes={previewLit}
          onPlayKey={playKey}
          volume={volume}
          onVolumeChange={setVolume}
          muted={muted}
          onMutedChange={setMuted}
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ChordGrid
              chords={chords}
              scaleNotes={scaleNotes}
              loading={chordsLoading}
              error={chordsError}
              onAdd={handleAddChord}
              onPlay={(chord) => playChordNotes(chord.chordNoteNames)}
              onPreview={handleChordPreview}
            />
          </div>

          <div className="flex flex-col gap-4 lg:col-span-2">
            <ProgressionRail
              progression={progression}
              chords={chords}
              link={buildrLink}
              onRemove={removeChord}
              onMove={moveChord}
              onShift={handleShift}
              onClear={handleClear}
              swap={swap}
              onOpenSwap={openSwap}
              onCloseSwap={closeSwap}
              onReplace={handleReplace}
              onPreview={previewNotes}
              onPlayStep={triggerStep}
              onPlayAll={() => playSequence(progression.map((c) => c.notes), 'rail')}
              onStop={stopPlayback}
              isPlaying={playing?.source === 'rail'}
              activeStep={playing?.source === 'rail' ? playing.step : flashStep}
            />
            <GeneratePanel
              chords={chords}
              scaleNotes={scaleNotes}
              musicKey={key}
              mode={mode}
              modeNames={modeNames}
              onModeChange={setMode}
              generating={generating}
              generateError={generateError}
              results={results}
              preferredStartChord={lastChordName}
              onGenerate={generate}
              onUseResult={handleUseResult}
              onPreview={previewNotes}
              onPlayChord={(name) => playChordNotes(notesForChord(name))}
              onPlayResult={(steps, i) =>
                playSequence(steps.map((s) => notesForChord(s.chord)), `result-${i}`)
              }
              onStop={stopPlayback}
              playing={playing}
              notesForChord={notesForChord}
              resultLink={resultLink}
            />
            <LinkPanel link={buildrLink} />
          </div>
        </div>
      </main>
    </div>
  );
}
