const configuredURL = import.meta.env.SITE_URL ?? 'http://localhost:4321';

export const site = {
  name: import.meta.env.SITE_NAME ?? 'Góc nhỏ của Minh',
  author: import.meta.env.SITE_AUTHOR ?? 'Minh',
  description: import.meta.env.SITE_DESCRIPTION ?? 'Những ghi chép ngắn về công nghệ và cuộc sống.',
  url: new URL(configuredURL),
  socialURL: import.meta.env.SITE_SOCIAL_URL ?? '',
};

export function canonicalURL(pathname: string): string {
  return new URL(pathname, site.url).toString();
}
