export const routes = {
  home: "/",
  about: "/about",
  admin: "/admin",
  adminLogin: "/admin/login",
  adminArticles: "/admin/articles",
  adminNewArticle: "/admin/articles/new",
  article: (slug: string) => `/articles/${encodeURIComponent(slug)}`,
  tag: (slug: string) => `/tags/${encodeURIComponent(slug)}`,
  adminArticle: (id: string) => `/admin/articles/${encodeURIComponent(id)}`,
} as const
