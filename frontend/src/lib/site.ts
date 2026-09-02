const configuredURL = process.env.SITE_URL ?? "http://localhost:4321"

export const site = {
  name: process.env.SITE_NAME ?? "Góc nhỏ của Minh",
  author: process.env.SITE_AUTHOR ?? "Minh",
  description: process.env.SITE_DESCRIPTION ?? "Những ghi chép ngắn về công nghệ và cuộc sống.",
  url: new URL(configuredURL),
  socialURL: process.env.SITE_SOCIAL_URL ?? "",
}

export function canonicalURL(pathname: string): string {
  return new URL(pathname, site.url).toString()
}
