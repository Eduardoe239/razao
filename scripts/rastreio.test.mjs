import { describe, expect, it } from 'vitest';
import { idsMarcados, lerCatalogo, montarRastreio, relatorioMarkdown } from './lib/rastreio.mjs';

const md = [
  '| ID | Requisito | Aceite | Prior. | Fase |',
  '| --- | --- | --- | --- | --- |',
  '| COF-001 | Criar o cofre | Ilegível sem senha | Deve | Alpha 1 |',
  '| COF-008 | Biometria | Senha como reserva | Poderia | 1.1 |',
  '| BKP-004 | Lembrete | Cancelado: ver PERS-04 | Cancelado | — |',
  '| SEC-01 | CSP estrita | Cabeçalhos lidos | Deve | Alpha 1 |',
].join('\n');

// Monta títulos de teste sem escrever a marca literal aqui, para este arquivo não contar no rastreio.
const titulo = (ids) => `it('${'['}${ids}] exemplo', () => {});`;

describe('[NFR-013] rastreio requisito → teste', () => {
  it('lê o catálogo do Volume 03', () => {
    const c = lerCatalogo(md);
    expect(c.map((r) => r.id)).toEqual(['COF-001', 'COF-008', 'BKP-004', 'SEC-01']);
    expect(c[0]).toEqual({ id: 'COF-001', titulo: 'Criar o cofre', prioridade: 'Deve', fase: 'Alpha 1' });
  });

  it('acha um ou vários IDs no título do teste e ignora citações soltas', () => {
    expect(idsMarcados('const x = "[COF-001] não é título";')).toEqual([]);
    expect(idsMarcados(`${titulo('COF-001')}\n${titulo('SEC-01, SEC-02')}`)).toEqual([
      'COF-001',
      'SEC-01',
      'SEC-02',
    ]);
  });

  it('aponta o que está sem teste e o ID que não existe ou foi cancelado', () => {
    const c = lerCatalogo(md);
    const r = montarRastreio(
      c,
      { 'a.test.ts': titulo('COF-001'), 'b.test.ts': `${titulo('XYZ-999')}\n${titulo('BKP-004')}` },
      {},
      'Alpha 1',
    );
    expect(r.semCobertura.map((l) => l.id)).toEqual(['SEC-01']);
    expect(r.desconhecidos.map((d) => d.id)).toEqual(['XYZ-999', 'BKP-004']);
  });

  it('aceita verificação feita fora dos testes', () => {
    const r = montarRastreio(lerCatalogo(md), {}, { 'COF-001': 'job x', 'SEC-01': 'job y' }, 'Alpha 1');
    expect(r.semCobertura).toEqual([]);
    expect(relatorioMarkdown(r, '2026-11-24')).toContain('2 de 2 requisitos');
  });
});
