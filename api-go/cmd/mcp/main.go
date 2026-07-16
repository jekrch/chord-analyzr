// Command mcp serves the chord-analyzr MCP server. By default it speaks
// streamable HTTP on /mcp; with -stdio it serves a single session over
// stdin/stdout for local clients.
package main

import (
	"context"
	"errors"
	"flag"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/jekrch/chord-analyzr/api-go/internal/config"
	"github.com/jekrch/chord-analyzr/api-go/internal/mcpserver"
	"github.com/jekrch/chord-analyzr/api-go/internal/service"
	"github.com/jekrch/chord-analyzr/api-go/internal/store"
)

const version = "0.1.0"

func main() {
	stdio := flag.Bool("stdio", false, "serve a single MCP session over stdin/stdout instead of HTTP")
	flag.Parse()

	// stdout carries the protocol in stdio mode, so logs always go to stderr
	log := slog.New(slog.NewJSONHandler(os.Stderr, nil))
	if err := run(log, *stdio); err != nil {
		log.Error("fatal", "error", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger, stdio bool) error {
	cfg := config.Load()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	pg := store.NewPostgres(pool)
	if err := pg.WaitReady(ctx, cfg.DBWaitTimeout, log); err != nil {
		return err
	}
	log.Info("database is ready")

	server := mcpserver.New(service.New(pg), version)

	if stdio {
		return server.Run(ctx, &mcp.StdioTransport{})
	}

	mux := http.NewServeMux()
	mux.Handle("/mcp", mcp.NewStreamableHTTPHandler(
		func(*http.Request) *mcp.Server { return server }, nil))
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	srv := &http.Server{
		Addr:              net.JoinHostPort("", cfg.Port),
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
		// no WriteTimeout: MCP sessions hold long-lived streaming responses
		IdleTimeout: time.Minute,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Info("mcp server listening", "port", cfg.Port, "path", "/mcp")
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
