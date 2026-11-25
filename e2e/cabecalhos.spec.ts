import { expect, test } from '@playwright/test';

// SEC-01 e SEC-02 no deploy de verdade: só roda quando PREVIEW_URL aponta para um deploy de prévia
// do Cloudflare Pages, porque o servidor local não aplica o arquivo _headers.
const previa = process.env['PREVIEW_URL'];

test.describe('cabeçalhos no deploy de prévia', () => {
  test.skip(!previa, 'Defina PREVIEW_URL com o endereço do deploy de prévia.');

  test('[SEC-01, SEC-02] o deploy devolve a CSP e os cabeçalhos de segurança', async ({ request }) => {
    const resposta = await request.get(previa ?? '/');
    const h = resposta.headers();
    expect(h['content-security-policy']).toContain("default-src 'self'");
    expect(h['content-security-policy']).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(h['content-security-policy']).not.toMatch(/'unsafe-(inline|eval)'/);
    expect(h['strict-transport-security']).toContain('max-age=31536000');
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['referrer-policy']).toBe('no-referrer');
  });
});
