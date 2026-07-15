// Command api serves the chord-analyzr HTTP API.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jekrch/chord-analyzr/api-go/internal/config"
	"github.com/jekrch/chord-analyzr/api-go/internal/httpapi"
	"github.com/jekrch/chord-analyzr/api-go/internal/service"
	"github.com/jekrch/chord-analyzr/api-go/internal/store"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(log); err != nil {
		log.Error("fatal", "error", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger) error {
	cfg := config.Load()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	if err := waitForDatabase(ctx, pool, cfg.DBWaitTimeout, log); err != nil {
		return err
	}
	log.Info("database is ready")

	handler := httpapi.NewHandler(
		service.New(store.NewPostgres(pool)), log, cfg.CORSAllowedOrigins)

	srv := &http.Server{
		Addr:              net.JoinHostPort("", cfg.Port),
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		// no WriteTimeout: progression search on large lengths can be slow
		IdleTimeout: time.Minute,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Info("listening", "port", cfg.Port)
		if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		log.Info("shutting down")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		return srv.Shutdown(shutdownCtx)
	}
}

// waitForDatabase blocks until the largest materialized view (which flyway
// populates last) is queryable.
func waitForDatabase(ctx context.Context, pool *pgxpool.Pool, timeout time.Duration, log *slog.Logger) error {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	for {
		var one int
		err := pool.QueryRow(ctx, "SELECT 1 FROM mode_scale_chord_relation_view LIMIT 1").Scan(&one)
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
