export type ArticleStatus = 'draft' | 'published';

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export interface TOCItem {
  level: 2 | 3;
  id: string;
  text: string;
}

export interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  status: ArticleStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

export interface PublicArticle extends ArticleSummary {
  content_html: string;
  table_of_contents: TOCItem[];
  reading_minutes: number;
}

export interface AdminArticle extends ArticleSummary {
  content_markdown: string;
}

export interface ArticleInput {
  title: string;
  slug: string;
  excerpt: string;
  content_markdown: string;
  tags: string[];
  status: ArticleStatus;
}

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ListResponse<T> {
  data: T[];
  meta: Pagination;
}

export interface MarkdownPreview {
  html: string;
  table_of_contents: TOCItem[];
  reading_minutes: number;
}
