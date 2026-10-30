package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"callcoach/internal/server"
	"callcoach/migrations"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	level := slog.LevelInfo
	switch strings.ToLower(os.Getenv("LOG_LEVEL")) {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	}
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level})))
	ctx := context.Background()
	db, e := pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
	if e != nil {
		slog.Error("database configuration invalid")
		os.Exit(1)
	}
	defer db.Close()
	if len(os.Args) > 1 && os.Args[1] == "migrate" {
		tx, e := db.Begin(ctx)
		if e == nil {
			defer tx.Rollback(ctx)
			_, e = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(808531)")
			if e == nil {
				_, e = tx.Exec(ctx, migrations.Initial)
			}
			if e == nil {
				e = tx.Commit(ctx)
			}
		}
		if e != nil {
			slog.Error("migration failed")
			os.Exit(1)
		}
		slog.Info("migrations applied")
		return
	}
	if len(os.Args) > 1 && os.Args[1] == "revoke-sessions" {
		if _, e = db.Exec(ctx, "DELETE FROM sessions"); e != nil {
			os.Exit(1)
		}
		slog.Info("sessions revoked")
		return
	}
	if len(os.Args) > 1 && os.Args[1] == "health" {
		resp, e := http.Get("http://127.0.0.1:8080/readyz")
		if e != nil || resp.StatusCode != 200 {
			os.Exit(1)
		}
		resp.Body.Close()
		return
	}
	hours, _ := strconv.Atoi(os.Getenv("SESSION_TTL_HOURS"))
	if hours < 1 || hours > 168 {
		hours = 24
	}
	api, e := server.New(db, server.Config{Password: os.Getenv("CALL_COACH_PASSWORD"), APIKey: os.Getenv("CALL_COACH_API_KEY"), PublicURL: os.Getenv("PUBLIC_APP_URL"), Secure: os.Getenv("COOKIE_SECURE") == "true", TTL: time.Duration(hours) * time.Hour, BinaryDir: "/app/bin"})
	if e != nil {
		fmt.Fprintln(os.Stderr, e)
		os.Exit(1)
	}
	srv := &http.Server{Addr: ":8080", Handler: api.Handler(), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 16384}
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-stop
		c, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = srv.Shutdown(c)
	}()
	slog.Info("api listening", "port", 8080)
	if e = srv.ListenAndServe(); e != nil && e != http.ErrServerClosed {
		slog.Error("http server stopped")
		os.Exit(1)
	}
}
