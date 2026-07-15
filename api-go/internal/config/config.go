// Package config loads runtime configuration from environment variables.
package config

import (
	"fmt"
	"os"
	"strings"
	"time"
)

type Config struct {
	// Port the HTTP server listens on.
	Port string
	// DatabaseURL is a full postgres:// connection string. When set it wins
	// over the individual DB_* variables.
	DatabaseURL string
	// CORSAllowedOrigins are the origins allowed to call the API with
	// credentials (comma-separated in CORS_ALLOWED_ORIGINS).
	CORSAllowedOrigins []string
	// DBWaitTimeout bounds how long startup waits for the database (and the
	// last flyway materialized view) to become available.
	DBWaitTimeout time.Duration
}

func Load() Config {
	cfg := Config{
		Port:               envOr("PORT", "8080"),
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		CORSAllowedOrigins: splitCSV(envOr("CORS_ALLOWED_ORIGINS", "http://localhost:5173")),
		DBWaitTimeout:      5 * time.Minute,
	}
	if cfg.DatabaseURL == "" {
		cfg.DatabaseURL = fmt.Sprintf(
			"postgres://%s:%s@%s:%s/%s",
			envOr("DB_USER", "postgres"),
			envOr("DB_PASSWORD", "pass"),
			envOr("DB_HOST", "localhost"),
			envOr("DB_PORT", "5432"),
			envOr("DB_NAME", "chordanalyzr"),
		)
	}
	return cfg
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func splitCSV(s string) []string {
	var out []string
	for _, part := range strings.Split(s, ",") {
		if part = strings.TrimSpace(part); part != "" {
			out = append(out, part)
		}
	}
	return out
}
