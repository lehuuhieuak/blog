package deliveryhttp

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func signedTestPayload(t *testing.T, secret, payload string) string {
	t.Helper()
	encodedPayload := base64.RawURLEncoding.EncodeToString([]byte(payload))
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(encodedPayload))
	return encodedPayload + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func TestAdminAuthCredentials(t *testing.T) {
	now := func() time.Time { return time.Date(2026, time.September, 24, 12, 0, 0, 0, time.UTC) }
	auth, err := NewAdminAuth(strings.Repeat("s", 32), false, "https://blog.example", now)
	if err != nil {
		t.Fatalf("NewAdminAuth() error = %v", err)
	}

	tests := []struct {
		name, username, password string
		want                     bool
	}{
		{name: "valid", username: "admin", password: "Hieu1234@@", want: true},
		{name: "wrong username", username: "Admin", password: "Hieu1234@@"},
		{name: "wrong password", username: "admin", password: "Hieu1234@"},
		{name: "empty"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := auth.validCredentials(tt.username, tt.password); got != tt.want {
				t.Fatalf("validCredentials() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestAdminAuthConfig(t *testing.T) {
	now := func() time.Time { return time.Date(2026, time.September, 24, 12, 0, 0, 0, time.UTC) }

	tests := []struct {
		name          string
		secret        string
		allowedOrigin string
		now           func() time.Time
		wantErr       bool
	}{
		{name: "31 byte secret", secret: strings.Repeat("s", 31), allowedOrigin: "https://blog.example", now: now, wantErr: true},
		{name: "32 byte secret", secret: strings.Repeat("s", 32), allowedOrigin: "https://blog.example", now: now},
		{name: "nil clock", secret: strings.Repeat("s", 32), allowedOrigin: "https://blog.example", wantErr: true},
		{name: "empty origin", secret: strings.Repeat("s", 32), allowedOrigin: " \t ", now: now, wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := NewAdminAuth(tt.secret, false, tt.allowedOrigin, tt.now)
			if (err != nil) != tt.wantErr {
				t.Fatalf("NewAdminAuth() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestAdminSessionCookieRoundTrip(t *testing.T) {
	fixedNow := time.Date(2026, time.September, 24, 12, 0, 0, 0, time.UTC)
	auth, err := NewAdminAuth(strings.Repeat("s", 32), true, "https://blog.example", func() time.Time { return fixedNow })
	if err != nil {
		t.Fatalf("NewAdminAuth() error = %v", err)
	}

	cookie, wantSession, err := auth.issueCookie()
	if err != nil {
		t.Fatalf("issueCookie() error = %v", err)
	}
	wantExpiry := fixedNow.Add(8 * time.Hour)
	if cookie.Name != "admin_session" || cookie.Path != "/" || !cookie.HttpOnly || cookie.SameSite != http.SameSiteLaxMode || cookie.MaxAge != 28800 || !cookie.Secure || cookie.Domain != "" || !cookie.Expires.Equal(wantExpiry) {
		t.Fatalf("issueCookie() cookie attributes do not match the session contract: %#v", cookie)
	}
	if wantSession.Username != "admin" || !wantSession.ExpiresAt.Equal(wantExpiry) || wantSession.ExpiresAt.Location() != time.UTC {
		t.Fatalf("issueCookie() session = %#v, want admin expiring at %s UTC", wantSession, wantExpiry.Format(time.RFC3339))
	}

	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request.AddCookie(cookie)
	gotSession, err := auth.sessionFromRequest(request)
	if err != nil {
		t.Fatalf("sessionFromRequest() error = %v", err)
	}
	if gotSession != wantSession {
		t.Fatalf("sessionFromRequest() = %#v, want %#v", gotSession, wantSession)
	}
}

func TestAdminSessionCookieRejectsInvalidTokens(t *testing.T) {
	fixedNow := time.Date(2026, time.September, 24, 12, 0, 0, 0, time.UTC)
	secret := strings.Repeat("s", 32)
	auth, err := NewAdminAuth(secret, false, "https://blog.example", func() time.Time { return fixedNow })
	if err != nil {
		t.Fatalf("NewAdminAuth() error = %v", err)
	}
	cookie, _, err := auth.issueCookie()
	if err != nil {
		t.Fatalf("issueCookie() error = %v", err)
	}

	parts := strings.Split(cookie.Value, ".")
	if len(parts) != 2 {
		t.Fatalf("issued token has %d parts, want 2", len(parts))
	}
	tests := []struct {
		name  string
		value string
	}{
		{name: "mutated payload", value: parts[0] + "x." + parts[1]},
		{name: "mutated signature", value: parts[0] + "." + parts[1] + "x"},
		{name: "wrong version", value: signedTestPayload(t, secret, `{"version":2,"username":"admin","expires_at":1790270400}`)},
		{name: "wrong username", value: signedTestPayload(t, secret, `{"version":1,"username":"root","expires_at":1790270400}`)},
		{name: "expired", value: signedTestPayload(t, secret, `{"version":1,"username":"admin","expires_at":1790251199}`)},
		{name: "extra separator", value: cookie.Value + ".extra"},
		{name: "invalid base64url", value: "not$base64.sig"},
	}
	tests = append(tests, struct {
		name  string
		value string
	}{name: "missing cookie", value: ""})
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, "/", nil)
			if tt.name != "missing cookie" {
				request.AddCookie(&http.Cookie{Name: "admin_session", Value: tt.value})
			}
			_, gotErr := auth.sessionFromRequest(request)
			if !errors.Is(gotErr, errInvalidSession) {
				t.Fatalf("sessionFromRequest() error = %v, want errInvalidSession", gotErr)
			}
		})
	}
}

func TestAdminClearCookieAttributes(t *testing.T) {
	auth, err := NewAdminAuth(strings.Repeat("s", 32), true, "https://blog.example", func() time.Time {
		return time.Date(2026, time.September, 24, 12, 0, 0, 0, time.UTC)
	})
	if err != nil {
		t.Fatalf("NewAdminAuth() error = %v", err)
	}

	cookie := auth.clearCookie()
	if cookie.Name != "admin_session" || cookie.Path != "/" || !cookie.HttpOnly || cookie.SameSite != http.SameSiteLaxMode || cookie.MaxAge != -1 || !cookie.Secure || cookie.Domain != "" {
		t.Fatalf("clearCookie() attributes do not match the session contract: %#v", cookie)
	}
}
