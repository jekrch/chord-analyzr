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

	// with color on, borrowed roots open the 5 non-scale pitch classes, and
	// with revisit weight on, roots may return -- either way progressions
	// past the 7 scale degrees become satisfiable
	maxColorLength = 12

	// there are only 5 device tags, so more entries can't add anything
	maxColorDevices = 5

	// the voice-leading knobs are ordering-key coefficients, not search-space
	// controls, so they only need a sane upper bound rather than tight limits
	maxWeight = 10.0

	// several notes may be required on one step, so the cap is looser than
	// the pin cap; past a few per step the entries can't all be satisfiable
	maxRequiredNotes = 4 * maxLength

	// one bass per step, and steps top out at the color length cap
	maxBassNotes = maxColorLength

	// there are only 12 pitch classes, so more extra notes can't add anything
	maxExtraNotes = 12

	// the beam holds at most 500 finished paths, but a handful is all a
	// caller can meaningfully compare
	maxResultCount = 10

	// same reasoning as maxExtraNotes: 12 pitch classes, no more to avoid
	maxAvoidNotes = 12
)

// motionProfiles are the root-motion aesthetics fn_root_motion_penalty
// knows; an unknown name falls back to the first entry, 'functional'.
var motionProfiles = []string{"functional", "mediant", "stepwise", "static"}

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
	pinned, required, bass []string,
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
	colorWeight = clampWeight(colorWeight)
	revisitWeight = clampWeight(revisitWeight)
	return s.store.SmoothProgression(
		ctx,
		mode,
		SanitizeKeyName(key),
		startChord,
		clampLength(length, colorWeight > 0 || revisitWeight > 0),
		clampRandomness(randomness),
		ParseExtraNotes(extraNotes),
		clampWeight(rootWeight),
		clampWeight(slashWeight),
		ParsePins(pinned),
		ParseRequiredNotes(required),
		ParseBassNotes(bass),
		clampNotesBound(minNotes),
		clampNotesBound(maxNotes),
		clampResultCount(resultCount),
		colorWeight,
		ParseColorDevices(colorDevices),
		ParseEnding(ending),
		clampWeight(loopWeight),
		clampBrightness(brightness),
		ParseAvoidNotes(avoidNotes),
		ParseMotionProfile(motionProfile),
		revisitWeight,
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

// ParseEnding normalizes an ending (cadence) name to the lowercase form the
// SQL function knows. An unknown name is dropped -- the SQL function would
// drop it too, but normalizing here keeps the contract visible in one place.
func ParseEnding(ending string) string {
	e := strings.ToLower(strings.TrimSpace(ending))
	switch e {
	case "authentic", "plagal", "half", "deceptive", "open":
		return e
	}
	return ""
}

// ParseAvoidNotes trims avoid-note entries and drops blank ones, capped at
// one per pitch class. Unknown note names are dropped by the SQL function.
func ParseAvoidNotes(avoid []string) []string {
	var notes []string
	for _, entry := range avoid[:min(len(avoid), maxAvoidNotes)] {
		if note := strings.TrimSpace(entry); note != "" {
			notes = append(notes, note)
		}
	}
	return notes
}

// ParseMotionProfile normalizes a root-motion profile name to the lowercase
// form the SQL function knows. Unlike ParseEnding, an unknown name resolves
// to 'functional' rather than empty: the SQL parameter isn't nullable, and
// 'functional' is its own default.
func ParseMotionProfile(profile string) string {
	p := strings.ToLower(strings.TrimSpace(profile))
	for _, known := range motionProfiles {
		if p == known {
			return p
		}
	}
	return motionProfiles[0]
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

// ParseBassNotes turns bass-note entries into store.BassNotes. Each entry is
// "Note@step" ('C@2'): the chord at that 1-based step must sound the note in
// the bass. Entries without a step parse to position 0, which the SQL
// function drops, as it does unresolvable note names and extra entries on a
// step that already has one.
func ParseBassNotes(bass []string) []store.BassNote {
	var notes []store.BassNote
	for _, entry := range bass[:min(len(bass), maxBassNotes)] {
		note, step := splitStepSuffix(entry)
		if note == "" {
			continue
		}
		notes = append(notes, store.BassNote{Note: note, Position: step})
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
func clampLength(length int, rootsExtended bool) int {
	limit := maxLength
	if rootsExtended {
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

// brightness is a signed pole: [-1, 1]; 0 means off, like every other
// creative weight in this API
func clampBrightness(b float64) float64 {
	return min(max(b, -1), 1)
}

// 0 means no bound; negative values mean the same. Shared by the min-notes
// floor and the max-notes cap.
func clampNotesBound(n int) int {
	return max(n, 0)
}

// at least the single best result, at most a comparable handful
func clampResultCount(n int) int {
	return min(max(n, 1), maxResultCount)
}
