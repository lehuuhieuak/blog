package markdown

import (
	"strings"
	"testing"
)

func TestRenderSanitizesAndProducesTOC(t *testing.T) {
	rendered, err := NewRenderer().Render("# Title\n\n## Giới thiệu\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n```go\nfmt.Println(\"ok\")\n```\n\n### Chi tiết\n\nNội dung")
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(strings.ToLower(rendered.HTML), "script") || strings.Contains(strings.ToLower(rendered.HTML), "javascript:") {
		t.Fatalf("unsafe HTML: %s", rendered.HTML)
	}
	if len(rendered.TableOfContents) != 2 || rendered.TableOfContents[0].ID != "gioi-thieu" || rendered.TableOfContents[1].Level != 3 {
		t.Fatalf("toc = %#v", rendered.TableOfContents)
	}
	if !strings.Contains(rendered.HTML, "chroma-") {
		t.Fatalf("code was not highlighted: %s", rendered.HTML)
	}
	if rendered.ReadingMinutes != 1 {
		t.Fatalf("reading minutes = %d", rendered.ReadingMinutes)
	}
}

func TestRendererMakesUniqueHeadingAnchors(t *testing.T) {
	rendered, err := NewRenderer().Render("## Same\n\n## Same")
	if err != nil {
		t.Fatal(err)
	}
	if rendered.TableOfContents[1].ID != "same-2" {
		t.Fatalf("toc = %#v", rendered.TableOfContents)
	}
}
