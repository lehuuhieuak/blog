package application

import (
	"context"

	"github.com/hieulh/blog/backend/internal/domain"
)

type ArticleRepository interface {
	Create(context.Context, *domain.Article) error
	Update(context.Context, *domain.Article) error
	Delete(context.Context, string) error
	GetByID(context.Context, string) (*domain.Article, error)
	GetPublicBySlug(context.Context, string) (*domain.Article, error)
	ListPublic(context.Context, ListOptions) (ArticlePage, error)
	ListAdmin(context.Context, ListOptions) (ArticlePage, error)
	ListTags(context.Context) ([]domain.Tag, error)
	SlugExists(context.Context, string) (bool, error)
}

type TransactionManager interface {
	WithinTransaction(context.Context, func(context.Context) error) error
}

type MarkdownRenderer interface {
	Render(markdown string) (RenderedMarkdown, error)
}

type RenderedMarkdown struct {
	HTML            string    `json:"html"`
	TableOfContents []TOCItem `json:"table_of_contents"`
	ReadingMinutes  int       `json:"reading_minutes"`
}

type TOCItem struct {
	Level int    `json:"level"`
	ID    string `json:"id"`
	Text  string `json:"text"`
}
