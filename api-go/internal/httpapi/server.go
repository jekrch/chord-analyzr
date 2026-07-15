// Package httpapi wires the HTTP surface of the API: routing, CORS, and the
// OpenAPI documents.
package httpapi

import (
	_ "embed"
	"log/slog"
	"net/http"
	"slices"
)

//go:embed openapi.json
var openAPISpec []byte

//go:embed swagger-ui.html
var swaggerUIPage []byte

// NewHandler builds the full request handler: routes wrapped in CORS.
func NewHandler(svc Service, log *slog.Logger, allowedOrigins []string) http.Handler {
	h := &handlers{svc: svc, log: log}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/modes", h.getModes)
	mux.HandleFunc("GET /api/scales", h.getScaleNotes)
	mux.HandleFunc("GET /api/chords", h.getChords)
	mux.HandleFunc("GET /api/progressions", h.getSmoothProgression)

	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	mux.HandleFunc("GET /v3/api-docs", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(openAPISpec)
	})
	mux.HandleFunc("GET /swagger-ui.html", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(swaggerUIPage)
	})

	return corsMiddleware(mux, allowedOrigins)
}

// corsMiddleware lets the configured origins call any endpoint with
// credentials; preflights are answered here so they never reach the
// method-matched mux.
func corsMiddleware(next http.Handler, allowedOrigins []string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && slices.Contains(allowedOrigins, origin) {
			h := w.Header()
			h.Set("Access-Control-Allow-Origin", origin)
			h.Set("Access-Control-Allow-Credentials", "true")
			h.Add("Vary", "Origin")
			if r.Method == http.MethodOptions {
				h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
				if reqHeaders := r.Header.Get("Access-Control-Request-Headers"); reqHeaders != "" {
					h.Set("Access-Control-Allow-Headers", reqHeaders)
				}
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
