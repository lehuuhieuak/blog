package domain

import (
	"regexp"
	"strings"
	"time"
)

type ArticleStatus string

const (
	StatusDraft     ArticleStatus = "draft"
	StatusPublished ArticleStatus = "published"
)

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

type Article struct {
	ID              string        `json:"id"`
	Title           string        `json:"title"`
	Slug            string        `json:"slug"`
	Excerpt         string        `json:"excerpt"`
	ContentMarkdown string        `json:"content_markdown"`
	Status          ArticleStatus `json:"status"`
	PublishedAt     *time.Time    `json:"published_at"`
	CreatedAt       time.Time     `json:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at"`
	Tags            []Tag         `json:"tags"`
}

type ArticleValues struct {
	Title           string
	Slug            string
	Excerpt         string
	ContentMarkdown string
	Status          ArticleStatus
	Tags            []Tag
}

func NewArticle(id string, values ArticleValues, now time.Time) (*Article, error) {
	article := &Article{ID: id, CreatedAt: now.UTC(), UpdatedAt: now.UTC()}
	if err := article.apply(values, now.UTC(), false); err != nil {
		return nil, err
	}
	return article, nil
}

func (a *Article) Update(values ArticleValues, now time.Time) error {
	return a.apply(values, now.UTC(), true)
}

func (a *Article) apply(values ArticleValues, now time.Time, existing bool) error {
	values.Title = strings.TrimSpace(values.Title)
	values.Slug = strings.TrimSpace(values.Slug)
	values.Excerpt = strings.TrimSpace(values.Excerpt)
	values.ContentMarkdown = strings.TrimSpace(values.ContentMarkdown)
	fields := map[string]string{}
	if values.Title == "" {
		fields["title"] = "title is required"
	}
	if values.Slug == "" || !slugPattern.MatchString(values.Slug) {
		fields["slug"] = "slug must contain lowercase letters, digits, and hyphens only"
	}
	if values.Excerpt == "" {
		fields["excerpt"] = "excerpt is required"
	}
	if values.ContentMarkdown == "" {
		fields["content_markdown"] = "content_markdown is required"
	}
	if values.Status != StatusDraft && values.Status != StatusPublished {
		fields["status"] = "status must be draft or published"
	}
	if err := NewValidationError(fields); err != nil {
		return err
	}
	if existing && a.PublishedAt != nil && values.Slug != a.Slug {
		return ErrSlugLocked
	}

	a.Title = values.Title
	a.Slug = values.Slug
	a.Excerpt = values.Excerpt
	a.ContentMarkdown = values.ContentMarkdown
	a.Status = values.Status
	a.Tags = append([]Tag(nil), values.Tags...)
	if values.Status == StatusPublished && a.PublishedAt == nil {
		publishedAt := now
		a.PublishedAt = &publishedAt
	}
	a.UpdatedAt = now
	return nil
}
