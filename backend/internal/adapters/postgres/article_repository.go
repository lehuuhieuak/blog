package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/hieulh/blog/backend/internal/application"
	"github.com/hieulh/blog/backend/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct{ pool *pgxpool.Pool }

func NewRepository(pool *pgxpool.Pool) *Repository { return &Repository{pool: pool} }

type dbtx interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}
type transactionKey struct{}

type TransactionManager struct{ pool *pgxpool.Pool }

func NewTransactionManager(pool *pgxpool.Pool) *TransactionManager {
	return &TransactionManager{pool: pool}
}
func (m *TransactionManager) WithinTransaction(ctx context.Context, fn func(context.Context) error) error {
	tx, err := m.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if err := fn(context.WithValue(ctx, transactionKey{}, tx)); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}
	return nil
}
func (r *Repository) executor(ctx context.Context) dbtx {
	if tx, ok := ctx.Value(transactionKey{}).(pgx.Tx); ok {
		return tx
	}
	return r.pool
}

const articleSelect = `SELECT a.id, a.title, a.slug, a.excerpt, a.content_markdown, a.cover_image_url, a.status, a.published_at, a.created_at, a.updated_at,
COALESCE(jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug) ORDER BY t.slug) FILTER (WHERE t.id IS NOT NULL), '[]'::jsonb)
FROM articles a
LEFT JOIN article_tags at ON at.article_id = a.id
LEFT JOIN tags t ON t.id = at.tag_id`
const articleGroup = ` GROUP BY a.id`

func (r *Repository) Create(ctx context.Context, article *domain.Article) error {
	exec := r.executor(ctx)
	_, err := exec.Exec(ctx, `INSERT INTO articles (id, title, slug, excerpt, content_markdown, cover_image_url, status, published_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, article.ID, article.Title, article.Slug, article.Excerpt, article.ContentMarkdown, article.CoverImageURL, article.Status, article.PublishedAt, article.CreatedAt, article.UpdatedAt)
	if err != nil {
		return mapError(err)
	}
	return r.replaceTags(ctx, exec, article.ID, article.Tags)
}

func (r *Repository) Update(ctx context.Context, article *domain.Article) error {
	exec := r.executor(ctx)
	result, err := exec.Exec(ctx, `UPDATE articles SET title=$2, slug=$3, excerpt=$4, content_markdown=$5, cover_image_url=$6, status=$7, published_at=$8, updated_at=$9 WHERE id=$1`, article.ID, article.Title, article.Slug, article.Excerpt, article.ContentMarkdown, article.CoverImageURL, article.Status, article.PublishedAt, article.UpdatedAt)
	if err != nil {
		return mapError(err)
	}
	if result.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	if err := r.replaceTags(ctx, exec, article.ID, article.Tags); err != nil {
		return err
	}
	return nil
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	result, err := r.executor(ctx).Exec(ctx, `DELETE FROM articles WHERE id=$1`, id)
	if err != nil {
		return mapError(err)
	}
	if result.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Repository) replaceTags(ctx context.Context, exec dbtx, articleID string, tags []domain.Tag) error {
	if _, err := exec.Exec(ctx, `DELETE FROM article_tags WHERE article_id=$1`, articleID); err != nil {
		return mapError(err)
	}
	for _, tag := range tags {
		var tagID int64
		err := exec.QueryRow(ctx, `INSERT INTO tags (name, slug) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING id`, tag.Name, tag.Slug).Scan(&tagID)
		if err != nil {
			return mapError(err)
		}
		if _, err = exec.Exec(ctx, `INSERT INTO article_tags (article_id, tag_id) VALUES ($1,$2)`, articleID, tagID); err != nil {
			return mapError(err)
		}
	}
	return nil
}

func (r *Repository) GetByID(ctx context.Context, id string) (*domain.Article, error) {
	return scanArticle(r.executor(ctx).QueryRow(ctx, articleSelect+` WHERE a.id=$1`+articleGroup, id))
}
func (r *Repository) GetPublicBySlug(ctx context.Context, slug string) (*domain.Article, error) {
	return scanArticle(r.executor(ctx).QueryRow(ctx, articleSelect+` WHERE a.slug=$1 AND a.status='published'`+articleGroup, slug))
}

func (r *Repository) ListPublic(ctx context.Context, options application.ListOptions) (application.ArticlePage, error) {
	where := " WHERE a.status='published'"
	args := []any{}
	if options.Tag != "" {
		args = append(args, options.Tag)
		where += fmt.Sprintf(" AND EXISTS (SELECT 1 FROM article_tags filter_at JOIN tags filter_t ON filter_t.id=filter_at.tag_id WHERE filter_at.article_id=a.id AND filter_t.slug=$%d)", len(args))
	}
	return r.list(ctx, where, args, options)
}
func (r *Repository) ListAdmin(ctx context.Context, options application.ListOptions) (application.ArticlePage, error) {
	where := ""
	args := []any{}
	if options.Status != "" {
		args = append(args, options.Status)
		where = " WHERE a.status=$1"
	}
	return r.list(ctx, where, args, options)
}
func (r *Repository) list(ctx context.Context, where string, args []any, options application.ListOptions) (application.ArticlePage, error) {
	exec := r.executor(ctx)
	var total int
	if err := exec.QueryRow(ctx, `SELECT COUNT(*) FROM articles a`+where, args...).Scan(&total); err != nil {
		return application.ArticlePage{}, mapError(err)
	}
	page := application.ArticlePage{Data: []*domain.Article{}, Page: options.Page, PageSize: options.PageSize, Total: total}
	if total > 0 {
		page.TotalPages = (total + options.PageSize - 1) / options.PageSize
	}
	pageArgs := append(append([]any{}, args...), options.PageSize, (options.Page-1)*options.PageSize)
	query := articleSelect + where + articleGroup + fmt.Sprintf(" ORDER BY a.published_at DESC NULLS LAST, a.created_at DESC LIMIT $%d OFFSET $%d", len(pageArgs)-1, len(pageArgs))
	rows, err := r.pool.Query(ctx, query, pageArgs...)
	if tx, ok := ctx.Value(transactionKey{}).(pgx.Tx); ok {
		rows, err = tx.Query(ctx, query, pageArgs...)
	}
	if err != nil {
		return application.ArticlePage{}, mapError(err)
	}
	defer rows.Close()
	for rows.Next() {
		article, err := scanArticle(rows)
		if err != nil {
			return application.ArticlePage{}, err
		}
		page.Data = append(page.Data, article)
	}
	if err := rows.Err(); err != nil {
		return application.ArticlePage{}, mapError(err)
	}
	return page, nil
}

func (r *Repository) ListTags(ctx context.Context) ([]domain.Tag, error) {
	rows, err := r.pool.Query(ctx, `SELECT DISTINCT t.id, t.name, t.slug FROM tags t JOIN article_tags at ON at.tag_id=t.id JOIN articles a ON a.id=at.article_id WHERE a.status='published' ORDER BY t.name`)
	if tx, ok := ctx.Value(transactionKey{}).(pgx.Tx); ok {
		rows, err = tx.Query(ctx, `SELECT DISTINCT t.id, t.name, t.slug FROM tags t JOIN article_tags at ON at.tag_id=t.id JOIN articles a ON a.id=at.article_id WHERE a.status='published' ORDER BY t.name`)
	}
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()
	tags := []domain.Tag{}
	for rows.Next() {
		var tag domain.Tag
		if err := rows.Scan(&tag.ID, &tag.Name, &tag.Slug); err != nil {
			return nil, mapError(err)
		}
		tags = append(tags, tag)
	}
	if err := rows.Err(); err != nil {
		return nil, mapError(err)
	}
	return tags, nil
}

func (r *Repository) SlugExists(ctx context.Context, slug string) (bool, error) {
	var exists bool
	err := r.executor(ctx).QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM articles WHERE slug=$1)`, slug).Scan(&exists)
	return exists, mapError(err)
}

type articleScanner interface{ Scan(...any) error }

func scanArticle(row articleScanner) (*domain.Article, error) {
	article := &domain.Article{}
	var tagsJSON []byte
	if err := row.Scan(&article.ID, &article.Title, &article.Slug, &article.Excerpt, &article.ContentMarkdown, &article.CoverImageURL, &article.Status, &article.PublishedAt, &article.CreatedAt, &article.UpdatedAt, &tagsJSON); err != nil {
		return nil, mapError(err)
	}
	if err := json.Unmarshal(tagsJSON, &article.Tags); err != nil {
		return nil, fmt.Errorf("decode tags: %w", err)
	}
	return article, nil
}

func mapError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return fmt.Errorf("%w: duplicate value", domain.ErrConflict)
	}
	return err
}

var _ application.ArticleRepository = (*Repository)(nil)
var _ application.TransactionManager = (*TransactionManager)(nil)
