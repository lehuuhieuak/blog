import type { APIRoute } from 'astro';
import { listArticles } from '../lib/api';
import { canonicalURL, site } from '../lib/site';

const escapeXML = (value: string) => value.replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character] ?? character);

export const GET: APIRoute = async () => {
  const { data } = await listArticles(1);
  const items = data.map((article) => `<item><title>${escapeXML(article.title)}</title><link>${canonicalURL(`/bai-viet/${article.slug}`)}</link><guid>${canonicalURL(`/bai-viet/${article.slug}`)}</guid><description>${escapeXML(article.excerpt)}</description>${article.published_at ? `<pubDate>${new Date(article.published_at).toUTCString()}</pubDate>` : ''}</item>`).join('');
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXML(site.name)}</title><link>${site.url}</link><description>${escapeXML(site.description)}</description>${items}</channel></rss>`;
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
