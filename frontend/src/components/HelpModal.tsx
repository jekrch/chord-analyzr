import React, { useEffect, useRef, useState } from 'react';
import {
    AdjustmentsHorizontalIcon,
    ArrowDownTrayIcon,
    BoltIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CommandLineIcon,
    DocumentTextIcon,
    MagnifyingGlassIcon,
    PencilSquareIcon,
    PlayIcon,
    QueueListIcon,
    SpeakerWaveIcon,
    WrenchScrewdriverIcon,
} from '@heroicons/react/20/solid';
import Modal from './Modal';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type SectionId =
    | 'start' | 'shortcuts' | 'audio' | 'sequencer' | 'midi' | 'explorer'
    | 'editing' | 'live' | 'songs' | 'interface' | 'troubleshooting';

// A group is a small labelled block: optional intro text, then either
// term/description rows or a plain list of tips.
interface Group {
    heading?: string;
    intro?: React.ReactNode;
    items?: [string, React.ReactNode][];
    tips?: React.ReactNode[];
}

interface Section {
    id: SectionId;
    title: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    summary: string;
    groups?: Group[];
}

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <kbd className="mcb-kbd">{children}</kbd>
);

const STEPS: { title: string; text: string; target?: SectionId }[] = [
    { title: 'Choose a key & mode', text: 'Pick a key and mode in the Controls panel, like C Ionian or D# Lydian.' },
    { title: 'Explore chords', text: 'Browse the Chord Explorer for chords that fit your key and mode.', target: 'explorer' },
    { title: 'Build a sequence', text: 'Press + on a chord to add it to your sequence.', target: 'explorer' },
    { title: 'Shape a pattern', text: 'Use the Sequencer to set which chord tones play on each step.', target: 'sequencer' },
    { title: 'Play & perform', text: 'Press Play to hear it, or open Live Mode to play chords by hand.', target: 'live' },
];

const SHORTCUTS: { heading: string; rows: [string, React.ReactNode][] }[] = [
    {
        heading: 'Playback',
        rows: [
            ['Play / pause the sequencer', <Kbd>Space</Kbd>],
            ['Play a chord from the sequence', <><Kbd>1</Kbd><span className="text-mcb-tertiary text-xs">–</span><Kbd>9</Kbd></>],
            ['Play the 10th chord', <Kbd>0</Kbd>],
        ],
    },
    {
        heading: 'Views',
        rows: [
            ['Show / hide the sequencer', <Kbd>P</Kbd>],
            ['Toggle Live Mode', <Kbd>L</Kbd>],
        ],
    },
];

const SECTIONS: Section[] = [
    {
        id: 'start',
        title: 'Quick Start',
        icon: BoltIcon,
        summary: 'From an empty session to a playing progression in five steps.',
    },
    {
        id: 'shortcuts',
        title: 'Keyboard Shortcuts',
        icon: CommandLineIcon,
        summary: 'Shortcuts are ignored while you are typing in a text field.',
    },
    {
        id: 'audio',
        title: 'Piano & Audio',
        icon: SpeakerWaveIcon,
        summary: 'The keybed, instrument voices, and sound shaping.',
        groups: [
            {
                heading: 'Piano',
                intro: 'Click keys to play single notes. The keybed marks scale notes and lights up the tones of the current chord.',
            },
            {
                heading: 'Audio settings',
                intro: 'Open the settings in the Controls panel for:',
                items: [
                    ['Voice', 'Choose from several instrument sounds'],
                    ['Volume & octave', 'Overall level and pitch range'],
                    ['Effects', 'Reverb, chorus, and delay'],
                    ['Equalizer', 'Bass, mid, and treble'],
                    ['Note duration', 'How long notes ring out'],
                ],
            },
        ],
    },
    {
        id: 'sequencer',
        title: 'Pattern Sequencer',
        icon: QueueListIcon,
        summary: 'Patterns decide which chord tones play on each step.',
        groups: [
            {
                heading: 'Step values',
                items: [
                    ['—', <>A rest. Written as <code className="font-mono text-mcb-primary">x</code> in custom patterns.</>],
                    ['1, 2, 3…', 'Play the 1st, 2nd, 3rd… note of the chord'],
                    ['1↑, 2↑…', <>The same note an octave up. Written as <code className="font-mono text-mcb-primary">+</code> in custom patterns.</>],
                ],
            },
            {
                heading: 'Pattern controls',
                items: [
                    ['Steps', 'Use + / − to set the length, from 1 to 16 steps'],
                    ['Presets', 'Pick a ready-made pattern, grouped by style and note count'],
                    ['Custom', <>Type a pattern such as <code className="font-mono text-mcb-primary">1,x,3,2+</code> and press Apply</>],
                    ['Playhead', 'The step that is playing lights up'],
                ],
            },
            {
                heading: 'Timing',
                items: [
                    ['BPM', 'Tempo from 60 to 200'],
                    ['Subdivision', '32nd, 16th, 8th, quarter, or half notes'],
                    ['Swing', 'Delays every other step, 0–50%'],
                ],
            },
            {
                heading: 'Per-chord patterns',
                intro: 'Each chord in your sequence can have its own pattern.',
                items: [
                    ['Global pattern', 'Used when no chord is selected (cyan "Global Pattern" label)'],
                    ['Chord pattern', 'Select a chord in the sequence to edit its own pattern (purple chord-name label)'],
                    ['Playback', "The sequencer switches to each chord's pattern as it plays"],
                ],
            },
            {
                heading: 'Presets',
                items: [
                    ['Note filter', 'Turn on "Hide patterns with fewer notes" to show only patterns that use every chord tone'],
                    ['Categories', 'Arpeggios, rhythmic, bass lines, and more'],
                    ['Preview', 'Each preset shows its notation before you apply it'],
                ],
            },
        ],
    },
    {
        id: 'midi',
        title: 'MIDI Recording',
        icon: ArrowDownTrayIcon,
        summary: 'Record what the sequencer plays and download it as a standard .mid file.',
        groups: [
            {
                heading: 'Recording',
                items: [
                    ['Arm', 'Turn the MIDI Recording switch on in the Sequencer'],
                    ['Record', 'Recording starts when you press Play; the LED pulses red while it runs'],
                    ['Stop', 'Recording ends when you stop or pause playback'],
                    ['Save', 'A Save button appears afterwards. Click it to download the file'],
                ],
            },
            {
                heading: "What's captured",
                items: [
                    ['Notes', 'Every note the sequencer plays, with exact timing'],
                    ['Tempo', 'Your BPM is written into the file'],
                    ['Length', 'Note lengths follow your note-duration setting'],
                    ['Patterns', 'The full sequence, including per-chord patterns'],
                ],
            },
            {
                heading: 'Tips',
                tips: [
                    'Set BPM and timing before you press Play.',
                    'Let the sequence play through at least once for a complete take.',
                    'Each take is saved as a new, timestamped file. Drop it into any DAW to change instruments or edit notes.',
                    'The Save button stays available until you start a new recording.',
                ],
            },
        ],
    },
    {
        id: 'explorer',
        title: 'Chord Explorer',
        icon: MagnifyingGlassIcon,
        summary: 'Every chord that fits the selected key and mode, and the sequence you build from them.',
        groups: [
            {
                heading: 'Finding chords',
                items: [
                    ['Filter', 'Narrow the list by root note'],
                    ['Search', 'Find chords by name or by the notes they contain'],
                    ['Preview', 'Click any chord to hear it'],
                    ['Notes', 'Click ↓ to see the notes in a chord'],
                ],
            },
            {
                heading: 'Building a sequence',
                intro: <>Press <span className="font-semibold text-[var(--mcb-success-text)]">+</span> on a chord to add it. The sequence sits at the bottom of the screen, where you can:</>,
                tips: [
                    'Click a chord to play it.',
                    <>Press <Kbd>1</Kbd>–<Kbd>9</Kbd> to jump between chords.</>,
                    'Turn on Delete mode to remove chords, or clear them all to start over.',
                    'Click the gear icon to enter Edit mode.',
                ],
            },
        ],
    },
    {
        id: 'editing',
        title: 'Chord Editing',
        icon: PencilSquareIcon,
        summary: 'Change voicings and bass notes for chords already in your sequence.',
        groups: [
            {
                heading: 'Edit mode',
                intro: 'Click the gear icon next to your sequence, then click a chord to open the editor. From there you can reorder notes, add a slash bass note, and preview before saving.',
            },
            {
                heading: 'Slash chords',
                items: [
                    ['Bass note', 'Enter a note name (E, Gb, C…) to make a chord like C/E'],
                    ['Voicing', 'The bass note moves to the lowest position'],
                    ['Name', 'The chord name updates to slash notation'],
                    ['Remove', 'Clear the field to go back to the original chord'],
                ],
            },
            {
                heading: 'Reordering notes',
                items: [
                    ['Drag', 'Drag notes to reorder them'],
                    ['Arrows', 'Or move a note with the up / down buttons'],
                    ['Auto-detect', 'Moving a new note to the bottom updates the slash note'],
                    ['Highlight', 'Slash notes are shown in amber'],
                ],
            },
            {
                heading: 'Editor controls',
                items: [
                    ['Preview', 'Play button. Hear your changes before saving'],
                    ['Save', 'Green check. Keep your edits'],
                    ['Cancel', 'Discard changes and close the editor'],
                ],
            },
        ],
    },
    {
        id: 'live',
        title: 'Live Mode',
        icon: PlayIcon,
        summary: 'Your sequence as large, touch-friendly pads for performing and practising.',
        groups: [
            {
                heading: 'Using Live Mode',
                tips: [
                    <>Click <span className="font-medium text-mcb-primary">Expand</span> in the chord bar, or press <Kbd>L</Kbd>.</>,
                    <>Tap a pad or press <Kbd>1</Kbd>–<Kbd>9</Kbd> to play a chord.</>,
                    'The sequencer keeps playing your patterns, and the active chord stays lit.',
                ],
            },
            {
                heading: 'Good for',
                items: [
                    ['Performance', 'Large pads that are easy to hit'],
                    ['Practice', 'Quick chord changes with clear feedback'],
                    ['Writing', 'Try progressions out in real time'],
                ],
            },
        ],
    },
    {
        id: 'songs',
        title: 'Song Sheets',
        icon: DocumentTextIcon,
        summary: 'Turn lyrics and chords into a chart you can play and print. Open from the app menu → Song Sheets.',
        groups: [
            {
                heading: 'Adding a song',
                items: [
                    ['Paste', 'Paste chords-over-lyrics or ChordPro text. Chords and section headers are detected automatically'],
                    ['Placement', 'Chords sit above the exact character they were placed on, so spacing is kept'],
                    ['Key & mode', 'Set them yourself or let the app detect them. Picking a new key asks whether to transpose or only relabel; chords are respelled with sharps or flats to match'],
                ],
            },
            {
                heading: 'Editing',
                items: [
                    ['Add / edit', 'Click a spot on a line to add a chord, or click a chord to change it'],
                    ['Move', 'Drag a chord along its line'],
                    ['Transpose', 'Shift the whole song by semitones'],
                    ['Undo', 'Step back through recent edits'],
                ],
            },
            {
                heading: 'Playback',
                items: [
                    ['Click to hear', 'Plays the chord with the current voice and effects'],
                    ['Step through', 'Move chord by chord, using the app\'s patterns'],
                    ['Sheet view', 'A clean full-screen view for performing'],
                ],
            },
            {
                heading: 'Export & library',
                items: [
                    ['Formats', 'Plain text, PNG image, or PDF (through the print dialog)'],
                    ['Layout', 'Orientation, margins, columns, line spacing, and font sizes'],
                    ['Library', 'Songs are saved in your browser. Export them to a JSON file or sync with Google Drive'],
                ],
            },
        ],
    },
    {
        id: 'interface',
        title: 'Interface Tips',
        icon: AdjustmentsHorizontalIcon,
        summary: 'Getting around the panels.',
        groups: [
            {
                heading: 'Navigation',
                items: [
                    ['Sequencer', <>Click its header, or press <Kbd>P</Kbd>, to show or hide the pattern editor</>],
                    ['Settings', 'Most panels have their own expandable settings'],
                    ['Status', 'The top bar shows the current key, mode, and playback state'],
                ],
            },
            {
                heading: 'Visual feedback',
                items: [
                    ['Keybed', 'Scale notes are marked; the current chord\'s keys light up'],
                    ['Step', 'The playing step lights up in the sequencer'],
                ],
            },
            {
                heading: 'Small screens',
                intro: 'On phones some controls are simplified and sized for touch.',
            },
        ],
    },
    {
        id: 'troubleshooting',
        title: 'Troubleshooting',
        icon: WrenchScrewdriverIcon,
        summary: 'Fixes for common audio and performance problems.',
        groups: [
            {
                heading: 'Audio',
                items: [
                    ['No sound', "Check your device volume and make sure it isn't muted"],
                    ['iOS', 'Tap any button first to start audio'],
                    ['Distortion', 'Lower the volume in the piano settings'],
                ],
            },
            {
                heading: 'Performance',
                items: [
                    ['Lag or glitches', 'Close other browser tabs that are playing audio'],
                    ['Phones', 'Lower reverb and other effects'],
                ],
            },
        ],
    },
];

const GroupBlock: React.FC<{ group: Group }> = ({ group }) => (
    <section>
        {group.heading && <h5 className="mcb-label mb-2">{group.heading}</h5>}
        {group.intro && (
            <p className="text-sm leading-relaxed text-mcb-secondary mb-2.5 last:mb-0">{group.intro}</p>
        )}
        {group.items && (
            <dl className="mcb-inset divide-y divide-[var(--mcb-border-subtle)] mb-2.5 last:mb-0">
                {group.items.map(([term, desc]) => (
                    <div key={term} className="px-3 py-2 text-sm sm:flex sm:gap-4">
                        <dt className="sm:w-32 sm:shrink-0 font-medium text-mcb-primary">{term}</dt>
                        <dd className="text-mcb-secondary">{desc}</dd>
                    </div>
                ))}
            </dl>
        )}
        {group.tips && (
            <ul className="mcb-inset divide-y divide-[var(--mcb-border-subtle)]">
                {group.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2.5 px-3 py-2 text-sm text-mcb-secondary">
                        <span aria-hidden="true" className="w-1.5 h-1.5 mt-[0.45rem] shrink-0 rounded-[1px] bg-[var(--mcb-accent-text-primary)]" />
                        <span>{tip}</span>
                    </li>
                ))}
            </ul>
        )}
    </section>
);

const QuickStart: React.FC<{ onGo: (id: SectionId) => void }> = ({ onGo }) => (
    <ol className="mcb-inset divide-y divide-[var(--mcb-border-subtle)]">
        {STEPS.map((step, i) => {
            const target = SECTIONS.find(s => s.id === step.target);
            return (
                <li key={step.title} className="flex items-start gap-3 px-3 py-3">
                    <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-sm border border-mcb-subtle bg-[color-mix(in_srgb,var(--mcb-accent-primary)_14%,transparent)] font-mono text-xs text-[var(--mcb-accent-text-primary)]">
                        {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-mcb-primary">{step.title}</div>
                        <div className="text-sm text-mcb-secondary">{step.text}</div>
                    </div>
                    {target && (
                        <button
                            onClick={() => onGo(target.id)}
                            className="hidden sm:inline-flex items-center gap-1 h-6 px-2 shrink-0 rounded-md text-[0.6875rem] text-mcb-tertiary hover:text-[var(--mcb-text-primary)] hover:bg-[var(--mcb-bg-hover)] transition-colors"
                        >
                            <span>{target.title}</span>
                            <ChevronRightIcon className="w-3.5 h-3.5 shrink-0" />
                        </button>
                    )}
                </li>
            );
        })}
    </ol>
);

const Shortcuts: React.FC = () => (
    <div className="space-y-5">
        {SHORTCUTS.map(group => (
            <section key={group.heading}>
                <h5 className="mcb-label mb-2">{group.heading}</h5>
                <ul className="mcb-inset divide-y divide-[var(--mcb-border-subtle)]">
                    {group.rows.map(([label, keys]) => (
                        <li key={label} className="flex items-center justify-between gap-4 px-3 py-2 text-sm text-mcb-secondary">
                            <span>{label}</span>
                            <span className="flex items-center gap-1 shrink-0">{keys}</span>
                        </li>
                    ))}
                </ul>
            </section>
        ))}
    </div>
);

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    const [activeId, setActiveId] = useState<SectionId>('start');
    // Phones only: show the topic list instead of a topic
    const [showIndex, setShowIndex] = useState(true);
    const contentRef = useRef<HTMLDivElement>(null);

    const index = SECTIONS.findIndex(s => s.id === activeId);
    const section = SECTIONS[index];
    const prev = SECTIONS[index - 1];
    const next = SECTIONS[index + 1];

    // Start each section at the top
    useEffect(() => {
        contentRef.current?.scrollTo({ top: 0 });
    }, [activeId]);

    const open = (id: SectionId) => {
        setActiveId(id);
        setShowIndex(false);
    };

    const stepButton = 'inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs text-mcb-tertiary hover:text-[var(--mcb-text-primary)] hover:bg-[var(--mcb-bg-hover)] transition-colors';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Help & Guide"
            className="max-w-4xl h-[min(85vh,46rem)]"
            fixedHeader={true}
        >
            <div className="h-full flex text-left">
                {/* Topic list: a sidebar from md up; on phones a full-width
                    list that opens one topic at a time */}
                <nav
                    aria-label="Help topics"
                    className={`${showIndex ? 'flex' : 'hidden'} md:flex flex-col flex-1 md:flex-none md:w-52 min-h-0 md:border-r border-mcb-subtle bg-[color-mix(in_srgb,var(--mcb-bg-input)_30%,transparent)]`}
                >
                    <div className="mcb-help-stage flex-1 min-h-0 overflow-y-auto flex flex-col gap-0.5 p-2">
                        {SECTIONS.map(s => {
                            const Icon = s.icon;
                            const isCurrent = s.id === activeId;
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => open(s.id)}
                                    aria-current={isCurrent ? 'true' : undefined}
                                    className={`mcb-fullmenu-link max-md:!h-11 ${isCurrent ? 'is-current' : ''}`}
                                >
                                    <Icon />
                                    <span className="flex-1">{s.title}</span>
                                    <ChevronRightIcon className="md:hidden" />
                                </button>
                            );
                        })}
                    </div>
                    <a
                        href="https://github.com/jekrch/chord-analyzr"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 px-4 py-3 border-t border-mcb-subtle text-[0.6875rem] text-mcb-tertiary hover:text-[var(--mcb-text-primary)] transition-colors"
                    >
                        More docs on GitHub ↗
                    </a>
                </nav>

                {/* Current topic: back link (phones) and prev / next stay pinned;
                    only the topic itself scrolls */}
                <div className={`${showIndex ? 'hidden' : 'flex'} md:flex flex-col flex-1 min-w-0 min-h-0`}>
                    <div className="md:hidden shrink-0 px-3 py-2 border-b border-mcb-subtle bg-[color-mix(in_srgb,var(--mcb-bg-input)_30%,transparent)]">
                        <button onClick={() => setShowIndex(true)} className={stepButton}>
                            <ChevronLeftIcon className="w-4 h-4 shrink-0" />
                            <span>All topics</span>
                        </button>
                    </div>

                    <div ref={contentRef} className="flex-1 min-h-0 overflow-y-auto">
                        {/* Keyed so each topic's blocks rise in again when it's opened */}
                        <div key={activeId} className="mcb-help-stage p-5 md:p-6 space-y-5">
                            <header>
                                <h4 className="text-base font-semibold text-mcb-primary">{section.title}</h4>
                                <p className="mt-1 text-sm text-mcb-tertiary">{section.summary}</p>
                            </header>

                            {section.id === 'start' && <QuickStart onGo={open} />}
                            {section.id === 'shortcuts' && <Shortcuts />}
                            {section.groups?.map((g, i) => <GroupBlock key={g.heading ?? i} group={g} />)}
                        </div>
                    </div>

                    {/* Read-through: previous / next topic */}
                    <div className="shrink-0 flex items-center justify-between gap-2 px-3 md:px-4 py-2 border-t border-mcb-subtle bg-[color-mix(in_srgb,var(--mcb-bg-input)_30%,transparent)]">
                        {prev ? (
                            <button onClick={() => open(prev.id)} className={stepButton}>
                                <ChevronLeftIcon className="w-4 h-4 shrink-0" />
                                <span>{prev.title}</span>
                            </button>
                        ) : <span />}
                        {next && (
                            <button onClick={() => open(next.id)} className={stepButton}>
                                <span>{next.title}</span>
                                <ChevronRightIcon className="w-4 h-4 shrink-0" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default HelpModal;
