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
		rootWeight, slashWeight float64,
		pinned, required []string,
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
			"require the melody notes, and let the search fill the rest. The result includes " +
			"a modal.chordbuildr.com URL that opens the progression ready to play.",
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
	Length     int    `json:"length,omitempty" jsonschema:"number of chords in the progression, 2-8 (default 4)"`
	// the two weights bias the ordering of otherwise-equal candidates
	RootWeight  float64  `json:"root_weight,omitempty" jsonschema:"0-10; higher values prefer root-position chords"`
	SlashWeight float64  `json:"slash_weight,omitempty" jsonschema:"0-10; higher values penalize slash (inverted) chords"`
	Pinned      []string `json:"pinned,omitempty" jsonschema:"chords the progression must contain; each entry is 'Chord' (placed wherever it fits best) or 'Chord@step' for a fixed 1-based step, e.g. G7@3"`
	Required    []string `json:"required_notes,omitempty" jsonschema:"notes the chord at a step must contain, as 'Note@step' with a 1-based step, e.g. Bb@3; useful for harmonizing a melody"`
}

type progressionOutput struct {
	Steps []progressionStep `json:"steps"`
	// TotalCost is the summed voice-leading distance across the progression;
	// lower is smoother.
	TotalCost int32 `json:"total_cost"`
	// URL opens the progression in modal.chordbuildr.com, ready to play on the
	// electric-piano voice.
	URL  string `json:"url,omitempty"`
	Hint string `json:"hint,omitempty"`
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
		steps, err := svc.SmoothProgression(
			ctx, in.Mode, in.Key, in.StartChord, length,
			in.RootWeight, in.SlashWeight, in.Pinned, in.Required)
		if err != nil {
			return nil, progressionOutput{}, err
		}
		out := progressionOutput{Steps: make([]progressionStep, 0, len(steps))}
		chordNames := make([]string, 0, len(steps))
		for _, s := range steps {
			out.Steps = append(out.Steps, progressionStep{
				Step: s.Step, Chord: s.Chord, VLFromPrev: s.VLFromPrev,
			})
			out.TotalCost = s.TotalCost
			chordNames = append(chordNames, s.Chord)
		}
		// Attach a shareable chordbuildr link. Best-effort: an encoding error
		// (e.g. an unrecognized chord type) just omits the URL rather than
		// failing the whole call.
		if len(chordNames) > 0 {
			if modes, merr := svc.Modes(ctx); merr == nil {
				if link, uerr := buildProgressionURL(in.Key, modeIndexByID(modes, in.Mode), chordNames); uerr == nil {
					out.URL = link
				}
			}
		}
		if len(out.Steps) == 0 {
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
