import type { APIRoute } from 'astro';
import { canonicalURL } from '../lib/site';

export const GET: APIRoute = () => new Response(`User-agent: *\nAllow: /\nDisallow: /quan-tri/\nSitemap: ${canonicalURL('/sitemap.xml')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
