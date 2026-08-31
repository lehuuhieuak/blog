package application

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/hieulh/blog/backend/internal/domain"
)

type fakeRepository struct {
	articles map[string]*domain.Article
	slugs    map[string]bool
}

func (f *fakeRepository) Create(_ context.Context, a *domain.Article) error {
	f.articles[a.ID] = a
	f.slugs[a.Slug] = true
	return nil
}
func (f *fakeRepository) Update(_ context.Context, a *domain.Article) error {
	f.articles[a.ID] = a
	f.slugs[a.Slug] = true
	return nil
}
func (f *fakeRepository) Delete(_ context.Context, id string) error {
	if _, ok := f.articles[id]; !ok {
		return domain.ErrNotFound
	}
	delete(f.articles, id)
	return nil
}
func (f *fakeRepository) GetByID(_ context.Context, id string) (*domain.Article, error) {
	a, ok := f.articles[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return a, nil
}
func (f *fakeRepository) GetPublicBySlug(context.Context, string) (*domain.Article, error) {
	return nil, domain.ErrNotFound
}
func (f *fakeRepository) ListPublic(context.Context, ListOptions) (ArticlePage, error) {
	return ArticlePage{}, nil
}
func (f *fakeRepository) ListAdmin(context.Context, ListOptions) (ArticlePage, error) {
	return ArticlePage{}, nil
}
func (f *fakeRepository) ListTags(context.Context) ([]domain.Tag, error) { return nil, nil }
func (f *fakeRepository) SlugExists(_ context.Context, slug string) (bool, error) {
	return f.slugs[slug], nil
}

type fakeTransaction struct{ called bool }

func (f *fakeTransaction) WithinTransaction(ctx context.Context, fn func(context.Context) error) error {
	f.called = true
	return fn(ctx)
}

type fakeRenderer struct{}

func (fakeRenderer) Render(markdown string) (RenderedMarkdown, error) {
	return RenderedMarkdown{HTML: markdown}, nil
}

func TestCreateGeneratesVietnameseSlugAndUsesTransaction(t *testing.T) {
	repo := &fakeRepository{articles: map[string]*domain.Article{}, slugs: map[string]bool{"xin-chao-the-gioi": true}}
	tx := &fakeTransaction{}
	svc := NewArticleService(repo, tx, fakeRenderer{}, func() time.Time { return time.Date(2026, 8, 31, 0, 0, 0, 0, time.UTC) }, func() string { return "article-1" })
	article, err := svc.Create(context.Background(), ArticleInput{Title: "Xin chào thế giới!", Excerpt: "Mo ta", ContentMarkdown: "Noi dung", Tags: []string{" Go ", "go", "Kiến trúc"}, Status: domain.StatusDraft})
	if err != nil {
		t.Fatal(err)
	}
	if article.Slug != "xin-chao-the-gioi-2" {
		t.Fatalf("slug = %q", article.Slug)
	}
	if len(article.Tags) != 2 {
		t.Fatalf("tags = %#v", article.Tags)
	}
	if !tx.called {
		t.Fatal("create did not use transaction")
	}
}

func TestCreateRejectsManualSlugCollision(t *testing.T) {
	repo := &fakeRepository{articles: map[string]*domain.Article{}, slugs: map[string]bool{"taken": true}}
	svc := NewArticleService(repo, &fakeTransaction{}, fakeRenderer{}, time.Now, func() string { return "id" })
	_, err := svc.Create(context.Background(), ArticleInput{Title: "x", Slug: "taken", Excerpt: "x", ContentMarkdown: "x", Status: domain.StatusDraft})
	if !errors.Is(err, domain.ErrConflict) {
		t.Fatalf("error = %v", err)
	}
}

func TestNormalizeListOptions(t *testing.T) {
	cases := []struct {
		name               string
		input              ListOptions
		wantPage, wantSize int
		wantErr            bool
	}{
		{"defaults", ListOptions{}, 1, 10, false}, {"valid", ListOptions{Page: 2, PageSize: 50}, 2, 50, false}, {"bad page", ListOptions{Page: -1}, 0, 0, true}, {"too large", ListOptions{PageSize: 51}, 0, 0, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := NormalizeListOptions(tc.input)
			if (err != nil) != tc.wantErr {
				t.Fatalf("error = %v", err)
			}
			if !tc.wantErr && (got.Page != tc.wantPage || got.PageSize != tc.wantSize) {
				t.Fatalf("got = %#v", got)
			}
		})
	}
}

func TestUpdateKeepsPublishedSlug(t *testing.T) {
	now := time.Date(2026, 8, 31, 0, 0, 0, 0, time.UTC)
	article, err := domain.NewArticle("id", domain.ArticleValues{Title: "x", Slug: "original", Excerpt: "x", ContentMarkdown: "x", Status: domain.StatusPublished}, now)
	if err != nil {
		t.Fatal(err)
	}
	repo := &fakeRepository{articles: map[string]*domain.Article{"id": article}, slugs: map[string]bool{"original": true}}
	svc := NewArticleService(repo, &fakeTransaction{}, fakeRenderer{}, func() time.Time { return now }, func() string { return "id" })
	_, err = svc.Update(context.Background(), "id", ArticleInput{Title: "x", Slug: "new-slug", Excerpt: "x", ContentMarkdown: "x", Status: domain.StatusPublished})
	if !errors.Is(err, domain.ErrSlugLocked) {
		t.Fatalf("error = %v", err)
	}
}
