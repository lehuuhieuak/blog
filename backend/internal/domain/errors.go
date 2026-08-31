package domain

import "errors"

var (
	ErrNotFound     = errors.New("not found")
	ErrConflict     = errors.New("conflict")
	ErrSlugLocked   = errors.New("slug is locked after first publication")
	ErrInvalidState = errors.New("invalid article state")
)

// ValidationError identifies invalid request fields without coupling the domain to HTTP.
type ValidationError struct {
	Fields map[string]string
}

func (e *ValidationError) Error() string { return "validation failed" }

func NewValidationError(fields map[string]string) error {
	if len(fields) == 0 {
		return nil
	}
	return &ValidationError{Fields: fields}
}
