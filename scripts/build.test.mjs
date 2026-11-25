import { describe, expect, it } from 'vitest';
import { tamanhoComprimido, urlsExternas } from './lib/build.mjs';

describe('[SEC-03] verificação de endereços externos no build', () => {
  it('acha fonte, script e análise de terceiros', () => {
    const texto = [
      '@import url("https://fonts.googleapis.com/css2?family=Inter");',
      '<script src="https://cdn.exemplo.com/x.js"></script>',
      "fetch('http://analytics.exemplo.net/coleta')",
    ].join('\n');
    expect(urlsExternas(texto)).toEqual([
      'https://fonts.googleapis.com/css2?family=Inter',
      'https://cdn.exemplo.com/x.js',
      'http://analytics.exemplo.net/coleta',
    ]);
  });

  it('ignora textos que nunca são carregados', () => {
    const texto = 'xmlns="http://www.w3.org/2000/svg" e https://react.dev/errors/418';
    expect(urlsExternas(texto)).toEqual([]);
  });

  it('ignora os identificadores do Zod, mas não outros endereços parecidos', () => {
    const texto =
      '"https://json-schema.org/draft/2020-12/schema" http://json-schema.org/draft-07/schema# `http://[${e}]`';
    expect(urlsExternas(texto)).toEqual([]);
    expect(urlsExternas('https://json-schema.org/draft-07/schema/../x http://[::1]/coleta')).toHaveLength(2);
  });

  it('não repete o mesmo endereço', () => {
    expect(urlsExternas('https://a.exemplo.com https://a.exemplo.com')).toHaveLength(1);
  });

  it('mede o tamanho comprimido', () => {
    const repetido = 'a'.repeat(10000);
    expect(tamanhoComprimido(repetido)).toBeLessThan(200);
  });
});
