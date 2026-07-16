package mcpserver

import (
	"testing"

	"github.com/jekrch/chord-analyzr/api-go/internal/store"
)

func TestBuildProgressionURL(t *testing.T) {
	// C Ionian, the 90s-R&B I-vi-ii-V. Key and mode are both index 0.
	got, err := buildProgressionURL("C", 0, []string{"Cmaj7", "Am9", "Dm9", "G13"})
	if err != nil {
		t.Fatalf("buildProgressionURL: %v", err)
	}
	want := "https://modal.chordbuildr.com/?s=v9_0_0_1.2.3.4_1o-1-0-0_x_0.Fn0-4-7-b%2C5.bn9-0-4-7-b%2C1.bn2-5-9-0-4%2C4.7n7-b-2-5-9-0-4"
	if got != want {
		t.Errorf("url mismatch:\n got %q\nwant %q", got, want)
	}
}

func TestEncodeChord(t *testing.T) {
	tests := []struct {
		chord string
		want  string
	}{
		{"Cmaj7", "0.Fn0-4-7-b"},
		{"C", "0.0n0-4-7"},
		{"G7#9", "4.gn7-b-2-5-a"}, // the "Hendrix" chord, a punctuation code case
		{"Bbmaj7", "6f.Fna-2-5-9"},
		{"F#m7", "3s.an6-9-1-4"},
		{"C/E", "0.0/2n4-0-7"},     // slash bass voiced first, deduped
		{"Am7/C", "5.a/0n0-9-4-7"}, // bass C first, then A C E G minus C
		{"C6/9", "0.dn0-4-7-9-2"},  // slash is part of the chord type, not a bass
	}
	for _, tt := range tests {
		got, err := encodeChord(tt.chord)
		if err != nil {
			t.Errorf("encodeChord(%q): %v", tt.chord, err)
			continue
		}
		if got != tt.want {
			t.Errorf("encodeChord(%q) = %q, want %q", tt.chord, got, tt.want)
		}
	}
}

func TestEncodeChordUnknownType(t *testing.T) {
	if _, err := encodeChord("Cwobble"); err == nil {
		t.Error("expected an error for an unknown chord type")
	}
}

func TestModeIndexByID(t *testing.T) {
	// Given alphabetically (as the store returns them), but indexed by id.
	modes := []store.Mode{
		{ID: 6, Name: "Aeolian"},
		{ID: 2, Name: "Dorian"},
		{ID: 1, Name: "Ionian"},
		{ID: 4, Name: "Lydian"},
	}
	if got := modeIndexByID(modes, "Ionian"); got != 0 {
		t.Errorf("Ionian index = %d, want 0", got)
	}
	if got := modeIndexByID(modes, "Dorian"); got != 1 {
		t.Errorf("Dorian index = %d, want 1", got)
	}
	if got := modeIndexByID(modes, "aeolian"); got != 3 {
		t.Errorf("case-insensitive Aeolian index = %d, want 3", got)
	}
	if got := modeIndexByID(modes, "Nonexistent"); got != 0 {
		t.Errorf("unknown mode index = %d, want 0 (Ionian fallback)", got)
	}
}
