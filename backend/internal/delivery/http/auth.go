package deliveryhttp

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

const (
	adminUsername       = "admin"
	adminPasswordHash   = "$2b$12$M2x1.Uei/N/F8nKzWIoT7eoGwZpBF/hRdYPasq//df2ftNgyk5Wde"
	adminCookieName     = "admin_session"
	adminSessionTTL     = 8 * time.Hour
	adminSessionVersion = 1
)

var errInvalidSession = errors.New("invalid admin session")

type AdminSession struct {
	Username  string    `json:"username"`
	ExpiresAt time.Time `json:"expires_at"`
}

type AdminAuth struct {
	secret        []byte
	secure        bool
	allowedOrigin string
	now           func() time.Time
}

type adminSessionPayload struct {
	Version   int    `json:"version"`
	Username  string `json:"username"`
	ExpiresAt int64  `json:"expires_at"`
}

func NewAdminAuth(secret string, secure bool, allowedOrigin string, now func() time.Time) (*AdminAuth, error) {
	if len([]byte(secret)) < 32 {
		return nil, errors.New("admin session secret must be at least 32 bytes")
	}
	if now == nil {
		return nil, errors.New("admin auth clock must not be nil")
	}
	allowedOrigin = strings.TrimSpace(allowedOrigin)
	if allowedOrigin == "" {
		return nil, errors.New("admin allowed origin must not be empty")
	}

	return &AdminAuth{
		secret:        append([]byte(nil), []byte(secret)...),
		secure:        secure,
		allowedOrigin: allowedOrigin,
		now:           now,
	}, nil
}

func (a *AdminAuth) validCredentials(username, password string) bool {
	passwordErr := bcrypt.CompareHashAndPassword([]byte(adminPasswordHash), []byte(password))
	usernameMatches := subtle.ConstantTimeCompare([]byte(username), []byte(adminUsername))
	return usernameMatches == 1 && passwordErr == nil
}

func (a *AdminAuth) issueCookie() (*http.Cookie, AdminSession, error) {
	expiresAt := a.now().Add(adminSessionTTL).UTC()
	payload, err := json.Marshal(adminSessionPayload{
		Version:   adminSessionVersion,
		Username:  adminUsername,
		ExpiresAt: expiresAt.UnixNano(),
	})
	if err != nil {
		return nil, AdminSession{}, errors.New("encode admin session")
	}

	encodedPayload := base64.RawURLEncoding.EncodeToString(payload)
	mac := hmac.New(sha256.New, a.secret)
	_, _ = mac.Write([]byte(encodedPayload))
	token := encodedPayload + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return &http.Cookie{
		Name:     adminCookieName,
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		MaxAge:   int(adminSessionTTL.Seconds()),
		HttpOnly: true,
		Secure:   a.secure,
		SameSite: http.SameSiteLaxMode,
	}, AdminSession{Username: adminUsername, ExpiresAt: expiresAt}, nil
}

func (a *AdminAuth) clearCookie() *http.Cookie {
	return &http.Cookie{
		Name:     adminCookieName,
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(1, 0).UTC(),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   a.secure,
		SameSite: http.SameSiteLaxMode,
	}
}

func (a *AdminAuth) sessionFromRequest(request *http.Request) (AdminSession, error) {
	if request == nil {
		return AdminSession{}, errInvalidSession
	}
	cookie, err := request.Cookie(adminCookieName)
	if err != nil {
		return AdminSession{}, errInvalidSession
	}
	encodedPayload, encodedSignature, ok := strings.Cut(cookie.Value, ".")
	if !ok || encodedPayload == "" || encodedSignature == "" || strings.Contains(encodedSignature, ".") {
		return AdminSession{}, errInvalidSession
	}

	payload, err := base64.RawURLEncoding.DecodeString(encodedPayload)
	if err != nil || base64.RawURLEncoding.EncodeToString(payload) != encodedPayload {
		return AdminSession{}, errInvalidSession
	}
	signature, err := base64.RawURLEncoding.DecodeString(encodedSignature)
	if err != nil || base64.RawURLEncoding.EncodeToString(signature) != encodedSignature {
		return AdminSession{}, errInvalidSession
	}

	mac := hmac.New(sha256.New, a.secret)
	_, _ = mac.Write([]byte(encodedPayload))
	if !hmac.Equal(signature, mac.Sum(nil)) {
		return AdminSession{}, errInvalidSession
	}

	var session adminSessionPayload
	if err := json.Unmarshal(payload, &session); err != nil {
		return AdminSession{}, errInvalidSession
	}
	if session.Version != adminSessionVersion || session.Username != adminUsername {
		return AdminSession{}, errInvalidSession
	}
	expiresAt := time.Unix(0, session.ExpiresAt).UTC()
	if !a.now().Before(expiresAt) {
		return AdminSession{}, errInvalidSession
	}
	return AdminSession{Username: session.Username, ExpiresAt: expiresAt}, nil
}
