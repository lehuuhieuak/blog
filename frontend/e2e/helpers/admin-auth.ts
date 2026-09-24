import { expect, type Page } from '@playwright/test';

const defaultWebURL = 'http://localhost:4321';
const defaultAPIBaseURL = 'http://localhost:8080/api/v1';

export function adminAPIUrl(path: string): string {
  const apiBase = (process.env.E2E_API_BASE_URL ?? defaultAPIBaseURL).replace(/\/+$/, '');
  return `${apiBase}/${path.replace(/^\/+/, '')}`;
}

export function webOrigin(): string {
  return new URL(process.env.BASE_URL ?? defaultWebURL).origin;
}

export function adminOriginHeaders(origin = webOrigin()): Record<string, string> {
  return { Origin: origin };
}

export async function authenticateAdmin(page: Page): Promise<void> {
  const response = await page.request.post(adminAPIUrl('admin/auth/login'), {
    headers: adminOriginHeaders(),
    data: { username: 'admin', password: 'Hieu1234@@' },
  });

  expect(response.status()).toBe(204);
}
