# Chord Analyzr :musical_note:
[![Frontend CI](https://github.com/jekrch/chord-analyzr/actions/workflows/ci.yml/badge.svg)](https://github.com/jekrch/chord-analyzr/actions/workflows/ci.yml)

[modal.chordbuildr.com](https://modal.chordbuildr.com/)

A Postgres driven solution for analyzing chord progressions and generating chord suggestions. 

<img width="420" alt="image" src="https://github.com/user-attachments/assets/62a52551-1a06-4f87-87c8-524998bf86c8" />

<hr>
<h3>Setup</h3> 

Execute ```docker-compose up``` to create a postgres database named chordanalyzr on ```localhost:5432``` with user credentials from ```flyway/flyway.conf```. 

Services for a Go API and react frontend will also be started, with the frontend available at `localhost:3000`

<hr>
<h3>chord views</h3> 

```chord_view``` displays all permutations of root note and chord type, with the notes comprising each chord aggregated in csv. 

Sample usage: 

```
SELECT cv.chord_name, 
       cv.chord_note_names,
       cv.chord_notes
FROM chord_view cv
WHERE note_name = 'F' AND 
      chord_type = '7sus4';
```
Returns:
```
"F7sus4",   "F, Bb, C, D#",   "6, 11, 13, 16"
```

<br>

To capture each note by row use ```chord_note_view```

<hr>
<h3>mode views</h3> 

```mode_view``` displays all permutations of key and mode, with the notes comprising each scale aggregated in csv. 

Sample usage: 

```
SELECT mv.mode, 
       mv.key_name, 
       mv.mode_note_names, 
       mv.mode_notes
FROM mode_view mv 
WHERE key_name = 'A';
```
Returns:
```
"mode",              "key_name",   "mode_note_names",          "mode_notes"
Aeolian,             A,            "A, B, C, D, E, F, G",      "10, 12, 13, 15, 17, 18, 20"
Altered Scale,       A,            "A, Bb, C, Db, Eb, F, G",   "10, 11, 13, 14, 16, 18, 20"
Dorian,              A,            "A, B, C, D, E, F#, G",     "10, 12, 13, 15, 17, 19, 20"
Dorian b2,           A,            "A, Bb, C, D, E, F#, G",    "10, 11, 13, 15, 17, 19, 20"
Ionian,              A,            "A, B, C#, D, E, F#, G#",   "10, 12, 14, 15, 17, 19, 21"
Locrian,             A,            "A, Bb, C, D, Eb, F, G",    "10, 11, 13, 15, 16, 18, 20"
Locrian #2,          A,            "A, B, C, D, Eb, F, G",     "10, 12, 13, 15, 16, 18, 20"
Lydian,              A,            "A, B, C#, D#, E, F#, G#",  "10, 12, 14, 16, 17, 19, 21"
Lydian Augmented,    A,            "A, B, C#, D#, E#, F#, G#", "10, 12, 14, 16, 18, 19, 21"
Lydian Dominant,     A,            "A, B, C#, D#, E, F#, G",   "10, 12, 14, 16, 17, 19, 20"
Melodic Minor,       A,            "A, B, C, D, E, F#, G#",    "10, 12, 13, 15, 17, 19, 21"
Mixolydian,          A,            "A, B, C#, D, E, F#, G",    "10, 12, 14, 15, 17, 19, 20"
Mixolydian b6,       A,            "A, B, C#, D, E, F, G",     "10, 12, 14, 15, 17, 18, 20"
Phrygian,            A,            "A, Bb, C, D, E, F, G",     "10, 11, 13, 15, 17, 18, 20"
```
<br>

To capture each note by row use ```mode_note_view```

<hr>
<h3>mode chord views</h3> 

```mode_scale_chord_relation_view``` displays all permutations of chord mode and key with any distinct notes listed and counted. This can be used for identifying chords that complement a given scale. 

Sample usage: 

The following query will return all chords that have a root note of A and whose comprising notes all fall within the C Ionian scale. 

```
SELECT mscv.mode, 
       mscv.key_name, 
       mscv.chord_name, 
       mscv.chord_notes,  
       mscv.mode_chord_note_diff, 
       mscv.mode_chord_note_diff_count 
FROM mode_scale_chord_relation_view mscv
WHERE mscv.mode = 'Ionian' AND 
      mscv.key_name = 'C' AND 
      mscv.chord_note_name = 'A' AND
      mscv.mode_chord_note_diff_count = 0
```
Returns:
```
"mode"      "key_name"  "chord_name"    "chord_notes"   "mode_chord_note_diff"  "mode_chord_note_diff_count"
"Ionian"    "C"         "Am"            "{1,5,10}"      "{}"                     "0"
"Ionian"    "C"         "Am7"           "{1,5,8,10}"    "{}"                     "0"
"Ionian"    "C"         "Am9"           "{1,5,8,10}"    "{}"                     "0"
"Ionian"    "C"         "A5"            "{5,10}"        "{}"                     "0"
"Ionian"    "C"         "Asus2"         "{5,10,12}"     "{}"                     "0"
"Ionian"    "C"         "Asus4"         "{3,5,10}"      "{}"                     "0"
"Ionian"    "C"         "Am11"          "{1,3,5,8,10}"  "{}"                     "0"
"Ionian"    "C"         "A7sus4"        "{3,5,8,10}"    "{}"                     "0"
"Ionian"    "C"         "Am7#5"         "{1,6,8,10}"    "{}"                     "0"
"Ionian"    "C"         "A9sus4"        "{3,5,8,10}"    "{}"                     "0"
```

<br>

<hr>
<h3>voice leading & harmonic pathfinding</h3>

The same chord/scale relations are also exposed as a **weighted graph**. Each in-scale chord is a node, and every pair of chords is joined by an edge weighted by *voice-leading distance* — the minimal total semitone motion needed to move one chord's notes to another's (common tones cost nothing, so lower-weight moves are smoother). This turns the database into a live progression engine that answers questions too combinatorially large to precompute into static data.

Generate the smoothest four-chord progression in C Ionian, starting on `Cmaj7`:

```
SELECT * FROM fn_smooth_progression('Ionian', 'C', 'Cmaj7', 4);
```
Returns (columns `step, chord, vl_from_prev, total_cost`), e.g.:
```
 step | chord     | vl_from_prev | total_cost
------+-----------+--------------+------------
    1 | Cmaj7     |            0 |          4
    2 | Am add(2) |            2 |          4
    3 | Esus4     |            1 |          4
    4 | Fb5       |            1 |          4
```

Supporting building blocks: `fn_voice_leading_distance(int[], int[])` (metric between two pitch-class sets), `mode_key_chord_view` (graph nodes — the diatonic chords of a key/mode), and `mode_key_chord_edge_view` (weighted edges). See [`flyway/sql/views/R__voice_leading.sql`](flyway/sql/views/R__voice_leading.sql) for the implementation and [`docs/voice-leading-demo.sql`](docs/voice-leading-demo.sql) for runnable examples.

<hr>
<h3>API</h3>

The Go API (`api-go/`, served at `localhost:8080`, interactive docs at `/swagger-ui.html`) exposes the views and the pathfinding engine over HTTP:

| Endpoint | Description |
| --- | --- |
| `GET /api/modes` | All modes |
| `GET /api/scales?key=C&mode=Ionian` | Notes of a scale |
| `GET /api/chords?key=C&mode=Ionian` | Chords that fit within a key/mode |
| `GET /api/progressions?key=C&mode=Ionian&startChord=Cmaj7&length=4` | Smoothest progression of `length` chords starting on `startChord` |

<hr>
<h3>MCP server</h3>

The same engine is exposed as an [MCP](https://modelcontextprotocol.io/) server (`api-go/cmd/mcp`), so LLM clients like Claude Code or Claude Desktop can prompt for chord progressions in natural language. It shares the API's service layer and talks to Postgres directly.

| Tool | Description |
| --- | --- |
| `list_modes` | Available scale modes |
| `get_scale_notes` | Notes of a scale for a key/mode |
| `list_chords` | Chords diatonic to a key/mode |
| `generate_progression` | Voice-leading-optimized progression, with optional pinned chords (`G7@3`), required melody notes (`Bb@2`), and flavor knobs: cadential root motion, slash-chord bass lines, borrowed color notes, chord-size cap, randomness, and multiple ranked alternatives |

`docker-compose up` starts it alongside the database and API, speaking streamable HTTP at `http://localhost:8081/mcp`. Register it with Claude Code:

```
claude mcp add --transport http chord-analyzr http://localhost:8081/mcp
```

For clients that only speak stdio, run the binary directly against a reachable Postgres:

```
go run ./api-go/cmd/mcp -stdio
```

Example prompt once connected: *"Generate a smooth 6-chord progression in D Dorian starting on Dm7 that lands on G7 at step 4."*

## Frontend

**modal.chordbuildr.com** is a comprehensive web-based music composition and performance tool built with React. The application provides an intuitive interface for exploring musical scales, building chord progressions, and creating rhythmic patterns.

<img width="420" alt="image" src="https://github.com/user-attachments/assets/6822f515-e7ea-4fe6-b927-c9a64a8b2fb2" />

### Core Features

**Chord Explorer & Theory Engine**
- Browse chords that fit any selected key and mode combination
- Search and filter chords by root note or chord type  
- Real-time chord preview with visual piano feedback
- Advanced chord editing with custom voicings and slash chord support

**Pattern Sequencer**
- Create rhythmic patterns for chord progressions
- Customizable pattern length and timing controls
- Multiple pattern presets and BPM adjustment
- Visual step sequencer with rest and octave notation
- Export sequencer output to MIDI 

**Live Mode**
- Full-screen chord buttons optimized for live performance
- Keyboard shortcuts (1-9) for instant chord switching
- Touch-friendly interface for mobile devices
- Real-time pattern playback during performance

**Interactive Piano**
- Visual scale and chord tone highlighting
- Click-to-play individual notes
- Dynamic feedback based on current key/mode selection

**Professional Audio Engine**
- Multiple instrument voices and sound synthesis
- Comprehensive effects processing (reverb, chorus, delay)
- 3-band equalizer for sound shaping
- Adjustable note duration and octave controls

### Song Sheets

A lyrics-and-chords workspace for turning songs into playable, printable sheets.

**Import & parsing**
- Paste free-form chords-over-lyrics or ChordPro text and the parser auto-detects chords, section headers (Verse, Chorus, Bridge…), and layout
- Chords are positioned by exact character column over the lyrics, so alignment is preserved regardless of word spacing
- Songs are stored as a single ChordPro-style source string with inline `[Am]` markers

**Editing**
- Click anywhere on a line to add a chord, or click an existing chord to edit it via the chord-picker popover
- Drag chords to reposition them, right-click for a context menu, and undo edits
- Transpose an entire song up or down; each song can pin its own key/mode or auto-detect

**Playback**
- Click any chord to hear it through the app's audio engine, or step through the sheet
- Chords play with the same instrument voices, effects, and pattern engine used elsewhere in the app

**Views & export**
- Switch between an edit view and a clean, full-screen sheet view for performance
- Export to plain text (aligned chords-over-lyrics), PNG image, or PDF (via the browser print dialog)
- Tunable print/export layout: page orientation, margins, columns, line spacing, and lyric/chord font sizes

**Library**
- Songs live in the browser (localStorage) and can be saved/loaded as a local JSON file, or synced to Google Drive (see below)

### Data Architecture

The frontend leverages the PostgreSQL-driven backend that provides:
- **Comprehensive chord database** with all permutations of root notes and chord types
- **Modal scale analysis** across all keys and modes (Ionian, Dorian, Phrygian, etc.)
- **Harmonic relationship mapping** that identifies which chords naturally fit within each scale

Data is served through two pathways:
1. **Live API** via Go backend for dynamic queries
2. **Static JSON files** generated from database views for optimal performance

The static data generator extracts chord relationships from views like `mode_scale_chord_relation_view`, ensuring the frontend has instant access to music theory data without database latency during performance.

### Google Drive sync (optional)

The song library normally lives in the browser (localStorage) and can be saved/loaded as a local JSON file. Optionally, users can also keep that JSON file (`chordbuildr-songs.json`) in their Google Drive via "Drive Save" / "Drive Load" buttons in the song library panel.

The feature is entirely client-side (Google Identity Services token flow with the non-sensitive `drive.file` scope — the app can only see files it created) and is hidden unless a Google OAuth client id is configured:

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com/) and enable the **Google Drive API**.
2. Configure the OAuth consent screen (External; publish it or add test users).
3. Create an **OAuth client ID** of type *Web application* with Authorized JavaScript origins `http://localhost:5173` (dev) and your production origin, e.g. `https://modal.chordbuildr.com`. No redirect URIs are needed for the token flow.
4. Put the client id in `frontend/.env.local`:

   ```
   VITE_GOOGLE_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com
   ```

For the GitHub Pages deploy, set the same value as a repository *variable* named `VITE_GOOGLE_CLIENT_ID` (client ids are public, no secret needed). When unset, the Drive buttons simply don't render.
