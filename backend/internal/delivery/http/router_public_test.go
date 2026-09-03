package deliveryhttp

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/hieulh/blog/backend/internal/application"
	"github.com/hieulh/blog/backend/internal/domain"
)

type publicArticleCases struct {
	fakeArticles
	article *domain.Article
}

func (f publicArticleCases) GetPublic(context.Context, string) (*domain.Article, error) {
	return f.article, nil
}

func (f publicArticleCases) Preview(string) (application.RenderedMarkdown, error) {
	return application.RenderedMarkdown{HTML: "<p>safe</p>", ReadingMinutes: 1}, nil
}

func TestPublicArticleUsesDataEnvelope(t *testing.T) {
	article := &domain.Article{ID: "article-1", Title: "Published", Slug: "published", Excerpt: "Summary", ContentMarkdown: "Content", Status: domain.StatusPublished, CreatedAt: time.Now(), UpdatedAt: time.Now()}
	router := NewRouter(publicArticleCases{article: article}, func(context.Context) error { return nil }, "", slog.New(slog.NewTextHandler(io.Discard, nil)))
	request := httptest.NewRequest(http.MethodGet, "/api/v1/articles/published", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
	var body struct {
		Data map[string]json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if string(body.Data["id"]) != `"article-1"` {
		t.Fatalf("id = %s", body.Data["id"])
	}
	if _, exists := body.Data["cover_image_url"]; exists {
		t.Fatal("response unexpectedly includes cover_image_url")
	}
}
