package service

import (
	"context"
	"reflect"
	"testing"

	"github.com/jekrch/chord-analyzr/api-go/internal/store"
)

// fakeStore records the arguments SmoothProgression was called with.
type fakeStore struct {
	store.Store // panic on anything not overridden

	mode, key, startChord   string
	length                  int
	randomness              float64
	extraNotes              []string
	rootWeight, slashWeight float64
	pins                    []store.Pin
	required                []store.RequiredNote
	bass                    []store.BassNote
	minNotes                int
	maxNotes, resultCount   int
	colorWeight             float64
	colorDevices            []string
	ending                  string
	loopWeight              float64
	brightness              float64
	avoidNotes              []string
	motionProfile           string
	revisitWeight           float64
}

func (f *fakeStore) SmoothProgression(
	_ context.Context,
	mode, key, startChord string,
	length int,
	randomness float64,
	extraNotes []string,
	rootWeight, slashWeight float64,
	pins []store.Pin,
	required []store.RequiredNote,
	bass []store.BassNote,
	minNotes, maxNotes, resultCount int,
	colorWeight float64,
	colorDevices []string,
	ending string,
	loopWeight float64,
	brightness float64,
	avoidNotes []string,
	motionProfile string,
	revisitWeight float64,
) ([]store.ProgressionStep, error) {
	f.mode, f.key, f.startChord = mode, key, startChord
	f.length = length
	f.randomness = randomness
	f.extraNotes = extraNotes
	f.rootWeight, f.slashWeight = rootWeight, slashWeight
	f.pins = pins
	f.required = required
	f.bass = bass
	f.minNotes = minNotes
	f.maxNotes, f.resultCount = maxNotes, resultCount
	f.colorWeight = colorWeight
	f.colorDevices = colorDevices
	f.ending = ending
	f.loopWeight = loopWeight
	f.brightness = brightness
	f.avoidNotes = avoidNotes
	f.motionProfile = motionProfile
	f.revisitWeight = revisitWeight
	return nil, nil
}

func callProgression(t *testing.T, length int, rootWeight, slashWeight float64, key string, pinned []string) *fakeStore {
	t.Helper()
	fs := &fakeStore{}
	_, err := New(fs).SmoothProgression(
		context.Background(), "Ionian", key, "Cmaj7", length,
		0, nil, rootWeight, slashWeight, pinned, nil, nil, 0, 0, 1, 0, nil, "", 0, 0, nil, "", 0)
	if err != nil {
		t.Fatalf("SmoothProgression returned error: %v", err)
	}
	return fs
}

func TestSanitizesKeyAndPassesLengthAndWeightsThrough(t *testing.T) {
	fs := callProgression(t, 4, 2.0, 3.0, "c", nil)

	// key "c" is normalised to "C"; a valid length and both weights pass unchanged
	if fs.key != "C" || fs.length != 4 || fs.rootWeight != 2.0 || fs.slashWeight != 3.0 {
		t.Errorf("got key=%q length=%d rootWeight=%v slashWeight=%v, want C 4 2 3",
			fs.key, fs.length, fs.rootWeight, fs.slashWeight)
	}
}

func TestClampsLengthAboveMax(t *testing.T) {
	if fs := callProgression(t, 100, 0, 0, "C", nil); fs.length != 8 {
		t.Errorf("length = %d, want 8", fs.length)
	}
}

func TestClampsLengthBelowMin(t *testing.T) {
	if fs := callProgression(t, 0, 0, 0, "C", nil); fs.length != 2 {
		t.Errorf("length = %d, want 2", fs.length)
	}
}

func TestClampsWeightAboveMax(t *testing.T) {
	fs := callProgression(t, 4, 0, 50.0, "C", nil)
	// a weight above the cap is pinned to 10
	if fs.rootWeight != 0 || fs.slashWeight != 10.0 {
		t.Errorf("weights = %v/%v, want 0/10", fs.rootWeight, fs.slashWeight)
	}
}

func TestClampsNegativeWeightsToZero(t *testing.T) {
	fs := callProgression(t, 4, -5.0, -1.0, "C", nil)
	if fs.rootWeight != 0 || fs.slashWeight != 0 {
		t.Errorf("weights = %v/%v, want 0/0", fs.rootWeight, fs.slashWeight)
	}
}

func TestParsePins(t *testing.T) {
	repeat := func(s string, n int) []string {
		out := make([]string, n)
		for i := range out {
			out[i] = s
		}
		return out
	}

	tests := []struct {
		name   string
		pinned []string
		want   []store.Pin
	}{
		{
			// a bare pin floats (position 0); "@step" fixes the step
			name:   "splits pins into chords and positions",
			pinned: []string{"Am7", "G7@3"},
			want:   []store.Pin{{Chord: "Am7"}, {Chord: "G7", Position: 3}},
		},
		{
			// not a step suffix -> whole entry is the chord name (the SQL
			// function drops names it cannot resolve)
			name:   "keeps non-numeric @ suffix as part of the chord name",
			pinned: []string{"Am7@x"},
			want:   []store.Pin{{Chord: "Am7@x"}},
		},
		{
			name:   "trims pins and skips blank entries",
			pinned: []string{" Am7 @ 3 ", "  "},
			want:   []store.Pin{{Chord: "Am7", Position: 3}},
		},
		{
			// capped at 8 entries -- more could never fit anyway
			name:   "caps the number of pins",
			pinned: repeat("Am7", 20),
			want: []store.Pin{
				{Chord: "Am7"}, {Chord: "Am7"}, {Chord: "Am7"}, {Chord: "Am7"},
				{Chord: "Am7"}, {Chord: "Am7"}, {Chord: "Am7"}, {Chord: "Am7"},
			},
		},
		{
			name:   "clamps negative pin step to floating",
			pinned: []string{"G7@-2"},
			want:   []store.Pin{{Chord: "G7"}},
		},
		{
			name:   "nil input yields no pins",
			pinned: nil,
			want:   nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ParsePins(tt.pinned); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ParsePins(%q) = %v, want %v", tt.pinned, got, tt.want)
			}
		})
	}
}

func TestParseRequiredNotes(t *testing.T) {
	tests := []struct {
		name     string
		required []string
		want     []store.RequiredNote
	}{
		{
			// same "@step" syntax as pins; several entries may share a step
			name:     "splits entries into notes and positions",
			required: []string{"A@3", "Eb@3", "F@5"},
			want: []store.RequiredNote{
				{Note: "A", Position: 3}, {Note: "Eb", Position: 3}, {Note: "F", Position: 5},
			},
		},
		{
			// a step-less or negative-step entry parses to position 0, which
			// the SQL function drops
			name:     "step-less and negative-step entries float to zero",
			required: []string{"A", "Bb@-2"},
			want:     []store.RequiredNote{{Note: "A"}, {Note: "Bb"}},
		},
		{
			name:     "trims entries and skips blank ones",
			required: []string{" Eb @ 3 ", "  "},
			want:     []store.RequiredNote{{Note: "Eb", Position: 3}},
		},
		{
			name:     "nil input yields no requirements",
			required: nil,
			want:     nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ParseRequiredNotes(tt.required); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ParseRequiredNotes(%q) = %v, want %v", tt.required, got, tt.want)
			}
		})
	}
}

func TestParseBassNotes(t *testing.T) {
	tests := []struct {
		name string
		bass []string
		want []store.BassNote
	}{
		{
			// same "@step" syntax as pins and required notes
			name: "splits entries into notes and positions",
			bass: []string{"C@2", "B@3", "A@4"},
			want: []store.BassNote{
				{Note: "C", Position: 2}, {Note: "B", Position: 3}, {Note: "A", Position: 4},
			},
		},
		{
			// a step-less or negative-step entry parses to position 0, which
			// the SQL function drops
			name: "step-less and negative-step entries float to zero",
			bass: []string{"C", "G@-2"},
			want: []store.BassNote{{Note: "C"}, {Note: "G"}},
		},
		{
			name: "trims entries and skips blank ones",
			bass: []string{" Eb @ 3 ", "  "},
			want: []store.BassNote{{Note: "Eb", Position: 3}},
		},
		{
			name: "nil input yields no requirements",
			bass: nil,
			want: nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ParseBassNotes(tt.bass); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ParseBassNotes(%q) = %v, want %v", tt.bass, got, tt.want)
			}
		})
	}
}

func TestParseBassNotesCapsEntries(t *testing.T) {
	many := make([]string, 20)
	for i := range many {
		many[i] = "C@2"
	}
	if got := ParseBassNotes(many); len(got) != 12 {
		t.Errorf("len = %d, want 12", len(got))
	}
}

func TestPassesBassNotesAndMinNotesThrough(t *testing.T) {
	fs := &fakeStore{}
	_, err := New(fs).SmoothProgression(
		context.Background(), "Ionian", "C", "Cmaj7", 4,
		0, nil, 0, 0, nil, nil, []string{"C@2"}, 4, 0, 1, 0, nil, "", 0, 0, nil, "", 0)
	if err != nil {
		t.Fatalf("SmoothProgression returned error: %v", err)
	}
	if want := []store.BassNote{{Note: "C", Position: 2}}; !reflect.DeepEqual(fs.bass, want) {
		t.Errorf("bass = %v, want %v", fs.bass, want)
	}
	if fs.minNotes != 4 {
		t.Errorf("minNotes = %d, want 4", fs.minNotes)
	}

	// a negative floor clamps to 0 (no floor), like maxNotes
	fs = &fakeStore{}
	_, err = New(fs).SmoothProgression(
		context.Background(), "Ionian", "C", "Cmaj7", 4,
		0, nil, 0, 0, nil, nil, nil, -3, 0, 1, 0, nil, "", 0, 0, nil, "", 0)
	if err != nil {
		t.Fatalf("SmoothProgression returned error: %v", err)
	}
	if fs.minNotes != 0 {
		t.Errorf("minNotes = %d, want 0 (clamped)", fs.minNotes)
	}
}

func TestPassesRequiredNotesThrough(t *testing.T) {
	fs := &fakeStore{}
	_, err := New(fs).SmoothProgression(
		context.Background(), "Ionian", "C", "Cmaj7", 4, 0, nil, 0, 0, nil, []string{"A@3"}, nil, 0, 0, 1, 0, nil, "", 0, 0, nil, "", 0)
	if err != nil {
		t.Fatalf("SmoothProgression returned error: %v", err)
	}
	if want := []store.RequiredNote{{Note: "A", Position: 3}}; !reflect.DeepEqual(fs.required, want) {
		t.Errorf("required = %v, want %v", fs.required, want)
	}
}

// the creative knobs: randomness clamps to [0,1], extra notes are trimmed and
// blanks dropped, max notes floors at 0, result count clamps to 1..10
func TestClampsCreativeKnobs(t *testing.T) {
	call := func(randomness float64, extra []string, maxNotes, resultCount int) *fakeStore {
		t.Helper()
		fs := &fakeStore{}
		_, err := New(fs).SmoothProgression(
			context.Background(), "Ionian", "C", "Cmaj7", 4,
			randomness, extra, 0, 0, nil, nil, nil, 0, maxNotes, resultCount, 0, nil, "", 0, 0, nil, "", 0)
		if err != nil {
			t.Fatalf("SmoothProgression returned error: %v", err)
		}
		return fs
	}

	if fs := call(2.5, nil, -3, 0); fs.randomness != 1 || fs.maxNotes != 0 || fs.resultCount != 1 {
		t.Errorf("got randomness=%v maxNotes=%d resultCount=%d, want 1 0 1",
			fs.randomness, fs.maxNotes, fs.resultCount)
	}
	if fs := call(-1, nil, 4, 100); fs.randomness != 0 || fs.maxNotes != 4 || fs.resultCount != 10 {
		t.Errorf("got randomness=%v maxNotes=%d resultCount=%d, want 0 4 10",
			fs.randomness, fs.maxNotes, fs.resultCount)
	}
	if fs := call(0.5, []string{" F# ", "  ", "Bb"}, 0, 3); fs.randomness != 0.5 ||
		!reflect.DeepEqual(fs.extraNotes, []string{"F#", "Bb"}) || fs.resultCount != 3 {
		t.Errorf("got randomness=%v extraNotes=%v resultCount=%d, want 0.5 [F# Bb] 3",
			fs.randomness, fs.extraNotes, fs.resultCount)
	}
}

// color: the weight clamps like the other weights, device tags are trimmed
// with blanks dropped, and a positive weight lifts the length cap to 12
func TestColorKnobs(t *testing.T) {
	call := func(length int, colorWeight float64, devices []string) *fakeStore {
		t.Helper()
		fs := &fakeStore{}
		_, err := New(fs).SmoothProgression(
			context.Background(), "Ionian", "C", "Cmaj7", length,
			0, nil, 0, 0, nil, nil, nil, 0, 0, 1, colorWeight, devices, "", 0, 0, nil, "", 0)
		if err != nil {
			t.Fatalf("SmoothProgression returned error: %v", err)
		}
		return fs
	}

	if fs := call(4, 50, nil); fs.colorWeight != 10 {
		t.Errorf("colorWeight = %v, want 10", fs.colorWeight)
	}
	if fs := call(4, -2, nil); fs.colorWeight != 0 {
		t.Errorf("colorWeight = %v, want 0", fs.colorWeight)
	}
	if fs := call(4, 2, []string{" mediant ", "  ", "borrowed"}); !reflect.DeepEqual(
		fs.colorDevices, []string{"mediant", "borrowed"}) {
		t.Errorf("colorDevices = %v, want [mediant borrowed]", fs.colorDevices)
	}

	// without color the length cap stays at 8; with color it rises to 12
	if fs := call(100, 0, nil); fs.length != 8 {
		t.Errorf("length = %d, want 8 with color off", fs.length)
	}
	if fs := call(100, 2, nil); fs.length != 12 {
		t.Errorf("length = %d, want 12 with color on", fs.length)
	}
	// a negative weight clamps to 0, so it must not lift the cap
	if fs := call(100, -2, nil); fs.length != 8 {
		t.Errorf("length = %d, want 8 with a negative color weight", fs.length)
	}
}

// revisit weight clamps like the other weights and lifts the length cap to
// 12, the same way color does
func TestRevisitWeightKnob(t *testing.T) {
	call := func(length int, revisitWeight float64) *fakeStore {
		t.Helper()
		fs := &fakeStore{}
		_, err := New(fs).SmoothProgression(
			context.Background(), "Ionian", "C", "Cmaj7", length,
			0, nil, 0, 0, nil, nil, nil, 0, 0, 1, 0, nil, "", 0, 0, nil, "", revisitWeight)
		if err != nil {
			t.Fatalf("SmoothProgression returned error: %v", err)
		}
		return fs
	}

	if fs := call(4, 50); fs.revisitWeight != 10 {
		t.Errorf("revisitWeight = %v, want 10 (clamped)", fs.revisitWeight)
	}
	if fs := call(100, 2); fs.length != 12 {
		t.Errorf("length = %d, want 12 with revisit on", fs.length)
	}
	// a negative weight clamps to 0, so it must not lift the cap
	if fs := call(100, -2); fs.length != 8 || fs.revisitWeight != 0 {
		t.Errorf("got length=%d revisitWeight=%v, want 8 0", fs.length, fs.revisitWeight)
	}
}

// ending normalizes to the known lowercase cadence names; loop weight clamps
// like the other weights
func TestEndingAndLoopKnobs(t *testing.T) {
	call := func(ending string, loopWeight float64) *fakeStore {
		t.Helper()
		fs := &fakeStore{}
		_, err := New(fs).SmoothProgression(
			context.Background(), "Ionian", "C", "Cmaj7", 4,
			0, nil, 0, 0, nil, nil, nil, 0, 0, 1, 0, nil, ending, loopWeight, 0, nil, "", 0)
		if err != nil {
			t.Fatalf("SmoothProgression returned error: %v", err)
		}
		return fs
	}

	if fs := call(" Authentic ", 50); fs.ending != "authentic" || fs.loopWeight != 10 {
		t.Errorf("got ending=%q loopWeight=%v, want authentic 10", fs.ending, fs.loopWeight)
	}
	if fs := call("zzz", -2); fs.ending != "" || fs.loopWeight != 0 {
		t.Errorf("got ending=%q loopWeight=%v, want empty 0", fs.ending, fs.loopWeight)
	}
}

func TestParseEnding(t *testing.T) {
	tests := []struct{ in, want string }{
		{"authentic", "authentic"},
		{"HALF", "half"},
		{" deceptive ", "deceptive"},
		{"plagal", "plagal"},
		{"open", "open"},
		{"cadence", ""},
		{"", ""},
	}
	for _, tt := range tests {
		if got := ParseEnding(tt.in); got != tt.want {
			t.Errorf("ParseEnding(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

// brightness clamps to [-1,1] (unlike the other weights, negative values are
// meaningful); avoid notes are trimmed and blanks dropped; motion profile
// normalizes to a known lowercase name
func TestBrightnessAvoidNotesAndMotionProfileKnobs(t *testing.T) {
	call := func(brightness float64, avoid []string, motion string) *fakeStore {
		t.Helper()
		fs := &fakeStore{}
		_, err := New(fs).SmoothProgression(
			context.Background(), "Ionian", "C", "Cmaj7", 4,
			0, nil, 0, 0, nil, nil, nil, 0, 0, 1, 0, nil, "", 0, brightness, avoid, motion, 0)
		if err != nil {
			t.Fatalf("SmoothProgression returned error: %v", err)
		}
		return fs
	}

	if fs := call(50, nil, ""); fs.brightness != 1 {
		t.Errorf("brightness = %v, want 1 (clamped)", fs.brightness)
	}
	if fs := call(-50, nil, ""); fs.brightness != -1 {
		t.Errorf("brightness = %v, want -1 (clamped)", fs.brightness)
	}
	if fs := call(-0.5, nil, ""); fs.brightness != -0.5 {
		t.Errorf("brightness = %v, want -0.5 (negative values pass through)", fs.brightness)
	}
	if fs := call(0, []string{" B ", "  ", "F"}, ""); !reflect.DeepEqual(
		fs.avoidNotes, []string{"B", "F"}) {
		t.Errorf("avoidNotes = %v, want [B F]", fs.avoidNotes)
	}
	if fs := call(0, nil, " Mediant "); fs.motionProfile != "mediant" {
		t.Errorf("motionProfile = %q, want mediant", fs.motionProfile)
	}
	if fs := call(0, nil, "zzz"); fs.motionProfile != "functional" {
		t.Errorf("motionProfile = %q, want functional (fallback)", fs.motionProfile)
	}
}

func TestParseAvoidNotesCapsEntries(t *testing.T) {
	many := make([]string, 20)
	for i := range many {
		many[i] = "B"
	}
	if got := ParseAvoidNotes(many); len(got) != 12 {
		t.Errorf("len = %d, want 12", len(got))
	}
	if got := ParseAvoidNotes(nil); got != nil {
		t.Errorf("ParseAvoidNotes(nil) = %v, want nil", got)
	}
}

func TestParseMotionProfile(t *testing.T) {
	tests := []struct{ in, want string }{
		{"functional", "functional"},
		{"MEDIANT", "mediant"},
		{" stepwise ", "stepwise"},
		{"static", "static"},
		{"zzz", "functional"},
		{"", "functional"},
	}
	for _, tt := range tests {
		if got := ParseMotionProfile(tt.in); got != tt.want {
			t.Errorf("ParseMotionProfile(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

func TestParseColorDevicesCapsEntries(t *testing.T) {
	many := make([]string, 10)
	for i := range many {
		many[i] = "borrowed"
	}
	if got := ParseColorDevices(many); len(got) != 5 {
		t.Errorf("len = %d, want 5", len(got))
	}
	if got := ParseColorDevices(nil); got != nil {
		t.Errorf("ParseColorDevices(nil) = %v, want nil", got)
	}
}

func TestParseExtraNotesCapsEntries(t *testing.T) {
	many := make([]string, 20)
	for i := range many {
		many[i] = "F#"
	}
	if got := ParseExtraNotes(many); len(got) != 12 {
		t.Errorf("len = %d, want 12", len(got))
	}
	if got := ParseExtraNotes(nil); got != nil {
		t.Errorf("ParseExtraNotes(nil) = %v, want nil", got)
	}
}

func TestSanitizeKeyName(t *testing.T) {
	tests := []struct{ in, want string }{
		{"c", "C"},
		{"AB", "Ab"},
		{"", ""},
		{"f#", "F#"},
	}
	for _, tt := range tests {
		if got := SanitizeKeyName(tt.in); got != tt.want {
			t.Errorf("SanitizeKeyName(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}
