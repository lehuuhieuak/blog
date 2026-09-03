package domain

import (
	"errors"
	"testing"
	"time"
)

func TestArticlePublicationAndSlugRules(t *testing.T) {
	now := time.Date(2026, 8, 31, 12, 0, 0, 0, time.UTC)
	base := ArticleValues{Title: "Bài viết", Slug: "bai-viet", Excerpt: "Tom tat", ContentMarkdown: "# Noi dung", Status: StatusDraft}
	article, err := NewArticle("id", base, now)
	if err != nil {
		t.Fatal(err)
	}

	updated := base
	updated.Status = StatusPublished
	if err := article.Update(updated, now.Add(time.Hour)); err != nil {
		t.Fatal(err)
	}
	if article.PublishedAt == nil || !article.PublishedAt.Equal(now.Add(time.Hour)) {
		t.Fatalf("published_at = %v", article.PublishedAt)
	}

	updated.Status = StatusDraft
	if err := article.Update(updated, now.Add(2*time.Hour)); err != nil {
		t.Fatal(err)
	}
	if article.PublishedAt == nil || !article.PublishedAt.Equal(now.Add(time.Hour)) {
		t.Fatal("unpublish must retain published_at")
	}

	updated.Slug = "changed"
	if err := article.Update(updated, now.Add(3*time.Hour)); !errors.Is(err, ErrSlugLocked) {
		t.Fatalf("error = %v, want ErrSlugLocked", err)
	}
}

func TestNewArticleValidation(t *testing.T) {
	cases := []struct {
		name   string
		values ArticleValues
		field  string
	}{
		{"missing title", ArticleValues{Slug: "slug", Excerpt: "x", ContentMarkdown: "x", Status: StatusDraft}, "title"},
		{"bad slug", ArticleValues{Title: "x", Slug: "Sai slug", Excerpt: "x", ContentMarkdown: "x", Status: StatusDraft}, "slug"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := NewArticle("id", tc.values, time.Now())
			var validation *ValidationError
			if !errors.As(err, &validation) || validation.Fields[tc.field] == "" {
				t.Fatalf("error = %#v", err)
			}
		})
	}
}
