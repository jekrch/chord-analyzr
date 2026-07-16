package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/jekrch/chord-analyzr/api-go/internal/store"
)

// Service is what the handlers need from the service layer; split out so
// handler tests can substitute a fake.
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

type handlers struct {
	svc Service
	log *slog.Logger
}

func (h *handlers) getModes(w http.ResponseWriter, r *http.Request) {
	modes, err := h.svc.Modes(r.Context())
	if err != nil {
		h.serverError(w, r, err)
		return
	}
	h.writeJSON(w, http.StatusOK, modes)
}

func (h *handlers) getScaleNotes(w http.ResponseWriter, r *http.Request) {
	key, mode, ok := h.requireKeyMode(w, r)
	if !ok {
		return
	}
	notes, err := h.svc.ScaleNotes(r.Context(), mode, key)
	if err != nil {
		h.serverError(w, r, err)
		return
	}
	h.writeJSON(w, http.StatusOK, notes)
}

func (h *handlers) getChords(w http.ResponseWriter, r *http.Request) {
	key, mode, ok := h.requireKeyMode(w, r)
	if !ok {
		return
	}
	chords, err := h.svc.ChordsByModeKey(r.Context(), mode, key)
	if err != nil {
		h.serverError(w, r, err)
		return
	}
	h.writeJSON(w, http.StatusOK, chords)
}

func (h *handlers) getSmoothProgression(w http.ResponseWriter, r *http.Request) {
	key, mode, ok := h.requireKeyMode(w, r)
	if !ok {
		return
	}
	q := r.URL.Query()
	startChord := q.Get("startChord")
	if startChord == "" {
		h.badRequest(w, "missing required query parameter: startChord")
		return
	}
	length, err := intParam(q, "length", 4)
	if err != nil {
		h.badRequest(w, err.Error())
		return
	}
	rootWeight, err := floatParam(q, "rootWeight", 0)
	if err != nil {
		h.badRequest(w, err.Error())
		return
	}
	slashWeight, err := floatParam(q, "slashWeight", 0)
	if err != nil {
		h.badRequest(w, err.Error())
		return
	}

	// the pinned and required params may repeat and each value may itself be
	// a comma-separated list (chord and note names never contain commas)
	var pinned []string
	for _, raw := range q["pinned"] {
		pinned = append(pinned, strings.Split(raw, ",")...)
	}
	var required []string
	for _, raw := range q["required"] {
		required = append(required, strings.Split(raw, ",")...)
	}

	steps, err := h.svc.SmoothProgression(
		r.Context(), mode, key, startChord, length, rootWeight, slashWeight, pinned, required)
	if err != nil {
		h.serverError(w, r, err)
		return
	}
	h.writeJSON(w, http.StatusOK, steps)
}

func (h *handlers) requireKeyMode(w http.ResponseWriter, r *http.Request) (key, mode string, ok bool) {
	q := r.URL.Query()
	key, mode = q.Get("key"), q.Get("mode")
	if key == "" || mode == "" {
		h.badRequest(w, "missing required query parameters: key and mode")
		return "", "", false
	}
	return key, mode, true
}

func intParam(q map[string][]string, name string, fallback int) (int, error) {
	vals := q[name]
	if len(vals) == 0 || vals[0] == "" {
		return fallback, nil
	}
	n, err := strconv.Atoi(vals[0])
	if err != nil {
		return 0, fmt.Errorf("query parameter %s must be an integer", name)
	}
	return n, nil
}

func floatParam(q map[string][]string, name string, fallback float64) (float64, error) {
	vals := q[name]
	if len(vals) == 0 || vals[0] == "" {
		return fallback, nil
	}
	f, err := strconv.ParseFloat(vals[0], 64)
	if err != nil {
		return 0, fmt.Errorf("query parameter %s must be a number", name)
	}
	return f, nil
}

func (h *handlers) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		h.log.Error("encoding response", "error", err)
	}
}

func (h *handlers) badRequest(w http.ResponseWriter, msg string) {
	h.writeJSON(w, http.StatusBadRequest, map[string]string{"error": msg})
}

func (h *handlers) serverError(w http.ResponseWriter, r *http.Request, err error) {
	h.log.Error("request failed", "method", r.Method, "path", r.URL.Path, "error", err)
	h.writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
}
