// Confere o arquivo de cabeçalhos que o Cloudflare Pages aplica a todas as páginas.
// O teste ponta a ponta e2e/cabecalhos.spec.ts confere os mesmos cabeçalhos no deploy de prévia.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const texto = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
const cabecalhos = Object.fromEntries(
  texto
    .split('\n')
    .filter((l) => /^\s+[^\s!]/.test(l))
    .map((l) => {
      const i = l.indexOf(':');
      return [l.slice(0, i).trim().toLowerCase(), l.slice(i + 1).trim()];
    }),
);
const csp = Object.fromEntries(
  (cabecalhos['content-security-policy'] ?? '')
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const [nome, ...valores] = d.split(/\s+/);
      return [nome, valores];
    }),
);

describe('[SEC-01] política de segurança de conteúdo', () => {
  it('vale para todas as rotas', () => {
    expect(texto.split('\n')[0]).toBe('/*');
  });

  it('só permite recursos do próprio app', () => {
    for (const d of ['default-src', 'script-src', 'style-src', 'font-src', 'connect-src', 'worker-src']) {
      expect(csp[d]?.[0], d).toBe("'self'");
    }
  });

  it("libera WebAssembly sem liberar eval: só 'wasm-unsafe-eval' no script-src", () => {
    expect(csp['script-src']).toEqual(["'self'", "'wasm-unsafe-eval'"]);
  });

  it('não tem unsafe-inline nem unsafe-eval em lugar nenhum', () => {
    expect(cabecalhos['content-security-policy']).not.toMatch(/'unsafe-(inline|eval)'/);
  });

  it('bloqueia plugins, troca de base e moldura por outros sites', () => {
    expect(csp['object-src']).toEqual(["'none'"]);
    expect(csp['base-uri']).toEqual(["'none'"]);
    expect(csp['frame-ancestors']).toEqual(["'none'"]);
  });

  it('não cita nenhum domínio de terceiros', () => {
    expect(cabecalhos['content-security-policy']).not.toMatch(/https?:/);
  });
});

describe('[SEC-02] cabeçalhos de transporte e permissões', () => {
  it('remove os cabeçalhos padrão que não servem ao app: CORS aberto e relatório de erros de rede', () => {
    for (const h of ['Access-Control-Allow-Origin', 'Report-To', 'NEL']) {
      expect(texto).toContain(`  ! ${h}`);
    }
  });

  it('força HTTPS por um ano', () => {
    expect(cabecalhos['strict-transport-security']).toMatch(/max-age=31536000/);
  });

  it('não deixa o navegador adivinhar tipos nem vazar o endereço', () => {
    expect(cabecalhos['x-content-type-options']).toBe('nosniff');
    expect(cabecalhos['referrer-policy']).toBe('no-referrer');
  });

  it('nega câmera, microfone e localização', () => {
    for (const p of ['camera=()', 'microphone=()', 'geolocation=()']) {
      expect(cabecalhos['permissions-policy']).toContain(p);
    }
  });
});
