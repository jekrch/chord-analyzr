package httpapi

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	"github.com/jekrch/chord-analyzr/api-go/internal/store"
)

// fakeService records progression arguments and returns canned steps.
type fakeService struct {
	Service // panic on anything not overridden

	steps []store.ProgressionStep

	mode, key, startChord   string
	length                  int
	rootWeight, slashWeight float64
	pinned, required        []string
}

func (f *fakeService) SmoothProgression(
	_ context.Context,
	mode, key, startChord string,
	length int,
	rootWeight, slashWeight float64,
	pinned, required []string,
) ([]store.ProgressionStep, error) {
	f.mode, f.key, f.startChord = mode, key, startChord
	f.length = length
	f.rootWeight, f.slashWeight = rootWeight, slashWeight
	f.pinned = pinned
	f.required = required
	return f.steps, nil
}

func serve(t *testing.T, svc Service, target string) *httptest.ResponseRecorder {
	t.Helper()
	handler := NewHandler(svc, slog.New(slog.DiscardHandler), []string{"http://localhost:5173"})
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, target, nil))
	return rec
}

func TestReturnsProgressionAndDefaultsLengthAndWeights(t *testing.T) {
	svc := &fakeService{steps: []store.ProgressionStep{
		{Step: 1, Chord: "Cmaj7", VLFromPrev: 0, TotalCost: 3},
		{Step: 2, Chord: "Em7", VLFromPrev: 2, TotalCost: 3},
		{Step: 3, Chord: "G7", VLFromPrev: 1, TotalCost: 3},
	}}

	rec := serve(t, svc, "/api/progressions?key=C&mode=Ionian&startChord=Cmaj7")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var body []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid JSON response: %v", err)
	}
	if len(body) != 3 {
		t.Fatalf("len(body) = %d, want 3", len(body))
	}
	if body[0]["chord"] != "Cmaj7" || body[1]["vlFromPrev"] != 2.0 || body[0]["totalCost"] != 3.0 {
		t.Errorf("unexpected body: %v", body)
	}

	// length, weights, pins and required notes omitted -> handler defaults
	if svc.length != 4 || svc.rootWeight != 0 || svc.slashWeight != 0 ||
		svc.pinned != nil || svc.required != nil {
		t.Errorf("got length=%d rootWeight=%v slashWeight=%v pinned=%v required=%v, want defaults",
			svc.length, svc.rootWeight, svc.slashWeight, svc.pinned, svc.required)
	}
	if svc.mode != "Ionian" || svc.key != "C" || svc.startChord != "Cmaj7" {
		t.Errorf("got mode=%q key=%q startChord=%q", svc.mode, svc.key, svc.startChord)
	}
}

func TestPassesRootAndSlashWeightsThrough(t *testing.T) {
	svc := &fakeService{}

	rec := serve(t, svc,
		"/api/progressions?key=C&mode=Ionian&startChord=Cmaj7&length=5&rootWeight=2&slashWeight=3")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if svc.length != 5 || svc.rootWeight != 2.0 || svc.slashWeight != 3.0 {
		t.Errorf("got length=%d rootWeight=%v slashWeight=%v, want 5 2 3",
			svc.length, svc.rootWeight, svc.slashWeight)
	}
}

func TestPassesPinnedChordsThrough(t *testing.T) {
	svc := &fakeService{}

	// a single comma-separated pinned param binds to a list (chord names
	// never contain commas); '@step' rides along inside each entry
	rec := serve(t, svc, "/api/progressions?key=C&mode=Ionian&startChord=Cmaj7&pinned=Am7,G7@3")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if want := []string{"Am7", "G7@3"}; !reflect.DeepEqual(svc.pinned, want) {
		t.Errorf("pinned = %v, want %v", svc.pinned, want)
	}
}

func TestPassesRequiredNotesThrough(t *testing.T) {
	svc := &fakeService{}

	// required notes bind the same way pinned chords do: repeatable param,
	// comma-separated entries, '@step' inside each entry
	rec := serve(t, svc, "/api/progressions?key=C&mode=Ionian&startChord=Cmaj7&required=A@3,Eb@4")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if want := []string{"A@3", "Eb@4"}; !reflect.DeepEqual(svc.required, want) {
		t.Errorf("required = %v, want %v", svc.required, want)
	}
}

func TestMissingRequiredParamsIs400(t *testing.T) {
	for _, target := range []string{
		"/api/progressions?key=C&mode=Ionian", // no startChord
		"/api/progressions?key=C&startChord=Cmaj7",
		"/api/scales?key=C",
		"/api/chords?mode=Ionian",
	} {
		if rec := serve(t, &fakeService{}, target); rec.Code != http.StatusBadRequest {
			t.Errorf("GET %s status = %d, want 400", target, rec.Code)
		}
	}
}

func TestNonNumericParamIs400(t *testing.T) {
	rec := serve(t, &fakeService{}, "/api/progressions?key=C&mode=Ionian&startChord=Cmaj7&length=x")
	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", rec.Code)
	}
}

func TestCORSAllowsConfiguredOrigin(t *testing.T) {
	handler := NewHandler(&fakeService{}, slog.New(slog.DiscardHandler), []string{"http://localhost:5173"})

	// preflight from the allowed origin is answered directly
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodOptions, "/api/modes", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	req.Header.Set("Access-Control-Request-Method", "GET")
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("preflight status = %d, want 204", rec.Code)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
		t.Errorf("Allow-Origin = %q", got)
	}
	if got := rec.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
		t.Errorf("Allow-Credentials = %q", got)
	}

	// an unknown origin gets no CORS headers
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodOptions, "/api/modes", nil)
	req.Header.Set("Origin", "http://evil.example")
	handler.ServeHTTP(rec, req)
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("Allow-Origin for unknown origin = %q, want empty", got)
	}
}
