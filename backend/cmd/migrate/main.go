package main

import (
	"context"
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/hieulh/blog/backend/migrations"
	"github.com/jackc/pgx/v5/pgxpool"
)

type migration struct {
	version int
	name    string
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		logger.Error("DATABASE_URL is required")
		os.Exit(1)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		logger.Error("migration connection setup failed", "error", err.Error())
		os.Exit(1)
	}
	defer pool.Close()
	if err := apply(ctx, pool); err != nil {
		logger.Error("migration failed", "error", err.Error())
		os.Exit(1)
	}
	logger.Info("migrations complete")
}

func apply(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (version BIGINT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL)`); err != nil {
		return fmt.Errorf("create migration table: %w", err)
	}
	entries, err := fs.ReadDir(migrations.Files, ".")
	if err != nil {
		return fmt.Errorf("list migrations: %w", err)
	}
	available := make([]migration, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		prefix, _, found := strings.Cut(entry.Name(), "_")
		if !found {
			return fmt.Errorf("migration %q must start with numeric version", entry.Name())
		}
		version, err := strconv.Atoi(prefix)
		if err != nil {
			return fmt.Errorf("migration %q: %w", entry.Name(), err)
		}
		available = append(available, migration{version: version, name: entry.Name()})
	}
	sort.Slice(available, func(i, j int) bool { return available[i].version < available[j].version })
	for _, candidate := range available {
		var applied bool
		if err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version=$1)`, candidate.version).Scan(&applied); err != nil {
			return fmt.Errorf("check migration %d: %w", candidate.version, err)
		}
		if applied {
			continue
		}
		sql, err := migrations.Files.ReadFile(candidate.name)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", candidate.name, err)
		}
		tx, err := pool.Begin(ctx)
		if err != nil {
			return fmt.Errorf("begin migration %d: %w", candidate.version, err)
		}
		if _, err = tx.Exec(ctx, string(sql)); err == nil {
			_, err = tx.Exec(ctx, `INSERT INTO schema_migrations (version, applied_at) VALUES ($1,$2)`, candidate.version, time.Now().UTC())
		}
		if err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("apply migration %d: %w", candidate.version, err)
		}
		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("commit migration %d: %w", candidate.version, err)
		}
	}
	return nil
}
