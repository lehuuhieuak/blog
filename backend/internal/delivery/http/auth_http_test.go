package deliveryhttp

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/hieulh/blog/backend/internal/application"
	"github.com/hieulh/blog/backend/internal/domain"
)

const (
	testAdminOrigin = "https://blog.example"
	testAdminSecret = "0123456789abcdef0123456789abcdef"
)

var testAdminNow = time.Date(2026, time.September, 24, 12, 0, 0, 0, time.UTC)

func newHTTPTestAuth(t *testing.T) *AdminAuth {
	t.Helper()
	auth, err := NewAdminAuth(testAdminSecret, true, testAdminOrigin, func() time.Time { return testAdminNow })
	if err != nil {
		t.Fatalf("NewAdminAuth() error = %v", err)
	}
	return auth
}

func newHTTPTestAuthForRouter() *AdminAuth {
	auth, err := NewAdminAuth(testAdminSecret, true, testAdminOrigin, func() time.Time { return testAdminNow })
	if err != nil {
		panic(err)
	}
	return auth
}

func newHTTPTestRouter(articles ArticleUseCases, auth *AdminAuth) http.Handler {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return NewRouter(articles, func(context.Context) error { return nil }, auth, testAdminOrigin, logger)
}

func TestAdminLoginAndSession(t *testing.T) {
	auth := newHTTPTestAuth(t)
	router := newHTTPTestRouter(fakeArticles{}, auth)

	login := httptest.NewRequest(http.MethodPost, "/api/v1/admin/auth/login", strings.NewReader(`{"username":"admin","password":"Hieu1234@@"}`))
	login.Header.Set("Content-Type", "application/json")
	login.Header.Set("Origin", testAdminOrigin)
	loginResponse := httptest.NewRecorder()
	router.ServeHTTP(loginResponse, login)
	if loginResponse.Code != http.StatusNoContent {
		t.Fatalf("login status=%d body=%s", loginResponse.Code, loginResponse.Body.String())
	}
	cookie := loginResponse.Result().Cookies()
	if len(cookie) != 1 || cookie[0].Name != adminCookieName || cookie[0].Value == "" {
		t.Fatalf("login cookies=%#v, want one %q cookie", cookie, adminCookieName)
	}

	session := httptest.NewRequest(http.MethodGet, "/api/v1/admin/auth/session", nil)
	session.AddCookie(cookie[0])
	sessionResponse := httptest.NewRecorder()
	router.ServeHTTP(sessionResponse, session)
	if sessionResponse.Code != http.StatusOK {
		t.Fatalf("session status=%d body=%s", sessionResponse.Code, sessionResponse.Body.String())
	}
	var body struct {
		Data AdminSession `json:"data"`
	}
	if err := json.Unmarshal(sessionResponse.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode session response: %v", err)
	}
	if body.Data.Username != "admin" || !body.Data.ExpiresAt.Equal(testAdminNow.Add(adminSessionTTL)) || body.Data.ExpiresAt.Location() != time.UTC {
		t.Fatalf("session data=%#v", body.Data)
	}
}

func TestAdminLoginRejectsCredentials(t *testing.T) {
	router := newHTTPTestRouter(fakeArticles{}, newHTTPTestAuth(t))
	tests := []struct {
		name string
		body string
	}{
		{name: "wrong username", body: `{"username":"other","password":"Hieu1234@@"}`},
		{name: "wrong password", body: `{"username":"admin","password":"wrong"}`},
	}
	var firstBody string
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "/api/v1/admin/auth/login", strings.NewReader(test.body))
			request.Header.Set("Content-Type", "application/json")
			request.Header.Set("Origin", testAdminOrigin)
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			if response.Code != http.StatusUnauthorized || !strings.Contains(response.Body.String(), `"code":"unauthorized"`) {
				t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
			}
			if len(response.Result().Cookies()) != 0 {
				t.Fatalf("rejected login set cookies: %#v", response.Result().Cookies())
			}
			if firstBody == "" {
				firstBody = response.Body.String()
			} else if response.Body.String() != firstBody {
				t.Fatalf("credential failures returned different envelopes: first=%s got=%s", firstBody, response.Body.String())
			}
		})
	}
}

func TestAdminLoginValidatesJSON(t *testing.T) {
	router := newHTTPTestRouter(fakeArticles{}, newHTTPTestAuth(t))
	tests := []struct {
		name string
		body string
	}{
		{name: "malformed JSON", body: `{"username":`},
		{name: "missing username", body: `{"password":"Hieu1234@@"}`},
		{name: "missing password", body: `{"username":"admin"}`},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "/api/v1/admin/auth/login", strings.NewReader(test.body))
			request.Header.Set("Content-Type", "application/json")
			request.Header.Set("Origin", testAdminOrigin)
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			if response.Code != http.StatusUnprocessableEntity || !strings.Contains(response.Body.String(), `"code":"validation_error"`) {
				t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
			}
		})
	}
}

func TestAdminLogoutClearsCookie(t *testing.T) {
	router := newHTTPTestRouter(fakeArticles{}, newHTTPTestAuth(t))
	request := httptest.NewRequest(http.MethodPost, "/api/v1/admin/auth/logout", nil)
	request.Header.Set("Origin", testAdminOrigin)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusNoContent {
		t.Fatalf("logout status=%d body=%s", response.Code, response.Body.String())
	}
	cookies := response.Result().Cookies()
	if len(cookies) != 1 || cookies[0].Name != adminCookieName || cookies[0].MaxAge != -1 || cookies[0].Value != "" {
		t.Fatalf("logout cookies=%#v, want cleared %q cookie", cookies, adminCookieName)
	}
}

type countingAdminArticles struct {
	fakeArticles
	calls int
}

func (f *countingAdminArticles) Create(context.Context, application.ArticleInput) (*domain.Article, error) {
	f.calls++
	return nil, nil
}
func (f *countingAdminArticles) Update(context.Context, string, application.ArticleInput) (*domain.Article, error) {
	f.calls++
	return nil, nil
}
func (f *countingAdminArticles) Delete(context.Context, string) error { f.calls++; return nil }
func (f *countingAdminArticles) GetAdmin(context.Context, string) (*domain.Article, error) {
	f.calls++
	return nil, domain.ErrNotFound
}
func (f *countingAdminArticles) ListAdmin(context.Context, application.ListOptions) (application.ArticlePage, error) {
	f.calls++
	return application.ArticlePage{}, nil
}
func (f *countingAdminArticles) Preview(string) (application.RenderedMarkdown, error) {
	f.calls++
	return application.RenderedMarkdown{}, nil
}

func TestAdminRoutesRequireSession(t *testing.T) {
	articles := &countingAdminArticles{}
	router := newHTTPTestRouter(articles, newHTTPTestAuth(t))
	tests := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		{name: "session", method: http.MethodGet, path: "/api/v1/admin/auth/session"},
		{name: "list", method: http.MethodGet, path: "/api/v1/admin/articles"},
		{name: "create", method: http.MethodPost, path: "/api/v1/admin/articles", body: `{"title":"Draft"}`},
		{name: "get", method: http.MethodGet, path: "/api/v1/admin/articles/article-1"},
		{name: "update", method: http.MethodPut, path: "/api/v1/admin/articles/article-1", body: `{"title":"Draft"}`},
		{name: "delete", method: http.MethodDelete, path: "/api/v1/admin/articles/article-1"},
		{name: "preview", method: http.MethodPost, path: "/api/v1/admin/markdown/preview", body: `{"content_markdown":"# Preview"}`},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(test.method, test.path, strings.NewReader(test.body))
			request.Header.Set("Origin", testAdminOrigin)
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			if response.Code != http.StatusUnauthorized || !strings.Contains(response.Body.String(), `"code":"unauthorized"`) {
				t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
			}
		})
	}
	if articles.calls != 0 {
		t.Fatalf("article use cases called %d times for unauthenticated requests", articles.calls)
	}
}

func TestAdminUnsafeRoutesRequireOrigin(t *testing.T) {
	auth := newHTTPTestAuth(t)
	articles := &countingAdminArticles{}
	router := newHTTPTestRouter(articles, auth)
	cookie, _, err := auth.issueCookie()
	if err != nil {
		t.Fatalf("issueCookie() error = %v", err)
	}
	tests := []struct {
		name   string
		method string
		path   string
		body   string
		origin string
		cookie bool
	}{
		{name: "login missing origin", method: http.MethodPost, path: "/api/v1/admin/auth/login", body: `{"username":"admin","password":"Hieu1234@@"}`},
		{name: "login wrong origin", method: http.MethodPost, path: "/api/v1/admin/auth/login", body: `{"username":"admin","password":"Hieu1234@@"}`, origin: "https://evil.example"},
		{name: "logout missing origin", method: http.MethodPost, path: "/api/v1/admin/auth/logout"},
		{name: "logout wrong origin", method: http.MethodPost, path: "/api/v1/admin/auth/logout", origin: "https://evil.example"},
		{name: "create missing origin", method: http.MethodPost, path: "/api/v1/admin/articles", body: `{"title":"Draft"}`, cookie: true},
		{name: "create wrong origin", method: http.MethodPost, path: "/api/v1/admin/articles", body: `{"title":"Draft"}`, origin: "https://evil.example", cookie: true},
		{name: "update missing origin", method: http.MethodPut, path: "/api/v1/admin/articles/article-1", body: `{"title":"Draft"}`, cookie: true},
		{name: "update wrong origin", method: http.MethodPut, path: "/api/v1/admin/articles/article-1", body: `{"title":"Draft"}`, origin: "https://evil.example", cookie: true},
		{name: "delete missing origin", method: http.MethodDelete, path: "/api/v1/admin/articles/article-1", cookie: true},
		{name: "delete wrong origin", method: http.MethodDelete, path: "/api/v1/admin/articles/article-1", origin: "https://evil.example", cookie: true},
		{name: "preview missing origin", method: http.MethodPost, path: "/api/v1/admin/markdown/preview", body: `{"content_markdown":"# Preview"}`, cookie: true},
		{name: "preview wrong origin", method: http.MethodPost, path: "/api/v1/admin/markdown/preview", body: `{"content_markdown":"# Preview"}`, origin: "https://evil.example", cookie: true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(test.method, test.path, strings.NewReader(test.body))
			if test.origin != "" {
				request.Header.Set("Origin", test.origin)
			}
			if test.cookie {
				request.AddCookie(cookie)
			}
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), `"code":"csrf_failed"`) {
				t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
			}
		})
	}
	if articles.calls != 0 {
		t.Fatalf("article use cases called %d times for rejected origins", articles.calls)
	}

	request := httptest.NewRequest(http.MethodPost, "/api/v1/admin/auth/logout", nil)
	request.Header.Add("Origin", testAdminOrigin)
	request.Header.Add("Origin", "https://evil.example")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), `"code":"csrf_failed"`) {
		t.Fatalf("multiple origin status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestPublicRoutesDoNotRequireSession(t *testing.T) {
	router := newHTTPTestRouter(fakeArticles{}, newHTTPTestAuth(t))
	request := httptest.NewRequest(http.MethodGet, "/api/v1/articles", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("public route status=%d body=%s", response.Code, response.Body.String())
	}
}
