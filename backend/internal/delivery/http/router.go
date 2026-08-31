package deliveryhttp

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/hieulh/blog/backend/internal/application"
	"github.com/hieulh/blog/backend/internal/domain"
)

type ArticleUseCases interface {
	Create(context.Context, application.ArticleInput) (*domain.Article, error)
	Update(context.Context, string, application.ArticleInput) (*domain.Article, error)
	Delete(context.Context, string) error
	GetAdmin(context.Context, string) (*domain.Article, error)
	GetPublic(context.Context, string) (*domain.Article, error)
	ListPublic(context.Context, application.ListOptions) (application.ArticlePage, error)
	ListAdmin(context.Context, application.ListOptions) (application.ArticlePage, error)
	Tags(context.Context) ([]domain.Tag, error)
	Preview(string) (application.RenderedMarkdown, error)
}

type Handler struct {
	articles ArticleUseCases
	ready    func(context.Context) error
	logger   *slog.Logger
}

func NewRouter(articles ArticleUseCases, ready func(context.Context) error, corsOrigin string, logger *slog.Logger) *gin.Engine {
	handler := &Handler{articles: articles, ready: ready, logger: logger}
	router := gin.New()
	router.Use(requestID(), requestLogger(logger), gin.Recovery(), cors(corsOrigin))
	router.GET("/healthz", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	router.GET("/readyz", handler.readyz)
	api := router.Group("/api/v1")
	api.GET("/articles", handler.listPublic)
	api.GET("/articles/:slug", handler.getPublic)
	api.GET("/tags", handler.tags)
	admin := api.Group("/admin")
	admin.GET("/articles", handler.listAdmin)
	admin.POST("/articles", handler.create)
	admin.GET("/articles/:id", handler.getAdmin)
	admin.PUT("/articles/:id", handler.update)
	admin.DELETE("/articles/:id", handler.delete)
	admin.POST("/markdown/preview", handler.preview)
	return router
}

func (h *Handler) readyz(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()
	if err := h.ready(ctx); err != nil {
		c.JSON(http.StatusServiceUnavailable, errorEnvelope("not_ready", "Service is not ready", nil))
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ready"})
}

func (h *Handler) listPublic(c *gin.Context) {
	options, err := listOptions(c, false)
	if err != nil {
		writeError(c, err)
		return
	}
	page, err := h.articles.ListPublic(c.Request.Context(), options)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, pageEnvelope(page, false))
}
func (h *Handler) getPublic(c *gin.Context) {
	article, err := h.articles.GetPublic(c.Request.Context(), c.Param("slug"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, publicArticle(article, h.articles))
}
func (h *Handler) tags(c *gin.Context) {
	tags, err := h.articles.Tags(c.Request.Context())
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": tags})
}
func (h *Handler) listAdmin(c *gin.Context) {
	options, err := listOptions(c, true)
	if err != nil {
		writeError(c, err)
		return
	}
	page, err := h.articles.ListAdmin(c.Request.Context(), options)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, pageEnvelope(page, true))
}
func (h *Handler) create(c *gin.Context) {
	input, ok := bindInput(c)
	if !ok {
		return
	}
	article, err := h.articles.Create(c.Request.Context(), input)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": adminArticle(article)})
}
func (h *Handler) getAdmin(c *gin.Context) {
	article, err := h.articles.GetAdmin(c.Request.Context(), c.Param("id"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": adminArticle(article)})
}
func (h *Handler) update(c *gin.Context) {
	input, ok := bindInput(c)
	if !ok {
		return
	}
	article, err := h.articles.Update(c.Request.Context(), c.Param("id"), input)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": adminArticle(article)})
}
func (h *Handler) delete(c *gin.Context) {
	if err := h.articles.Delete(c.Request.Context(), c.Param("id")); err != nil {
		writeError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
func (h *Handler) preview(c *gin.Context) {
	var request struct {
		ContentMarkdown string `json:"content_markdown"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		writeError(c, domain.NewValidationError(map[string]string{"body": "invalid JSON body"}))
		return
	}
	result, err := h.articles.Preview(request.ContentMarkdown)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

func bindInput(c *gin.Context) (application.ArticleInput, bool) {
	var input application.ArticleInput
	if err := c.ShouldBindJSON(&input); err != nil {
		writeError(c, domain.NewValidationError(map[string]string{"body": "invalid JSON body"}))
		return application.ArticleInput{}, false
	}
	return input, true
}
func listOptions(c *gin.Context, admin bool) (application.ListOptions, error) {
	parse := func(name string) (int, error) {
		value := c.Query(name)
		if value == "" {
			return 0, nil
		}
		number, err := strconv.Atoi(value)
		if err != nil {
			return 0, domain.NewValidationError(map[string]string{name: name + " must be a number"})
		}
		return number, nil
	}
	page, err := parse("page")
	if err != nil {
		return application.ListOptions{}, err
	}
	pageSize, err := parse("page_size")
	if err != nil {
		return application.ListOptions{}, err
	}
	options := application.ListOptions{Page: page, PageSize: pageSize}
	if admin {
		options.Status = domain.ArticleStatus(c.Query("status"))
	} else {
		options.Tag = c.Query("tag")
	}
	return options, nil
}

type articleResponse struct {
	ID              string                `json:"id"`
	Title           string                `json:"title"`
	Slug            string                `json:"slug"`
	Excerpt         string                `json:"excerpt"`
	ContentMarkdown string                `json:"content_markdown,omitempty"`
	ContentHTML     string                `json:"content_html,omitempty"`
	CoverImageURL   *string               `json:"cover_image_url"`
	Status          domain.ArticleStatus  `json:"status,omitempty"`
	PublishedAt     *time.Time            `json:"published_at"`
	CreatedAt       time.Time             `json:"created_at"`
	UpdatedAt       time.Time             `json:"updated_at"`
	Tags            []domain.Tag          `json:"tags"`
	TableOfContents []application.TOCItem `json:"table_of_contents,omitempty"`
	ReadingMinutes  int                   `json:"reading_minutes,omitempty"`
}

func baseArticle(article *domain.Article) articleResponse {
	return articleResponse{ID: article.ID, Title: article.Title, Slug: article.Slug, Excerpt: article.Excerpt, Status: article.Status, CoverImageURL: article.CoverImageURL, PublishedAt: utc(article.PublishedAt), CreatedAt: article.CreatedAt.UTC(), UpdatedAt: article.UpdatedAt.UTC(), Tags: article.Tags}
}
func adminArticle(article *domain.Article) articleResponse {
	response := baseArticle(article)
	response.Status = article.Status
	response.ContentMarkdown = article.ContentMarkdown
	return response
}
func publicArticle(article *domain.Article, service ArticleUseCases) articleResponse {
	response := baseArticle(article)
	rendered, err := service.Preview(article.ContentMarkdown)
	if err == nil {
		response.ContentHTML = rendered.HTML
		response.TableOfContents = rendered.TableOfContents
		response.ReadingMinutes = rendered.ReadingMinutes
	}
	return response
}
func utc(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	copy := value.UTC()
	return &copy
}
func pageEnvelope(page application.ArticlePage, admin bool) gin.H {
	data := make([]articleResponse, 0, len(page.Data))
	for _, article := range page.Data {
		if admin {
			data = append(data, adminArticle(article))
		} else {
			data = append(data, baseArticle(article))
		}
	}
	return gin.H{"data": data, "meta": gin.H{"page": page.Page, "page_size": page.PageSize, "total": page.Total, "total_pages": page.TotalPages}}
}

func writeError(c *gin.Context, err error) {
	var validation *domain.ValidationError
	switch {
	case errors.As(err, &validation):
		c.JSON(http.StatusUnprocessableEntity, errorEnvelope("validation_error", "Dữ liệu không hợp lệ", validation.Fields))
	case errors.Is(err, domain.ErrNotFound):
		c.JSON(http.StatusNotFound, errorEnvelope("not_found", "Không tìm thấy dữ liệu", nil))
	case errors.Is(err, domain.ErrConflict), errors.Is(err, domain.ErrSlugLocked):
		c.JSON(http.StatusConflict, errorEnvelope("conflict", "Dữ liệu bị trùng hoặc không thể thay đổi", nil))
	default:
		c.JSON(http.StatusInternalServerError, errorEnvelope("internal_error", "Đã xảy ra lỗi máy chủ", nil))
	}
}
func errorEnvelope(code, message string, fields map[string]string) gin.H {
	if fields == nil {
		fields = map[string]string{}
	}
	body := gin.H{"code": code, "message": message, "fields": fields}
	return gin.H{"error": body}
}

func requestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := strings.TrimSpace(c.GetHeader("X-Request-ID"))
		if id == "" {
			id = uuid.NewString()
		}
		c.Header("X-Request-ID", id)
		c.Set("request_id", id)
		c.Next()
	}
}
func requestLogger(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		started := time.Now()
		c.Next()
		logger.Info("http request", "request_id", c.GetString("request_id"), "method", c.Request.Method, "path", c.Request.URL.Path, "status", c.Writer.Status(), "duration_ms", time.Since(started).Milliseconds())
	}
}
func cors(origin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		requestOrigin := c.GetHeader("Origin")
		if origin != "" && requestOrigin == origin {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Content-Type,X-Request-ID")
		}
		if c.Request.Method == http.MethodOptions {
			c.Status(http.StatusNoContent)
			c.Abort()
			return
		}
		c.Next()
	}
}

var _ ArticleUseCases = (*application.ArticleService)(nil)
