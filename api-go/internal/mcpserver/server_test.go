package mcpserver

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/jekrch/chord-analyzr/api-go/internal/store"
)

// fakeService returns canned data and records the arguments it was called with.
type fakeService struct {
	modes  []store.Mode
	notes  []store.ScaleNote
	chords []store.ModeScaleChord
	steps  []store.ProgressionStep
	err    error

	gotMode, gotKey, gotStart string
	gotLength                 int
	gotPinned, gotRequired    []string
}

func (f *fakeService) Modes(context.Context) ([]store.Mode, error) {
	return f.modes, f.err
}

func (f *fakeService) ScaleNotes(_ context.Context, mode, key string) ([]store.ScaleNote, error) {
	f.gotMode, f.gotKey = mode, key
	return f.notes, f.err
}

func (f *fakeService) ChordsByModeKey(_ context.Context, mode, key string) ([]store.ModeScaleChord, error) {
	f.gotMode, f.gotKey = mode, key
	return f.chords, f.err
}

func (f *fakeService) SmoothProgression(
	_ context.Context,
	mode, key, startChord string,
	length int,
	_, _ float64,
	pinned, required []string,
) ([]store.ProgressionStep, error) {
	f.gotMode, f.gotKey, f.gotStart = mode, key, startChord
	f.gotLength = length
	f.gotPinned, f.gotRequired = pinned, required
	return f.steps, f.err
}

// connect wires the server to an in-memory client session; call the returned
// session to exercise tools end to end through the protocol layer.
func connect(t *testing.T, svc Service) *mcp.ClientSession {
	t.Helper()
	ctx := t.Context()
	serverTransport, clientTransport := mcp.NewInMemoryTransports()

	server := New(svc, "test")
	if _, err := server.Connect(ctx, serverTransport, nil); err != nil {
		t.Fatalf("server connect: %v", err)
	}

	client := mcp.NewClient(&mcp.Implementation{Name: "test-client", Version: "test"}, nil)
	session, err := client.Connect(ctx, clientTransport, nil)
	if err != nil {
		t.Fatalf("client connect: %v", err)
	}
	t.Cleanup(func() { session.Close() })
	return session
}

// call invokes a tool and unmarshals its structured content into out.
func call(t *testing.T, session *mcp.ClientSession, tool string, args, out any) *mcp.CallToolResult {
	t.Helper()
	res, err := session.CallTool(t.Context(), &mcp.CallToolParams{Name: tool, Arguments: args})
	if err != nil {
		t.Fatalf("call %s: %v", tool, err)
	}
	if res.IsError {
		t.Fatalf("call %s returned tool error: %v", tool, res.Content)
	}
	raw, err := json.Marshal(res.StructuredContent)
	if err != nil {
		t.Fatalf("marshal structured content: %v", err)
	}
	if err := json.Unmarshal(raw, out); err != nil {
		t.Fatalf("unmarshal structured content: %v", err)
	}
	return res
}

func TestListTools(t *testing.T) {
	session := connect(t, &fakeService{})
	res, err := session.ListTools(t.Context(), nil)
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]bool{
		"list_modes": false, "get_scale_notes": false,
		"list_chords": false, "generate_progression": false,
	}
	for _, tool := range res.Tools {
		if _, ok := want[tool.Name]; !ok {
			t.Errorf("unexpected tool %q", tool.Name)
		}
		want[tool.Name] = true
	}
	for name, seen := range want {
		if !seen {
			t.Errorf("tool %q not registered", name)
		}
	}
}

func TestListModes(t *testing.T) {
	svc := &fakeService{modes: []store.Mode{{ID: 1, Name: "Dorian"}, {ID: 2, Name: "Ionian"}}}
	session := connect(t, svc)

	var out modesOutput
	call(t, session, "list_modes", struct{}{}, &out)
	if len(out.Modes) != 2 || out.Modes[0] != "Dorian" || out.Modes[1] != "Ionian" {
		t.Errorf("modes = %v, want [Dorian Ionian]", out.Modes)
	}
}

func TestGetScaleNotes(t *testing.T) {
	svc := &fakeService{notes: []store.ScaleNote{
		{SeqNote: 1, NoteName: "C "}, {SeqNote: 2, NoteName: "D"},
	}}
	session := connect(t, svc)

	var out scaleOutput
	call(t, session, "get_scale_notes", map[string]any{"key": "C", "mode": "Ionian"}, &out)
	if len(out.Notes) != 2 || out.Notes[0] != "C" || out.Notes[1] != "D" {
		t.Errorf("notes = %v, want [C D] (trimmed)", out.Notes)
	}
	if svc.gotMode != "Ionian" || svc.gotKey != "C" {
		t.Errorf("service called with mode=%q key=%q", svc.gotMode, svc.gotKey)
	}
	if out.Hint != "" {
		t.Errorf("unexpected hint %q", out.Hint)
	}
}

func TestGetScaleNotesEmptyHasHint(t *testing.T) {
	session := connect(t, &fakeService{})

	var out scaleOutput
	call(t, session, "get_scale_notes", map[string]any{"key": "H", "mode": "Nope"}, &out)
	if out.Hint == "" {
		t.Error("want hint on empty result")
	}
}

func TestListChords(t *testing.T) {
	name, notes := "Cmaj7", "C, E, G, B"
	svc := &fakeService{chords: []store.ModeScaleChord{
		{ChordName: &name, ChordNoteNames: &notes},
		{ChordName: nil}, // unnamed rows are dropped
	}}
	session := connect(t, svc)

	var out chordsOutput
	call(t, session, "list_chords", map[string]any{"key": "C", "mode": "Ionian"}, &out)
	if len(out.Chords) != 1 {
		t.Fatalf("chords = %v, want 1 entry", out.Chords)
	}
	if out.Chords[0].Name != "Cmaj7" || out.Chords[0].Notes != "C, E, G, B" {
		t.Errorf("chord = %+v", out.Chords[0])
	}
}

func TestGenerateProgression(t *testing.T) {
	svc := &fakeService{steps: []store.ProgressionStep{
		{Step: 1, Chord: "Cmaj7", VLFromPrev: 0, TotalCost: 5},
		{Step: 2, Chord: "Am7", VLFromPrev: 2, TotalCost: 5},
	}}
	session := connect(t, svc)

	var out progressionOutput
	call(t, session, "generate_progression", map[string]any{
		"key": "C", "mode": "Ionian", "start_chord": "Cmaj7",
		"pinned": []string{"Am7@2"}, "required_notes": []string{"E@2"},
	}, &out)

	if len(out.Steps) != 2 || out.Steps[1].Chord != "Am7" {
		t.Errorf("steps = %+v", out.Steps)
	}
	if out.TotalCost != 5 {
		t.Errorf("total cost = %d, want 5", out.TotalCost)
	}
	if svc.gotLength != 4 {
		t.Errorf("length defaulted to %d, want 4", svc.gotLength)
	}
	if len(svc.gotPinned) != 1 || svc.gotPinned[0] != "Am7@2" {
		t.Errorf("pinned = %v", svc.gotPinned)
	}
	if len(svc.gotRequired) != 1 || svc.gotRequired[0] != "E@2" {
		t.Errorf("required = %v", svc.gotRequired)
	}
}

func TestGenerateProgressionEmptyHasHint(t *testing.T) {
	session := connect(t, &fakeService{})

	var out progressionOutput
	call(t, session, "generate_progression", map[string]any{
		"key": "C", "mode": "Ionian", "start_chord": "Znope",
	}, &out)
	if out.Hint == "" {
		t.Error("want hint on empty result")
	}
}

func TestServiceErrorBecomesToolError(t *testing.T) {
	session := connect(t, &fakeService{err: errors.New("db down")})

	res, err := session.CallTool(t.Context(), &mcp.CallToolParams{
		Name: "list_modes", Arguments: struct{}{},
	})
	if err != nil {
		t.Fatalf("protocol error: %v", err)
	}
	if !res.IsError {
		t.Error("want IsError on service failure")
	}
}
