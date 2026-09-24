package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/hieulh/blog/backend/internal/adapters/postgres"
	"github.com/hieulh/blog/backend/internal/application"
	deliveryhttp "github.com/hieulh/blog/backend/internal/delivery/http"
	markdown "github.com/hieulh/blog/backend/internal/markdown"
	"github.com/jackc/pgx/v5/pgxpool"
)

type runtimeConfig struct {
	adminAuth    *deliveryhttp.AdminAuth
	corsOrigin   string
	cookieSecure bool
}

type runtimeConfigError struct {
	key         string
	description string
}

func (e *runtimeConfigError) Error() string {
	return fmt.Sprintf("%s: %s", e.key, e.description)
}

func loadRuntimeConfig(getenv func(string) string, now func() time.Time) (runtimeConfig, error) {
	secret := getenv("ADMIN_SESSION_SECRET")
	if len([]byte(secret)) < 32 {
		return runtimeConfig{}, &runtimeConfigError{key: "ADMIN_SESSION_SECRET", description: "must be at least 32 bytes"}
	}

	secure := false
	secureValue := getenv("ADMIN_COOKIE_SECURE")
	if secureValue != "" {
		parsed, err := strconv.ParseBool(secureValue)
		if err != nil {
			return runtimeConfig{}, &runtimeConfigError{key: "ADMIN_COOKIE_SECURE", description: "must be a boolean"}
		}
		secure = parsed
	}

	origin := getenv("CORS_ALLOWED_ORIGIN")
	if !validRuntimeOrigin(origin) {
		return runtimeConfig{}, &runtimeConfigError{key: "CORS_ALLOWED_ORIGIN", description: "must be a canonical http(s) origin"}
	}
	auth, err := deliveryhttp.NewAdminAuth(secret, secure, origin, now)
	if err != nil {
		return runtimeConfig{}, &runtimeConfigError{key: "ADMIN_SESSION_SECRET", description: "admin authentication configuration is invalid"}
	}
	return runtimeConfig{adminAuth: auth, corsOrigin: origin, cookieSecure: secure}, nil
}

func validRuntimeOrigin(value string) bool {
	if value == "" || strings.TrimSpace(value) != value || strings.ContainsAny(value, "?#") {
		return false
	}
	parsed, err := url.Parse(value)
	if err != nil {
		return false
	}
	if (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.User != nil || parsed.Opaque != "" || parsed.Path != "" || parsed.RawPath != "" || parsed.RawQuery != "" || parsed.Fragment != "" || parsed.RawFragment != "" || parsed.ForceQuery {
		return false
	}

	hostname := parsed.Hostname()
	canonicalHost, valid := canonicalRuntimeHostname(hostname)
	if !valid {
		return false
	}
	port := parsed.Port()
	if port != "" {
		parsedPort, err := strconv.ParseUint(port, 10, 16)
		if err != nil || strconv.FormatUint(parsedPort, 10) != port || parsed.Scheme == "http" && parsedPort == 80 || parsed.Scheme == "https" && parsedPort == 443 {
			return false
		}
		canonicalHost += ":" + port
	}
	return value == parsed.Scheme+"://"+canonicalHost
}

func canonicalRuntimeHostname(hostname string) (string, bool) {
	if hostname == "" {
		return "", false
	}
	if ip := net.ParseIP(hostname); ip != nil {
		if ipv4 := ip.To4(); ipv4 != nil {
			return ipv4.String(), true
		}
		return "[" + ip.String() + "]", true
	}
	if len(hostname) > 253 || hostname != strings.ToLower(hostname) || strings.HasSuffix(hostname, ".") {
		return "", false
	}
	numericAddress := true
	for _, character := range hostname {
		if character != '.' && (character < '0' || character > '9') {
			numericAddress = false
			break
		}
	}
	if numericAddress {
		return "", false
	}
	for _, label := range strings.Split(hostname, ".") {
		if len(label) == 0 || len(label) > 63 || label[0] == '-' || label[len(label)-1] == '-' {
			return "", false
		}
		for _, character := range label {
			isLowercaseLetter := character >= 'a' && character <= 'z'
			isDigit := character >= '0' && character <= '9'
			if !isLowercaseLetter && !isDigit && character != '-' {
				return "", false
			}
		}
	}
	return hostname, true
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	config, err := loadRuntimeConfig(os.Getenv, time.Now)
	if err != nil {
		var configErr *runtimeConfigError
		if errors.As(err, &configErr) {
			logger.Error("invalid runtime configuration", "key", configErr.key, "error", configErr.description)
		} else {
			logger.Error("invalid runtime configuration", "error", "unable to initialize authentication")
		}
		os.Exit(1)
	}
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
	router := deliveryhttp.NewRouter(service, pool.Ping, config.adminAuth, config.corsOrigin, logger)
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
