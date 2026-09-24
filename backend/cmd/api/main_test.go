package main

import (
	"strings"
	"testing"
	"time"
)

func TestLoadRuntimeConfig(t *testing.T) {
	fixedNow := time.Date(2026, time.September, 24, 12, 0, 0, 0, time.UTC)
	base := map[string]string{
		"ADMIN_SESSION_SECRET": strings.Repeat("s", 32),
		"ADMIN_COOKIE_SECURE":  "true",
		"CORS_ALLOWED_ORIGIN":  "https://blog.example",
	}
	tests := []struct {
		name             string
		overrides        map[string]string
		remove           string
		wantError        string
		wantCookieSecure bool
	}{
		{name: "missing session secret", remove: "ADMIN_SESSION_SECRET", wantError: "ADMIN_SESSION_SECRET"},
		{name: "short session secret", overrides: map[string]string{"ADMIN_SESSION_SECRET": strings.Repeat("s", 31)}, wantError: "ADMIN_SESSION_SECRET"},
		{name: "invalid secure flag", overrides: map[string]string{"ADMIN_COOKIE_SECURE": "sometimes"}, wantError: "ADMIN_COOKIE_SECURE"},
		{name: "empty CORS origin", overrides: map[string]string{"CORS_ALLOWED_ORIGIN": ""}, wantError: "CORS_ALLOWED_ORIGIN"},
		{name: "invalid CORS origin", overrides: map[string]string{"CORS_ALLOWED_ORIGIN": "https://blog.example/admin"}, wantError: "CORS_ALLOWED_ORIGIN"},
		{name: "valid config defaults insecure cookie", remove: "ADMIN_COOKIE_SECURE"},
		{name: "valid config secure cookie", wantCookieSecure: true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			values := make(map[string]string, len(base))
			for key, value := range base {
				values[key] = value
			}
			delete(values, test.remove)
			for key, value := range test.overrides {
				values[key] = value
			}
			config, err := loadRuntimeConfig(func(key string) string { return values[key] }, func() time.Time { return fixedNow })
			if test.wantError != "" {
				if err == nil || !strings.Contains(err.Error(), test.wantError) {
					t.Fatalf("loadRuntimeConfig() error = %v, want key %q", err, test.wantError)
				}
				return
			}
			if err != nil {
				t.Fatalf("loadRuntimeConfig() error = %v", err)
			}
			if config.adminAuth == nil || config.cookieSecure != test.wantCookieSecure || config.corsOrigin != "https://blog.example" {
				t.Fatalf("loadRuntimeConfig() = %#v", config)
			}
		})
	}
}
