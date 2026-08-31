//go:build integration

package postgres

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/hieulh/blog/backend/internal/application"
	"github.com/hieulh/blog/backend/internal/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestRepositoryArticleLifecycle(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL is required for PostgreSQL integration tests")
	}
	ctx := context.Background()
	adminPool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	defer adminPool.Close()
	schema := fmt.Sprintf("blog_test_%d", time.Now().UnixNano())
	if _, err := adminPool.Exec(ctx, "CREATE SCHEMA "+schema); err != nil {
		t.Fatal(err)
	}
	defer func() { _, _ = adminPool.Exec(ctx, "DROP SCHEMA "+schema+" CASCADE") }()
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	config.ConnConfig.RuntimeParams["search_path"] = schema
	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	migration, err := os.ReadFile(filepath.Join("..", "..", "..", "migrations", "000001_initial.sql"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, string(migration)); err != nil {
		t.Fatal(err)
	}

	repository := NewRepository(pool)
	transactions := NewTransactionManager(pool)
	now := time.Date(2026, 8, 31, 12, 0, 0, 0, time.UTC)
	article, err := domain.NewArticle("11111111-1111-1111-1111-111111111111", domain.ArticleValues{Title: "Bài nháp", Slug: "bai-nhap", Excerpt: "Mô tả", ContentMarkdown: "Nội dung", Status: domain.StatusDraft, Tags: []domain.Tag{{Name: "Golang", Slug: "golang"}}}, now)
	if err != nil {
		t.Fatal(err)
	}
	if err := transactions.WithinTransaction(ctx, func(txCtx context.Context) error { return repository.Create(txCtx, article) }); err != nil {
		t.Fatal(err)
	}
	if _, err := repository.GetPublicBySlug(ctx, article.Slug); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("draft public lookup error = %v", err)
	}
	published := domain.ArticleValues{Title: article.Title, Slug: article.Slug, Excerpt: article.Excerpt, ContentMarkdown: article.ContentMarkdown, Status: domain.StatusPublished, Tags: article.Tags}
	if err := article.Update(published, now.Add(time.Hour)); err != nil {
		t.Fatal(err)
	}
	if err := transactions.WithinTransaction(ctx, func(txCtx context.Context) error { return repository.Update(txCtx, article) }); err != nil {
		t.Fatal(err)
	}
	page, err := repository.ListPublic(ctx, application.ListOptions{Page: 1, PageSize: 10, Tag: "golang"})
	if err != nil {
		t.Fatal(err)
	}
	if page.Total != 1 || len(page.Data) != 1 || page.Data[0].PublishedAt == nil || len(page.Data[0].Tags) != 1 {
		t.Fatalf("unexpected page: %#v", page)
	}
}
