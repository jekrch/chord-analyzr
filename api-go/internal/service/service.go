// Package service holds the input-shaping rules between the HTTP layer and
// the database: key-name normalization, length/weight clamping, and parsing
// of pinned-chord and required-note entries.
package service

import (
	"context"
	"strconv"
	"strings"

	"github.com/jekrch/chord-analyzr/api-go/internal/store"
)

const (
	// guardrail so the search can't be asked to enumerate an unreasonable space
	maxLength = 8
	minLength = 2

	// with color on, borrowed roots open the 5 non-scale pitch classes, so
	// progressions past the 7 scale degrees become satisfiable
	maxColorLength = 12

	// there are only 5 device tags, so more entries can't add anything
	maxColorDevices = 5

	// the voice-leading knobs are ordering-key coefficients, not search-space
	// controls, so they only need a sane upper bound rather than tight limits
	maxWeight = 10.0

	// several notes may be required on one step, so the cap is looser than
	// the pin cap; past a few per step the entries can't all be satisfiable
	maxRequiredNotes = 4 * maxLength

	// there are only 12 pitch classes, so more extra notes can't add anything
	maxExtraNotes = 12

	// the beam holds at most 500 finished paths, but a handful is all a
	// caller can meaningfully compare
	maxResultCount = 10
)

type Service struct {
	store store.Store
}

func New(s store.Store) *Service {
	return &Service{store: s}
}

func (s *Service) Modes(ctx context.Context) ([]store.Mode, error) {
	return s.store.Modes(ctx)
}

func (s *Service) ScaleNotes(ctx context.Context, mode, key string) ([]store.ScaleNote, error) {
	return s.store.ScaleNotes(ctx, mode, key)
}

func (s *Service) ChordsByModeKey(ctx context.Context, mode, key string) ([]store.ModeScaleChord, error) {
	return s.store.ChordsByModeKey(ctx, mode, SanitizeKeyName(key))
}

func (s *Service) SmoothProgression(
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
) ([]store.ProgressionStep, error) {
	colorWeight = clampWeight(colorWeight)
	return s.store.SmoothProgression(
		ctx,
		mode,
		SanitizeKeyName(key),
		startChord,
		clampLength(length, colorWeight > 0),
		clampRandomness(randomness),
		ParseExtraNotes(extraNotes),
		clampWeight(rootWeight),
		clampWeight(slashWeight),
		ParsePins(pinned),
		ParseRequiredNotes(required),
		clampMaxNotes(maxNotes),
		clampResultCount(resultCount),
		colorWeight,
		ParseColorDevices(colorDevices),
	)
}

// SanitizeKeyName capitalizes the first letter and lowercases the rest, so
// "c" and "AB" match the "C" / "Ab" key names stored in the views.
func SanitizeKeyName(keyName string) string {
	if keyName == "" {
		return keyName
	}
	return strings.ToUpper(keyName[:1]) + strings.ToLower(keyName[1:])
}

// ParsePins turns pin entries into store.Pins. Each entry is "Chord" or
// "Chord@step" (1-based step in the progression, 0 = floating). A suffix
// after '@' that isn't a number is kept as part of the chord name (the SQL
// function drops unresolvable names). Pins beyond the length cap are
// ignored -- they could never all fit anyway.
func ParsePins(pinned []string) []store.Pin {
	var pins []store.Pin
	for _, entry := range pinned[:min(len(pinned), maxLength)] {
		chord, step := splitStepSuffix(entry)
		if chord == "" {
			continue
		}
		pins = append(pins, store.Pin{Chord: chord, Position: step})
	}
	return pins
}

// ParseExtraNotes trims extra-note entries and drops blank ones, capped at
// one per pitch class. Unknown note names are dropped by the SQL function.
func ParseExtraNotes(extra []string) []string {
	var notes []string
	for _, entry := range extra[:min(len(extra), maxExtraNotes)] {
		if note := strings.TrimSpace(entry); note != "" {
			notes = append(notes, note)
		}
	}
	return notes
}

// ParseColorDevices trims device-tag entries and drops blank ones, capped at
// one per known tag. Unknown tags are dropped by the SQL function.
func ParseColorDevices(devices []string) []string {
	var tags []string
	for _, entry := range devices[:min(len(devices), maxColorDevices)] {
		if tag := strings.TrimSpace(entry); tag != "" {
			tags = append(tags, tag)
		}
	}
	return tags
}

// ParseRequiredNotes turns required-note entries into store.RequiredNotes.
// Each entry is "Note@step" ('Bb@3'): the chord at that 1-based step must
// contain the note; several entries may name one step. Entries without a
// step parse to position 0, which the SQL function drops, as it does
// unresolvable note names.
func ParseRequiredNotes(required []string) []store.RequiredNote {
	var notes []store.RequiredNote
	for _, entry := range required[:min(len(required), maxRequiredNotes)] {
		note, step := splitStepSuffix(entry)
		if note == "" {
			continue
		}
		notes = append(notes, store.RequiredNote{Note: note, Position: step})
	}
	return notes
}

// splitStepSuffix splits a "Name@step" entry into its name and 1-based step.
// Without a numeric '@' suffix the whole entry is the name, at step 0; a
// negative step also floats to 0. Names are trimmed and lose any commas
// (the entry separator).
func splitStepSuffix(entry string) (string, int) {
	name := entry
	step := 0
	if at := strings.LastIndex(entry, "@"); at >= 0 {
		if n, err := strconv.Atoi(strings.TrimSpace(entry[at+1:])); err == nil {
			step = max(n, 0)
			name = entry[:at]
		}
		// otherwise: not a step suffix; treat the whole entry as the name
	}
	return strings.ReplaceAll(strings.TrimSpace(name), ",", ""), step
}

// with borrowed-root color on, the distinct-root rule can draw on all 12
// pitch classes instead of the 7 scale degrees, so the cap loosens
func clampLength(length int, colorOn bool) int {
	limit := maxLength
	if colorOn {
		limit = maxColorLength
	}
	return min(max(length, minLength), limit)
}

// negative weights default to 0 (the knob off); anything above the cap is
// pinned to it
func clampWeight(w float64) float64 {
	return min(max(w, 0), maxWeight)
}

// randomness is a probability-like dial: [0, 1]
func clampRandomness(r float64) float64 {
	return min(max(r, 0), 1)
}

// 0 means no cap; negative values mean the same
func clampMaxNotes(n int) int {
	return max(n, 0)
}

// at least the single best result, at most a comparable handful
func clampResultCount(n int) int {
	return min(max(n, 1), maxResultCount)
}
