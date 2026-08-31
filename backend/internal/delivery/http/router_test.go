package deliveryhttp

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/hieulh/blog/backend/internal/application"
	"github.com/hieulh/blog/backend/internal/domain"
)

type fakeArticles struct {
	publicErr error
	listErr   error
}

func (f fakeArticles) Create(context.Context, application.ArticleInput) (*domain.Article, error) {
	return nil, nil
}
func (f fakeArticles) Update(context.Context, string, application.ArticleInput) (*domain.Article, error) {
	return nil, nil
}
func (f fakeArticles) Delete(context.Context, string) error { return nil }
func (f fakeArticles) GetAdmin(context.Context, string) (*domain.Article, error) {
	return nil, domain.ErrNotFound
}
func (f fakeArticles) GetPublic(context.Context, string) (*domain.Article, error) {
	return nil, f.publicErr
}
func (f fakeArticles) ListPublic(context.Context, application.ListOptions) (application.ArticlePage, error) {
	return application.ArticlePage{}, f.listErr
}
func (f fakeArticles) ListAdmin(context.Context, application.ListOptions) (application.ArticlePage, error) {
	return application.ArticlePage{}, nil
}
func (f fakeArticles) Tags(context.Context) ([]domain.Tag, error) { return nil, nil }
func (f fakeArticles) Preview(string) (application.RenderedMarkdown, error) {
	return application.RenderedMarkdown{}, nil
}

func newTestRouter(articles ArticleUseCases) http.Handler {
	return NewRouter(articles, func(context.Context) error { return nil }, "https://blog.example", slog.New(slog.NewTextHandler(io.Discard, nil)))
}
func TestPublicArticleMapsNotFound(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/articles/draft", nil)
	response := httptest.NewRecorder()
	newTestRouter(fakeArticles{publicErr: domain.ErrNotFound}).ServeHTTP(response, request)
	if response.Code != http.StatusNotFound || !strings.Contains(response.Body.String(), "not_found") {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
}
func TestListRejectsInvalidPagination(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/articles?page=abc", nil)
	response := httptest.NewRecorder()
	newTestRouter(fakeArticles{}).ServeHTTP(response, request)
	if response.Code != http.StatusUnprocessableEntity || !strings.Contains(response.Body.String(), "validation_error") {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
}
func TestReadyMapsFailure(t *testing.T) {
	router := NewRouter(fakeArticles{}, func(context.Context) error { return errors.New("database unavailable") }, "", slog.New(slog.NewTextHandler(io.Discard, nil)))
	request := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("status=%d", response.Code)
	}
}
func TestCORSAllowsConfiguredOriginOnly(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	request.Header.Set("Origin", "https://blog.example")
	response := httptest.NewRecorder()
	newTestRouter(fakeArticles{}).ServeHTTP(response, request)
	if response.Header().Get("Access-Control-Allow-Origin") != "https://blog.example" {
		t.Fatal("configured origin was not allowed")
	}
	request = httptest.NewRequest(http.MethodGet, "/healthz", nil)
	request.Header.Set("Origin", "https://other.example")
	response = httptest.NewRecorder()
	newTestRouter(fakeArticles{}).ServeHTTP(response, request)
	if response.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("unexpected CORS origin")
	}
}
