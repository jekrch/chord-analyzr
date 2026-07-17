package store

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Postgres implements Store on a pgx connection pool.
type Postgres struct {
	pool *pgxpool.Pool
}

func NewPostgres(pool *pgxpool.Pool) *Postgres {
	return &Postgres{pool: pool}
}

// WaitReady blocks until the largest materialized view (which flyway
// populates last) is queryable.
func (p *Postgres) WaitReady(ctx context.Context, timeout time.Duration, log *slog.Logger) error {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	for {
		var one int
		err := p.pool.QueryRow(ctx, "SELECT 1 FROM mode_scale_chord_relation_view LIMIT 1").Scan(&one)
		if err == nil || errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		log.Info("waiting for flyway migrations to be applied", "error", err)
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(time.Second):
		}
	}
}

func (p *Postgres) Modes(ctx context.Context) ([]Mode, error) {
	rows, err := p.pool.Query(ctx, `
		SELECT id, name
		FROM mode
		ORDER BY name ASC`)
	if err != nil {
		return nil, fmt.Errorf("query modes: %w", err)
	}
	return collect[Mode](rows)
}

func (p *Postgres) ScaleNotes(ctx context.Context, mode, key string) ([]ScaleNote, error) {
	rows, err := p.pool.Query(ctx, `
		SELECT seq_note, note_name
		FROM mode_scale_note_letter_mv
		WHERE mode = $1 AND key_name ILIKE $2
		ORDER BY seq_note ASC`, mode, key)
	if err != nil {
		return nil, fmt.Errorf("query scale notes: %w", err)
	}
	return collect[ScaleNote](rows)
}

func (p *Postgres) ChordsByModeKey(ctx context.Context, mode, key string) ([]ModeScaleChord, error) {
	rows, err := p.pool.Query(ctx, `
		SELECT mode_id, chord_type_id, chord_note, key_note, mode, key_name,
		       chord_note_name, chord_name, mode_notes, chord_notes,
		       chord_note_names, mode_chord_note_diff, mode_chord_note_diff_count
		FROM mode_scale_chord_relation_view
		WHERE mode = $1 AND key_name = $2 AND mode_chord_note_diff_count = 0`, mode, key)
	if err != nil {
		return nil, fmt.Errorf("query chords: %w", err)
	}
	return collect[ModeScaleChord](rows)
}

func (p *Postgres) SmoothProgression(
	ctx context.Context,
	mode, key, startChord string,
	length int,
	randomness float64,
	extraNotes []string,
	rootWeight, slashWeight float64,
	pins []Pin,
	required []RequiredNote,
	maxNotes, resultCount int,
	colorWeight float64,
	colorDevices []string,
) ([]ProgressionStep, error) {
	var pinnedChords []string
	var pinnedPositions []int32
	for _, pin := range pins {
		pinnedChords = append(pinnedChords, pin.Chord)
		pinnedPositions = append(pinnedPositions, int32(pin.Position))
	}
	var requiredNotes []string
	var requiredPositions []int32
	for _, req := range required {
		requiredNotes = append(requiredNotes, req.Note)
		requiredPositions = append(requiredPositions, int32(req.Position))
	}
	rows, err := p.pool.Query(ctx, `
		SELECT progression_id, step, chord, vl_from_prev, total_cost
		FROM fn_smooth_progression($1, $2, $3, $4,
		                           $5, $6, $7, $8, $9, $10,
		                           $11, $12, $13, $14, $15, $16)
		ORDER BY progression_id, step`,
		mode, key, startChord, length,
		randomness, extraNotes, rootWeight, slashWeight,
		pinnedChords, pinnedPositions,
		maxNotes, requiredNotes, requiredPositions, resultCount,
		colorWeight, colorDevices)
	if err != nil {
		return nil, fmt.Errorf("query smooth progression: %w", err)
	}
	return collect[ProgressionStep](rows)
}

// collect scans all rows into T by column name and returns an empty (non-nil)
// slice for empty results so handlers serialize [] rather than null.
func collect[T any](rows pgx.Rows) ([]T, error) {
	out, err := pgx.CollectRows(rows, pgx.RowToStructByName[T])
	if err != nil {
		return nil, fmt.Errorf("scan rows: %w", err)
	}
	if out == nil {
		out = []T{}
	}
	return out, nil
}
