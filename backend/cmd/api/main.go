package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/hieulh/blog/backend/internal/adapters/postgres"
	"github.com/hieulh/blog/backend/internal/application"
	deliveryhttp "github.com/hieulh/blog/backend/internal/delivery/http"
	markdown "github.com/hieulh/blog/backend/internal/markdown"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		logger.Error("DATABASE_URL is required")
		os.Exit(1)
	}
	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		logger.Error("database connection setup failed", "error", err.Error())
		os.Exit(1)
	}
	defer pool.Close()
	repository := postgres.NewRepository(pool)
	service := application.NewArticleService(repository, postgres.NewTransactionManager(pool), markdown.NewRenderer(), time.Now, uuid.NewString)
	router := deliveryhttp.NewRouter(service, pool.Ping, os.Getenv("CORS_ALLOWED_ORIGIN"), logger)
	address := os.Getenv("HTTP_ADDR")
	if address == "" {
		address = ":8080"
	}
	server := &http.Server{Addr: address, Handler: router, ReadHeaderTimeout: 5 * time.Second}
	go func() {
		logger.Info("API server starting", "address", address)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("API server failed", "error", err.Error())
		}
	}()
	shutdownSignal := make(chan os.Signal, 1)
	signal.Notify(shutdownSignal, syscall.SIGINT, syscall.SIGTERM)
	<-shutdownSignal
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		logger.Error("graceful shutdown failed", "error", err.Error())
	}
}
