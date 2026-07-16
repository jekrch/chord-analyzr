package mcpserver

import (
	"fmt"
	"net/url"
	"sort"
	"strconv"
	"strings"

	"github.com/jekrch/chord-analyzr/api-go/internal/store"
)

// This file builds a modal.chordbuildr.com share URL for a generated
// progression, so an LLM client gets a ready-to-open link alongside the chord
// list. It mirrors the frontend's "v9" state serializer (frontend/src/util/url):
// the app reads the whole state -- key, mode, chords, tempo, instrument -- out
// of the "s" query parameter. We only fill the parts a fresh progression needs
// and leave everything else at the app's defaults.
//
// The chordTypes table below (name -> compact code + intervals) is generated
// from the frontend's DynamicChordService.chordTypes and its code-assignment
// order. If that list changes, the codes shift and this table must be
// regenerated; TestChordTypeTableMatchesFrontend guards a few well-known codes.

const (
	chordbuildrBaseURL = "https://modal.chordbuildr.com/"

	// stateVersion is the encoding version the frontend decoder accepts.
	stateVersion = "v9"

	// Defaults for the segments a generated progression doesn't set, matching a
	// freshly loaded app:
	//   pattern -- a plain 1-2-3-4 arpeggio
	//   timing  -- bpm 120, 1/16 subdivision, no swing, no flags
	//   piano   -- electric_piano_1, index 33 in the soundfont list -> base36 "x"
	defaultPattern = "1.2.3.4"
	defaultTiming  = "1o-1-0-0"
	defaultPiano   = "x"
)

// availableKeys mirrors AVAILABLE_KEYS in the frontend; a key is stored in the
// URL by its index here.
var availableKeys = []string{
	"C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb",
	"G", "G#", "Ab", "A", "A#", "Bb", "B",
}

// chordType pairs a chord-type suffix (the text after the root, "" = major)
// with its compact URL code and its semitone intervals from the root.
type chordType struct {
	name      string
	code      string
	intervals []int
}

// chordTypes is generated from the frontend (see the file comment). Order is
// irrelevant here -- the codes are baked in.
var chordTypes = []chordType{
	{"", "0", []int{0, 4, 7}},
	{"m", "5", []int{0, 3, 7}},
	{"aug", "l", []int{0, 4, 8}},
	{"dim", "m", []int{0, 3, 6}},
	{"5", "1", []int{0, 7}},
	{"b5", "8", []int{0, 4, 6}},
	{"6", "2", []int{0, 4, 7, 9}},
	{"m6", "9", []int{0, 3, 7, 9}},
	{"7", "3", []int{0, 4, 7, 10}},
	{"m7", "a", []int{0, 3, 7, 10}},
	{"maj7", "F", []int{0, 4, 7, 11}},
	{"dim7", "y", []int{0, 3, 6, 9}},
	{"aug7", "w", []int{0, 4, 8, 10}},
	{"m7b5", "D", []int{0, 3, 6, 10}},
	{"maj7#5", "1g", []int{0, 4, 8, 11}},
	{"maj7b5", "1h", []int{0, 4, 6, 11}},
	{"m7#5", "C", []int{0, 3, 8, 10}},
	{"m7b9", "E", []int{0, 3, 7, 10, 13}},
	{"9", "4", []int{0, 4, 7, 10, 14}},
	{"m9", "b", []int{0, 3, 7, 10, 14}},
	{"maj9", "G", []int{0, 4, 7, 11, 14}},
	{"maj9#11", "1o", []int{0, 4, 7, 11, 14, 18}},
	{"7b9", "i", []int{0, 4, 7, 10, 13}},
	{"7#9", "g", []int{0, 4, 7, 10, 15}},
	{"9#5", "j", []int{0, 4, 8, 10, 14}},
	{"9b5", "k", []int{0, 4, 6, 10, 14}},
	{"11", "6", []int{0, 4, 7, 10, 14, 17}},
	{"m11", "n", []int{0, 3, 7, 10, 14, 17}},
	{"maj11", "13", []int{0, 4, 7, 11, 14, 17}},
	{"7#11", "r", []int{0, 4, 7, 10, 18}},
	{"maj7#11", "1m", []int{0, 4, 7, 11, 18}},
	{"m7#11", "Z", []int{0, 3, 7, 10, 18}},
	{"11b9", "p", []int{0, 4, 7, 10, 13, 14, 17}},
	{"13", "7", []int{0, 4, 7, 10, 14, 17, 21}},
	{"m13", "o", []int{0, 3, 7, 10, 14, 17, 21}},
	{"maj13", "14", []int{0, 4, 7, 11, 14, 17, 21}},
	{"13#11", "K", []int{0, 4, 7, 10, 14, 18, 21}},
	{"maj13#11", "1u", []int{0, 4, 7, 11, 14, 18, 21}},
	{"sus2", "H", []int{0, 2, 7}},
	{"sus4", "I", []int{0, 5, 7}},
	{"sus2sus4", "1y", []int{0, 2, 5, 7}},
	{"7sus2", "U", []int{0, 2, 7, 10}},
	{"7sus4", "V", []int{0, 5, 7, 10}},
	{"9sus4", "X", []int{0, 5, 7, 10, 14}},
	{"add(2)", "1a", []int{0, 2, 4, 7}},
	{"add(4)", "1b", []int{0, 4, 5, 7}},
	{"add(9)", "1c", []int{0, 4, 7, 14}},
	{"add(2) add(4)", "21", []int{0, 2, 4, 5, 7}},
	{"m add(2)", "1r", []int{0, 2, 3, 7}},
	{"m add(4)", "1s", []int{0, 3, 5, 7}},
	{"m add(9)", "1t", []int{0, 3, 7, 14}},
	{"m add(2) add(4)", "22", []int{0, 2, 3, 5, 7}},
	{"7 add(4)", "1q", []int{0, 4, 5, 7, 10}},
	{"m7 add(4)", "20", []int{0, 3, 5, 7, 10}},
	{"6/9", "d", []int{0, 4, 7, 9, 14}},
	{"m6/9", "A", []int{0, 3, 7, 9, 14}},
	{"maj6/7", "1f", []int{0, 4, 7, 9, 11}},
	{"7/6", "e", []int{0, 4, 7, 9, 10}},
	{"m7/6", "B", []int{0, 3, 7, 9, 10}},
	{"m/Maj7", "1d", []int{0, 3, 7, 11}},
	{"m/Maj9", "1e", []int{0, 3, 7, 11, 14}},
	{"m/Maj11", "1k", []int{0, 3, 7, 11, 14, 17}},
	{"m/Maj13", "1l", []int{0, 3, 7, 11, 14, 17, 21}},
	{"7b5", "h", []int{0, 4, 6, 10}},
	{"7#5", "f", []int{0, 4, 8, 10}},
	{"7b5b9", "S", []int{0, 4, 6, 10, 13}},
	{"7b5#9", "R", []int{0, 4, 6, 10, 15}},
	{"7#5b9", "P", []int{0, 4, 8, 10, 13}},
	{"7#5#9", "O", []int{0, 4, 8, 10, 15}},
	{"7aug5", "Q", []int{0, 4, 8, 10}},
	{"maj7sus2", "1w", []int{0, 2, 7, 11}},
	{"maj7sus4", "1x", []int{0, 5, 7, 11}},
	{"6sus2", "M", []int{0, 2, 7, 9}},
	{"6sus4", "N", []int{0, 5, 7, 9}},
	{"9sus2", "W", []int{0, 2, 7, 10, 14}},
	{"13sus4", "15", []int{0, 5, 7, 10, 14, 21}},
	{"7b13", "t", []int{0, 4, 7, 10, 20}},
	{"7#9#11", "16", []int{0, 4, 7, 10, 15, 18}},
	{"7b9#11", "18", []int{0, 4, 7, 10, 13, 18}},
	{"7b9b13", "19", []int{0, 4, 7, 10, 13, 20}},
	{"7#9b13", "17", []int{0, 4, 7, 10, 15, 20}},
	{"7alt", "s", []int{0, 4, 6, 8, 10, 13, 15}},
	{"madd9", "12", []int{0, 3, 7, 14}},
	{"6add9", "L", []int{0, 4, 7, 9, 14}},
	{"7no5", "u", []int{0, 4, 10}},
	{"9no5", "v", []int{0, 4, 10, 14}},
	{"maj7no5", "1n", []int{0, 4, 11}},
	{"m7no5", "10", []int{0, 3, 10}},
	{"m9no5", "11", []int{0, 3, 10, 14}},
	{"dim9", "z", []int{0, 3, 6, 9, 14}},
	{"dim11", "Y", []int{0, 3, 6, 9, 14, 17}},
	{"dimMaj7", "1j", []int{0, 3, 6, 11}},
	{"augMaj7", "1i", []int{0, 4, 8, 11}},
	{"aug9", "x", []int{0, 4, 8, 10, 14}},
	{"sus4add9", "1z", []int{0, 5, 7, 14}},
	{"4th", "c", []int{0, 5, 10}},
	{"4ths", "q", []int{0, 5, 10, 15}},
	{"maj9no5", "1p", []int{0, 4, 11, 14}},
	{"11no5", "J", []int{0, 4, 10, 14, 17}},
	{"maj6add4", "1v", []int{0, 4, 5, 7, 9}},
	{"7b9#5", "T", []int{0, 4, 8, 10, 13}},
}

var chordTypeByName = func() map[string]chordType {
	m := make(map[string]chordType, len(chordTypes))
	for _, ct := range chordTypes {
		m[ct.name] = ct
	}
	return m
}()

// noteBasePitch is the pitch class of each natural note letter.
var noteBasePitch = map[byte]int{'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}

// noteLetterCode is the frontend's NOTE_TO_PITCH: a note letter's index used to
// encode the root in a chord name.
var noteLetterCode = map[byte]string{'C': "0", 'D': "1", 'E': "2", 'F': "3", 'G': "4", 'A': "5", 'B': "6"}

// buildProgressionURL encodes a progression (its chord names, in order) into a
// modal.chordbuildr.com link that opens with the progression loaded on the
// electric-piano voice.
func buildProgressionURL(key string, modeIndex int, chordNames []string) (string, error) {
	keyIndex := 0
	for i, k := range availableKeys {
		if k == key {
			keyIndex = i
			break
		}
	}

	segments := make([]string, 0, len(chordNames))
	for _, name := range chordNames {
		seg, err := encodeChord(name)
		if err != nil {
			return "", err
		}
		segments = append(segments, seg)
	}

	state := strings.Join([]string{
		stateVersion,
		strconv.FormatInt(int64(keyIndex), 36),
		strconv.FormatInt(int64(modeIndex), 36),
		defaultPattern,
		defaultTiming,
		defaultPiano,
		strings.Join(segments, ","),
	}, "_")

	u, err := url.Parse(chordbuildrBaseURL)
	if err != nil {
		return "", err
	}
	q := u.Query()
	q.Set("s", state)
	u.RawQuery = q.Encode()
	return u.String(), nil
}

// encodeChord turns one chord name (e.g. "Cmaj7", "G7#9", "Am7/C") into its
// "<name>n<notes>" URL segment: the compact chord name followed by the chord's
// pitch classes in play order.
func encodeChord(chordName string) (string, error) {
	main, bass := splitSlashBass(chordName)

	rootCode, rootPitch, suffix, ok := parseNote(main)
	if !ok {
		return "", fmt.Errorf("cannot read a note root in chord %q", chordName)
	}
	ct, ok := chordTypeByName[suffix]
	if !ok {
		return "", fmt.Errorf("unknown chord type %q in chord %q", suffix, chordName)
	}

	name := rootCode + "." + ct.code

	pitches := make([]int, 0, len(ct.intervals))
	for _, iv := range ct.intervals {
		pitches = append(pitches, ((rootPitch+iv)%12+12)%12)
	}

	if bass != "" {
		bassCode, bassPitch, rest, ok := parseNote(bass)
		if !ok || rest != "" {
			return "", fmt.Errorf("invalid slash bass %q in chord %q", bass, chordName)
		}
		name += "/" + bassCode
		// Voice the bass note first and drop it from the upper notes, matching
		// how the frontend builds a slash chord.
		reordered := []int{bassPitch}
		for _, p := range pitches {
			if p != bassPitch {
				reordered = append(reordered, p)
			}
		}
		pitches = reordered
	}

	notes := make([]string, len(pitches))
	for i, p := range pitches {
		notes[i] = strconv.FormatInt(int64(p), 36)
	}
	return name + "n" + strings.Join(notes, "-"), nil
}

// splitSlashBass separates a trailing "/<note>" bass from a chord name. Chord
// types can themselves contain slashes ("6/9", "m/Maj7"), so a slash only
// counts as a bass when what follows is a plain note name.
func splitSlashBass(chordName string) (main, bass string) {
	idx := strings.LastIndex(chordName, "/")
	if idx > 0 && idx < len(chordName)-1 {
		after := chordName[idx+1:]
		if isPlainNote(after) {
			return chordName[:idx], after
		}
	}
	return chordName, ""
}

// isPlainNote reports whether s is a bare note name: a letter A-G with at most
// a doubled sharp or flat.
func isPlainNote(s string) bool {
	if s == "" {
		return false
	}
	if _, ok := noteBasePitch[s[0]]; !ok {
		return false
	}
	switch s[1:] {
	case "", "#", "##", "b", "bb":
		return true
	}
	return false
}

// parseNote reads a note at the start of s, returning its URL letter code, its
// pitch class, and the remaining text (the chord-type suffix). ok is false when
// s doesn't start with a note or mixes sharps and flats.
func parseNote(s string) (code string, pitch int, rest string, ok bool) {
	if s == "" {
		return "", 0, "", false
	}
	letter := s[0]
	base, isNote := noteBasePitch[letter]
	if !isNote {
		return "", 0, "", false
	}

	i := 1
	var accidental byte
	count := 0
	for i < len(s) && (s[i] == '#' || s[i] == 'b') {
		if accidental == 0 {
			accidental = s[i]
		} else if s[i] != accidental {
			return "", 0, "", false // mixed accidentals
		}
		count++
		i++
	}

	suffix := ""
	switch {
	case count == 2 && accidental == '#':
		suffix = "S"
	case count == 2 && accidental == 'b':
		suffix = "F"
	case count == 1 && accidental == '#':
		suffix = "s"
	case count == 1 && accidental == 'b':
		suffix = "f"
	}

	pitch = base
	if accidental == '#' {
		pitch += count
	} else if accidental == 'b' {
		pitch -= count
	}
	pitch = ((pitch % 12) + 12) % 12

	return noteLetterCode[letter] + suffix, pitch, s[i:], true
}

// modeIndexByID returns the position of mode name in the mode list ordered by
// id -- the same order the frontend's mode list uses (Ionian first). Returns 0
// (Ionian) when the name isn't found.
func modeIndexByID(modes []store.Mode, name string) int {
	sorted := append([]store.Mode(nil), modes...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].ID < sorted[j].ID })
	for i, m := range sorted {
		if strings.EqualFold(m.Name, name) {
			return i
		}
	}
	return 0
}
