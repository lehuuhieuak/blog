package application

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"time"
	"unicode"

	"github.com/hieulh/blog/backend/internal/domain"
)

const (
	DefaultPageSize = 10
	MaximumPageSize = 50
)

type Clock func() time.Time
type IDGenerator func() string

type ArticleService struct {
	repository   ArticleRepository
	transactions TransactionManager
	renderer     MarkdownRenderer
	clock        Clock
	newID        IDGenerator
}

func NewArticleService(repository ArticleRepository, transactions TransactionManager, renderer MarkdownRenderer, clock Clock, newID IDGenerator) *ArticleService {
	return &ArticleService{repository: repository, transactions: transactions, renderer: renderer, clock: clock, newID: newID}
}

type ArticleInput struct {
	Title           string               `json:"title"`
	Slug            string               `json:"slug"`
	Excerpt         string               `json:"excerpt"`
	ContentMarkdown string               `json:"content_markdown"`
	CoverImageURL   *string              `json:"cover_image_url"`
	Tags            []string             `json:"tags"`
	Status          domain.ArticleStatus `json:"status"`
}

type ListOptions struct {
	Page     int
	PageSize int
	Tag      string
	Status   domain.ArticleStatus
}

type ArticlePage struct {
	Data       []*domain.Article `json:"data"`
	Page       int               `json:"page"`
	PageSize   int               `json:"page_size"`
	Total      int               `json:"total"`
	TotalPages int               `json:"total_pages"`
}

func (s *ArticleService) Create(ctx context.Context, input ArticleInput) (*domain.Article, error) {
	tags, err := NormalizeTags(input.Tags)
	if err != nil {
		return nil, err
	}
	slug, err := s.resolveSlug(ctx, input.Slug, input.Title, false)
	if err != nil {
		return nil, err
	}
	article, err := domain.NewArticle(s.newID(), domain.ArticleValues{Title: input.Title, Slug: slug, Excerpt: input.Excerpt, ContentMarkdown: input.ContentMarkdown, CoverImageURL: input.CoverImageURL, Status: input.Status, Tags: tags}, s.clock())
	if err != nil {
		return nil, err
	}
	err = s.transactions.WithinTransaction(ctx, func(txCtx context.Context) error { return s.repository.Create(txCtx, article) })
	if err != nil {
		return nil, err
	}
	return article, nil
}

func (s *ArticleService) Update(ctx context.Context, id string, input ArticleInput) (*domain.Article, error) {
	article, err := s.repository.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	tags, err := NormalizeTags(input.Tags)
	if err != nil {
		return nil, err
	}
	slug := strings.TrimSpace(input.Slug)
	if slug == "" {
		if article.PublishedAt != nil {
			slug = article.Slug
		} else {
			slug, err = s.resolveSlug(ctx, "", input.Title, false)
			if err != nil {
				return nil, err
			}
		}
	} else if slug != article.Slug {
		if article.PublishedAt != nil {
			return nil, domain.ErrSlugLocked
		}
		slug, err = s.resolveSlug(ctx, slug, input.Title, true)
		if err != nil {
			return nil, err
		}
	}
	err = article.Update(domain.ArticleValues{Title: input.Title, Slug: slug, Excerpt: input.Excerpt, ContentMarkdown: input.ContentMarkdown, CoverImageURL: input.CoverImageURL, Status: input.Status, Tags: tags}, s.clock())
	if err != nil {
		return nil, err
	}
	err = s.transactions.WithinTransaction(ctx, func(txCtx context.Context) error { return s.repository.Update(txCtx, article) })
	if err != nil {
		return nil, err
	}
	return article, nil
}

func (s *ArticleService) Delete(ctx context.Context, id string) error {
	return s.transactions.WithinTransaction(ctx, func(txCtx context.Context) error { return s.repository.Delete(txCtx, id) })
}

func (s *ArticleService) GetAdmin(ctx context.Context, id string) (*domain.Article, error) {
	return s.repository.GetByID(ctx, id)
}
func (s *ArticleService) GetPublic(ctx context.Context, slug string) (*domain.Article, error) {
	return s.repository.GetPublicBySlug(ctx, slug)
}
func (s *ArticleService) Tags(ctx context.Context) ([]domain.Tag, error) {
	return s.repository.ListTags(ctx)
}
func (s *ArticleService) Preview(markdown string) (RenderedMarkdown, error) {
	return s.renderer.Render(markdown)
}

func (s *ArticleService) ListPublic(ctx context.Context, options ListOptions) (ArticlePage, error) {
	options, err := NormalizeListOptions(options)
	if err != nil {
		return ArticlePage{}, err
	}
	return s.repository.ListPublic(ctx, options)
}

func (s *ArticleService) ListAdmin(ctx context.Context, options ListOptions) (ArticlePage, error) {
	options, err := NormalizeListOptions(options)
	if err != nil {
		return ArticlePage{}, err
	}
	if options.Status != "" && options.Status != domain.StatusDraft && options.Status != domain.StatusPublished {
		return ArticlePage{}, domain.NewValidationError(map[string]string{"status": "status must be draft or published"})
	}
	return s.repository.ListAdmin(ctx, options)
}

func NormalizeListOptions(options ListOptions) (ListOptions, error) {
	if options.Page == 0 {
		options.Page = 1
	}
	if options.PageSize == 0 {
		options.PageSize = DefaultPageSize
	}
	if options.Page < 1 {
		return ListOptions{}, domain.NewValidationError(map[string]string{"page": "page must be at least 1"})
	}
	if options.PageSize < 1 || options.PageSize > MaximumPageSize {
		return ListOptions{}, domain.NewValidationError(map[string]string{"page_size": "page_size must be between 1 and 50"})
	}
	options.Tag = strings.TrimSpace(options.Tag)
	return options, nil
}

func NormalizeTags(input []string) ([]domain.Tag, error) {
	seen := map[string]struct{}{}
	tags := make([]domain.Tag, 0, len(input))
	for _, value := range input {
		name := strings.TrimSpace(value)
		if name == "" {
			continue
		}
		slug := Slugify(name)
		if slug == "" {
			return nil, domain.NewValidationError(map[string]string{"tags": "tag is invalid"})
		}
		if _, ok := seen[slug]; ok {
			continue
		}
		seen[slug] = struct{}{}
		tag, err := domain.NewTag(name, slug)
		if err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}
	sort.Slice(tags, func(i, j int) bool { return tags[i].Slug < tags[j].Slug })
	return tags, nil
}

func (s *ArticleService) resolveSlug(ctx context.Context, requested, title string, manual bool) (string, error) {
	requested = strings.TrimSpace(requested)
	if manual {
		if requested == "" {
			return "", domain.NewValidationError(map[string]string{"slug": "slug is required"})
		}
		exists, err := s.repository.SlugExists(ctx, requested)
		if err != nil {
			return "", err
		}
		if exists {
			return "", fmt.Errorf("%w: slug already exists", domain.ErrConflict)
		}
		return requested, nil
	}
	if requested != "" {
		return s.resolveSlug(ctx, requested, title, true)
	}
	base := Slugify(title)
	if base == "" {
		return "", domain.NewValidationError(map[string]string{"slug": "could not generate a slug from title"})
	}
	for suffix := 1; ; suffix++ {
		candidate := base
		if suffix > 1 {
			candidate = fmt.Sprintf("%s-%d", base, suffix)
		}
		exists, err := s.repository.SlugExists(ctx, candidate)
		if err != nil {
			return "", err
		}
		if !exists {
			return candidate, nil
		}
	}
}

var vietnameseReplacer = strings.NewReplacer(
	"đ", "d", "Đ", "D", "ă", "a", "â", "a", "ê", "e", "ô", "o", "ơ", "o", "ư", "u",
	"á", "a", "à", "a", "ả", "a", "ã", "a", "ạ", "a", "ắ", "a", "ằ", "a", "ẳ", "a", "ẵ", "a", "ặ", "a", "ấ", "a", "ầ", "a", "ẩ", "a", "ẫ", "a", "ậ", "a",
	"é", "e", "è", "e", "ẻ", "e", "ẽ", "e", "ẹ", "e", "ế", "e", "ề", "e", "ể", "e", "ễ", "e", "ệ", "e",
	"í", "i", "ì", "i", "ỉ", "i", "ĩ", "i", "ị", "i",
	"ó", "o", "ò", "o", "ỏ", "o", "õ", "o", "ọ", "o", "ố", "o", "ồ", "o", "ổ", "o", "ỗ", "o", "ộ", "o", "ớ", "o", "ờ", "o", "ở", "o", "ỡ", "o", "ợ", "o",
	"ú", "u", "ù", "u", "ủ", "u", "ũ", "u", "ụ", "u", "ứ", "u", "ừ", "u", "ử", "u", "ữ", "u", "ự", "u",
	"ý", "y", "ỳ", "y", "ỷ", "y", "ỹ", "y", "ỵ", "y",
)
var nonSlugCharacter = regexp.MustCompile(`[^a-z0-9]+`)

func Slugify(value string) string {
	value = strings.ToLower(vietnameseReplacer.Replace(strings.TrimSpace(value)))
	value = strings.Map(func(r rune) rune {
		if r <= unicode.MaxASCII {
			return r
		}
		return -1
	}, value)
	return strings.Trim(nonSlugCharacter.ReplaceAllString(value, "-"), "-")
}

func IsNotFound(err error) bool { return errors.Is(err, domain.ErrNotFound) }
