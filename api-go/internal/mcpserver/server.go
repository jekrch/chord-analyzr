// Package mcpserver exposes the chord-analyzr service as MCP tools, so LLM
// clients can look up modes, scales, and diatonic chords and generate
// voice-leading-optimized progressions.
package mcpserver

import (
	"context"
	"fmt"
	"strings"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/jekrch/chord-analyzr/api-go/internal/store"
)

// Service is what the tools need from the service layer; split out so tests
// can substitute a fake.
type Service interface {
	Modes(ctx context.Context) ([]store.Mode, error)
	ScaleNotes(ctx context.Context, mode, key string) ([]store.ScaleNote, error)
	ChordsByModeKey(ctx context.Context, mode, key string) ([]store.ModeScaleChord, error)
	SmoothProgression(
		ctx context.Context,
		mode, key, startChord string,
		length int,
		randomness float64,
		extraNotes []string,
		rootWeight, slashWeight float64,
		pinned, required []string,
		maxNotes, resultCount int,
		colorWeight float64,
		colorDevices []string,
	) ([]store.ProgressionStep, error)
}

// New builds an MCP server with all chord-analyzr tools registered.
func New(svc Service, version string) *mcp.Server {
	server := mcp.NewServer(&mcp.Implementation{
		Name:    "chord-analyzr",
		Title:   "Chord Analyzr",
		Version: version,
	}, nil)

	mcp.AddTool(server, &mcp.Tool{
		Name: "list_modes",
		Description: "List the scale modes chord-analyzr knows about (Ionian, Dorian, " +
			"Harmonic Minor, etc.). Use these names as the mode argument of the other tools.",
	}, toolListModes(svc))

	mcp.AddTool(server, &mcp.Tool{
		Name: "get_scale_notes",
		Description: "Get the notes of a scale, in order, for a given key and mode. " +
			"Useful for checking which notes are diatonic before picking chords or melody notes.",
	}, toolScaleNotes(svc))

	mcp.AddTool(server, &mcp.Tool{
		Name: "list_chords",
		Description: "List the chords that are fully diatonic to a key and mode, with the " +
			"notes each chord contains. These chord names are valid start_chord and pinned " +
			"values for generate_progression.",
	}, toolListChords(svc))

	mcp.AddTool(server, &mcp.Tool{
		Name: "generate_progression",
		Description: "Generate a chord progression in a key and mode, starting from a given " +
			"chord, optimized for smooth voice leading (minimal movement between adjacent " +
			"chords). Chords can be pinned to steps and melody notes can be required at " +
			"specific steps, which makes this useful for reharmonization: pin what is fixed, " +
			"require the melody notes, and let the search fill the rest. Flavor knobs shape " +
			"the sound: root_weight for purposeful cadential motion, slash_weight for a " +
			"smooth bass line with inversions, extra_notes for chromatic color on scale-" +
			"rooted chords, color_weight for chords rooted outside the scale (bVI, bVII, " +
			"Neapolitan, chromatic mediants -- the modal-interchange sound of film scores), " +
			"max_notes for leaner chords, randomness for variety. Set result_count to get " +
			"several alternative progressions to compare. Each result includes a " +
			"modal.chordbuildr.com URL that opens the progression ready to play.",
	}, toolProgression(svc))

	return server
}

type keyModeInput struct {
	Key  string `json:"key" jsonschema:"tonic key, e.g. C, F#, Bb"`
	Mode string `json:"mode" jsonschema:"mode name as returned by list_modes, e.g. Ionian"`
}

type modesOutput struct {
	Modes []string `json:"modes"`
}

func toolListModes(svc Service) mcp.ToolHandlerFor[struct{}, modesOutput] {
	return func(ctx context.Context, _ *mcp.CallToolRequest, _ struct{}) (*mcp.CallToolResult, modesOutput, error) {
		modes, err := svc.Modes(ctx)
		if err != nil {
			return nil, modesOutput{}, err
		}
		out := modesOutput{Modes: make([]string, 0, len(modes))}
		for _, m := range modes {
			out.Modes = append(out.Modes, m.Name)
		}
		return nil, out, nil
	}
}

type scaleOutput struct {
	Notes []string `json:"notes"`
	Hint  string   `json:"hint,omitempty"`
}

func toolScaleNotes(svc Service) mcp.ToolHandlerFor[keyModeInput, scaleOutput] {
	return func(ctx context.Context, _ *mcp.CallToolRequest, in keyModeInput) (*mcp.CallToolResult, scaleOutput, error) {
		notes, err := svc.ScaleNotes(ctx, in.Mode, in.Key)
		if err != nil {
			return nil, scaleOutput{}, err
		}
		out := scaleOutput{Notes: make([]string, 0, len(notes))}
		for _, n := range notes {
			out.Notes = append(out.Notes, strings.TrimSpace(n.NoteName))
		}
		if len(out.Notes) == 0 {
			out.Hint = noMatchHint(in.Mode, in.Key)
		}
		return nil, out, nil
	}
}

type chordSummary struct {
	Name  string `json:"name"`
	Notes string `json:"notes"`
}

type chordsOutput struct {
	Chords []chordSummary `json:"chords"`
	Hint   string         `json:"hint,omitempty"`
}

func toolListChords(svc Service) mcp.ToolHandlerFor[keyModeInput, chordsOutput] {
	return func(ctx context.Context, _ *mcp.CallToolRequest, in keyModeInput) (*mcp.CallToolResult, chordsOutput, error) {
		chords, err := svc.ChordsByModeKey(ctx, in.Mode, in.Key)
		if err != nil {
			return nil, chordsOutput{}, err
		}
		out := chordsOutput{Chords: make([]chordSummary, 0, len(chords))}
		for _, c := range chords {
			if c.ChordName == nil {
				continue
			}
			summary := chordSummary{Name: *c.ChordName}
			if c.ChordNoteNames != nil {
				summary.Notes = *c.ChordNoteNames
			}
			out.Chords = append(out.Chords, summary)
		}
		if len(out.Chords) == 0 {
			out.Hint = noMatchHint(in.Mode, in.Key)
		}
		return nil, out, nil
	}
}

type progressionInput struct {
	Key        string `json:"key" jsonschema:"tonic key, e.g. C, F#, Bb"`
	Mode       string `json:"mode" jsonschema:"mode name as returned by list_modes, e.g. Ionian"`
	StartChord string `json:"start_chord" jsonschema:"chord the progression starts on, e.g. Cmaj7; must be diatonic to the key and mode (see list_chords)"`
	Length     int    `json:"length,omitempty" jsonschema:"number of chords in the progression, 2-8 (default 4); up to 12 with color_weight > 0, which opens roots beyond the 7 scale degrees"`
	// the knobs below shape which progression wins the search; the reported
	// voice-leading costs are always the true motion
	RootWeight   float64  `json:"root_weight,omitempty" jsonschema:"0-10; higher makes the harmony sound more purposeful and cadential: favors strong functional root motion (above all descending fifths, as in ii-V-I) over smooth but aimless drifting; try 1-3"`
	SlashWeight  float64  `json:"slash_weight,omitempty" jsonschema:"0-10; above 0 allows inverted slash-chord voicings (Cmaj7/E) and favors a smooth, singable bass line under the progression; try 1-3"`
	Randomness   float64  `json:"randomness,omitempty" jsonschema:"0-1; adds variety: each call picks a different near-smoothest progression instead of always the same one; 0 (default) is deterministic"`
	ExtraNotes   []string `json:"extra_notes,omitempty" jsonschema:"non-scale notes chords may borrow, e.g. ['F#'] in C Ionian; adds chromatic color (secondary-dominant and borrowed-chord flavor) -- at least one chord will use one when possible"`
	MaxNotes     int      `json:"max_notes,omitempty" jsonschema:"soft cap on chord size, try 3-5: leans the result toward punchier, less dense chords (an oversized chord still appears when nothing leaner comes close); 0 (default) is no cap"`
	ColorWeight  float64  `json:"color_weight,omitempty" jsonschema:"0-10; above 0 lets the progression borrow chords ROOTED outside the scale -- bVI, bVII, the Neapolitan, chromatic mediants -- the bold modal-interchange color of cinematic and heroic harmony (extra_notes colors the tones of scale-rooted chords; this colors the roots); higher = more willing to pay for color: 1 favors gentle borrowed chords, 3 admits raw chromaticism; at least one borrowed-root chord appears when possible; also lifts the max length to 12; 0 (default) keeps every root in the scale"`
	ColorDevices []string `json:"color_devices,omitempty" jsonschema:"with color_weight > 0, restrict borrowed-root chords to specific harmonic devices: 'borrowed' (modal interchange from the parallel modes -- bVI, bVII, iv), 'mediant' (chromatic-mediant triad moves, the film-score chain), 'secondary_dominant', 'tritone_sub', 'chromatic' (anything else); empty (default) allows all; e.g. ['mediant'] for the heroic Silvestri/Williams sound, ['borrowed'] for pure modal interchange"`
	Pinned       []string `json:"pinned,omitempty" jsonschema:"chords the progression must contain; each entry is 'Chord' (placed wherever it fits best) or 'Chord@step' for a fixed 1-based step, e.g. G7@3"`
	Required     []string `json:"required_notes,omitempty" jsonschema:"notes the chord at a step must contain, as 'Note@step' with a 1-based step, e.g. Bb@3; useful for harmonizing a melody"`
	ResultCount  int      `json:"result_count,omitempty" jsonschema:"1-10 (default 1): how many alternative progressions to return, best first, each a distinct chord sequence; ask for several to compare and pick"`
}

type progressionOutput struct {
	Steps []progressionStep `json:"steps"`
	// TotalCost is the summed voice-leading distance across the progression;
	// lower is smoother.
	TotalCost int32 `json:"total_cost"`
	// URL opens the progression in modal.chordbuildr.com, ready to play on the
	// electric-piano voice.
	URL string `json:"url,omitempty"`
	// Alternatives are the runner-up progressions when result_count > 1,
	// best first.
	Alternatives []alternativeProgression `json:"alternatives,omitempty"`
	Hint         string                   `json:"hint,omitempty"`
}

type alternativeProgression struct {
	Steps     []progressionStep `json:"steps"`
	TotalCost int32             `json:"total_cost"`
	URL       string            `json:"url,omitempty"`
}

type progressionStep struct {
	Step  int32  `json:"step"`
	Chord string `json:"chord"`
	// VLFromPrev is the voice-leading distance from the previous chord.
	VLFromPrev int32 `json:"vl_from_prev"`
}

func toolProgression(svc Service) mcp.ToolHandlerFor[progressionInput, progressionOutput] {
	return func(ctx context.Context, _ *mcp.CallToolRequest, in progressionInput) (*mcp.CallToolResult, progressionOutput, error) {
		length := in.Length
		if length == 0 {
			length = 4
		}
		resultCount := in.ResultCount
		if resultCount == 0 {
			resultCount = 1
		}
		steps, err := svc.SmoothProgression(
			ctx, in.Mode, in.Key, in.StartChord, length,
			in.Randomness, in.ExtraNotes, in.RootWeight, in.SlashWeight,
			in.Pinned, in.Required, in.MaxNotes, resultCount,
			in.ColorWeight, in.ColorDevices)
		if err != nil {
			return nil, progressionOutput{}, err
		}

		// group the rows into progressions; they arrive ordered by
		// progression id, then step
		var groups []alternativeProgression
		var chordNames [][]string
		lastID := int32(-1)
		for _, s := range steps {
			if len(groups) == 0 || s.ProgressionID != lastID {
				groups = append(groups, alternativeProgression{})
				chordNames = append(chordNames, nil)
				lastID = s.ProgressionID
			}
			g := &groups[len(groups)-1]
			g.Steps = append(g.Steps, progressionStep{
				Step: s.Step, Chord: s.Chord, VLFromPrev: s.VLFromPrev,
			})
			g.TotalCost = s.TotalCost
			chordNames[len(chordNames)-1] = append(chordNames[len(chordNames)-1], s.Chord)
		}

		// Attach a shareable chordbuildr link per progression. Best-effort: an
		// encoding error (e.g. an unrecognized chord type) just omits the URL
		// rather than failing the whole call.
		if len(groups) > 0 {
			if modes, merr := svc.Modes(ctx); merr == nil {
				modeIndex := modeIndexByID(modes, in.Mode)
				for i := range groups {
					if link, uerr := buildProgressionURL(in.Key, modeIndex, chordNames[i]); uerr == nil {
						groups[i].URL = link
					}
				}
			}
		}

		out := progressionOutput{Steps: []progressionStep{}}
		if len(groups) > 0 {
			out.Steps = groups[0].Steps
			out.TotalCost = groups[0].TotalCost
			out.URL = groups[0].URL
			out.Alternatives = groups[1:]
			if len(out.Alternatives) == 0 {
				out.Alternatives = nil
			}
		} else {
			out.Hint = fmt.Sprintf(
				"no progression found for mode=%q key=%q start_chord=%q; check the mode with "+
					"list_modes, the chord name with list_chords, and that pinned chords and "+
					"required notes are satisfiable",
				in.Mode, in.Key, in.StartChord)
		}
		return nil, out, nil
	}
}

func noMatchHint(mode, key string) string {
	return fmt.Sprintf(
		"no results for mode=%q key=%q; check the mode name with list_modes and use a plain "+
			"key name like C, F#, or Bb", mode, key)
}
