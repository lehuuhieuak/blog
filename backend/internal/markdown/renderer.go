package markdown

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/alecthomas/chroma/v2/formatters/html"
	"github.com/alecthomas/chroma/v2/lexers"
	"github.com/alecthomas/chroma/v2/styles"
	"github.com/hieulh/blog/backend/internal/application"
	"github.com/microcosm-cc/bluemonday"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	goldmarkHTML "github.com/yuin/goldmark/renderer/html"
	xhtml "golang.org/x/net/html"
	"golang.org/x/net/html/atom"
)

const wordsPerMinute = 200

type Renderer struct {
	engine goldmark.Markdown
	policy *bluemonday.Policy
}

func NewRenderer() *Renderer {
	policy := bluemonday.UGCPolicy()
	policy.AllowAttrs("id").OnElements("h2", "h3")
	policy.AllowAttrs("class").OnElements("code", "pre", "span", "div")
	return &Renderer{
		engine: goldmark.New(
			goldmark.WithExtensions(extension.GFM),
			goldmark.WithRendererOptions(goldmarkHTML.WithHardWraps()),
		),
		policy: policy,
	}
}

func (r *Renderer) Render(markdown string) (application.RenderedMarkdown, error) {
	var rendered bytes.Buffer
	if err := r.engine.Convert([]byte(markdown), &rendered); err != nil {
		return application.RenderedMarkdown{}, fmt.Errorf("render markdown: %w", err)
	}
	document, err := xhtml.Parse(strings.NewReader(rendered.String()))
	if err != nil {
		return application.RenderedMarkdown{}, fmt.Errorf("parse rendered html: %w", err)
	}
	toc := addHeadingIDs(document)
	highlightCodeBlocks(document)
	var normalized bytes.Buffer
	if err := xhtml.Render(&normalized, document); err != nil {
		return application.RenderedMarkdown{}, fmt.Errorf("serialize rendered html: %w", err)
	}
	return application.RenderedMarkdown{
		HTML:            r.policy.Sanitize(extractBody(normalized.String())),
		TableOfContents: toc,
		ReadingMinutes:  readingMinutes(markdown),
	}, nil
}

func addHeadingIDs(document *xhtml.Node) []application.TOCItem {
	used := map[string]int{}
	toc := []application.TOCItem{}
	var walk func(*xhtml.Node)
	walk = func(node *xhtml.Node) {
		if node.Type == xhtml.ElementNode && (node.Data == "h2" || node.Data == "h3") {
			text := strings.TrimSpace(textContent(node))
			id := application.Slugify(text)
			if id == "" {
				id = "section"
			}
			used[id]++
			if used[id] > 1 {
				id = fmt.Sprintf("%s-%d", id, used[id])
			}
			setAttribute(node, "id", id)
			level := 2
			if node.Data == "h3" {
				level = 3
			}
			toc = append(toc, application.TOCItem{Level: level, ID: id, Text: text})
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(document)
	return toc
}

func highlightCodeBlocks(document *xhtml.Node) {
	var blocks []*xhtml.Node
	var walk func(*xhtml.Node)
	walk = func(node *xhtml.Node) {
		if node.Type == xhtml.ElementNode && node.Data == "pre" {
			blocks = append(blocks, node)
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(document)
	for _, pre := range blocks {
		code := firstElementChild(pre)
		if code == nil || code.Data != "code" {
			continue
		}
		language := languageFromClass(attribute(code, "class"))
		if language == "" {
			continue
		}
		lexer := lexers.Get(language)
		if lexer == nil {
			lexer = lexers.Fallback
		}
		iterator, err := lexer.Tokenise(nil, textContent(code))
		if err != nil {
			continue
		}
		var output bytes.Buffer
		formatter := html.New(html.WithClasses(true), html.ClassPrefix("chroma-"))
		if err := formatter.Format(&output, styles.Get("github"), iterator); err != nil {
			continue
		}
		parent := pre.Parent
		if parent == nil {
			continue
		}
		fragment, err := xhtml.ParseFragment(strings.NewReader(output.String()), &xhtml.Node{Type: xhtml.ElementNode, Data: "div", DataAtom: atom.Div})
		if err != nil {
			continue
		}
		for _, node := range fragment {
			parent.InsertBefore(node, pre)
		}
		parent.RemoveChild(pre)
	}
}

func extractBody(value string) string {
	document, err := xhtml.Parse(strings.NewReader(value))
	if err != nil {
		return value
	}
	var find func(*xhtml.Node) *xhtml.Node
	find = func(node *xhtml.Node) *xhtml.Node {
		if node.Type == xhtml.ElementNode && node.Data == "body" {
			return node
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			if found := find(child); found != nil {
				return found
			}
		}
		return nil
	}
	body := find(document)
	if body == nil {
		return value
	}
	var output strings.Builder
	for child := body.FirstChild; child != nil; child = child.NextSibling {
		_ = xhtml.Render(&output, child)
	}
	return output.String()
}

func readingMinutes(markdown string) int {
	words := len(strings.Fields(markdown))
	minutes := (words + wordsPerMinute - 1) / wordsPerMinute
	if minutes < 1 {
		return 1
	}
	return minutes
}

func textContent(node *xhtml.Node) string {
	var output strings.Builder
	var walk func(*xhtml.Node)
	walk = func(current *xhtml.Node) {
		if current.Type == xhtml.TextNode {
			output.WriteString(current.Data)
		}
		for child := current.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(node)
	return output.String()
}

func firstElementChild(node *xhtml.Node) *xhtml.Node {
	for child := node.FirstChild; child != nil; child = child.NextSibling {
		if child.Type == xhtml.ElementNode {
			return child
		}
	}
	return nil
}
func attribute(node *xhtml.Node, name string) string {
	for _, attr := range node.Attr {
		if attr.Key == name {
			return attr.Val
		}
	}
	return ""
}
func setAttribute(node *xhtml.Node, name, value string) {
	for i := range node.Attr {
		if node.Attr[i].Key == name {
			node.Attr[i].Val = value
			return
		}
	}
	node.Attr = append(node.Attr, xhtml.Attribute{Key: name, Val: value})
}
func languageFromClass(class string) string {
	for _, candidate := range strings.Fields(class) {
		if strings.HasPrefix(candidate, "language-") {
			return strings.TrimPrefix(candidate, "language-")
		}
	}
	return ""
}
