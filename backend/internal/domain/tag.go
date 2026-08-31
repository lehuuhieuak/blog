package domain

import "strings"

type Tag struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

func NewTag(name, slug string) (Tag, error) {
	tag := Tag{Name: strings.TrimSpace(name), Slug: strings.TrimSpace(slug)}
	if err := NewValidationError(map[string]string{}); err != nil {
		return Tag{}, err
	}
	fields := map[string]string{}
	if tag.Name == "" {
		fields["tag"] = "tag must not be empty"
	}
	if tag.Slug == "" {
		fields["tag"] = "tag slug must not be empty"
	}
	if err := NewValidationError(fields); err != nil {
		return Tag{}, err
	}
	return tag, nil
}
