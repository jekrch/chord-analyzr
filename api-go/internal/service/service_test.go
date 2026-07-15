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
	rootWeight, slashWeight float64
	pins                    []store.Pin
}

func (f *fakeStore) SmoothProgression(
	_ context.Context,
	mode, key, startChord string,
	length int,
	rootWeight, slashWeight float64,
	pins []store.Pin,
) ([]store.ProgressionStep, error) {
	f.mode, f.key, f.startChord = mode, key, startChord
	f.length = length
	f.rootWeight, f.slashWeight = rootWeight, slashWeight
	f.pins = pins
	return nil, nil
}

func callProgression(t *testing.T, length int, rootWeight, slashWeight float64, key string, pinned []string) *fakeStore {
	t.Helper()
	fs := &fakeStore{}
	_, err := New(fs).SmoothProgression(
		context.Background(), "Ionian", key, "Cmaj7", length, rootWeight, slashWeight, pinned)
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
