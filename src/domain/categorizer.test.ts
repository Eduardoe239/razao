// Categorizador do nível 1 (IA-001): histórico exato, palavras, limiar e nunca uma categoria que não serve.
import { describe, expect, it } from 'vitest';
import type { TrainingExample } from './categorizer';
import { MIN_CONFIDENCE, tokens, trainCategorizer } from './categorizer';
import { forAll } from './testing/prop';

const ex = (description: string, categoryId: string): TrainingExample => ({ description, categoryId });
const todas = () => true;

describe('[IA-001] categorizador que aprende com o espaço', () => {
  it('[IA-001] palavras: sem acento, sem números, sem palavras vazias e sem repetir', () => {
    expect(tokens('PAGTO Padaria Pão-Quente 123 de 26/11 padaria')).toEqual(['padaria', 'pao', 'quente']);
    expect(tokens('  ')).toEqual([]);
  });

  it('[IA-001] histórico exato vence, com a categoria mais usada naquela descrição', () => {
    const c = trainCategorizer([
      ex('Padaria Estrela', 'alimentacao'),
      ex('padaria estrela', 'alimentacao'),
      ex('Padaria  Estrela', 'lazer'),
    ]);
    expect(c.suggest('PADARIA ESTRELA', todas)).toEqual({
      categoryId: 'alimentacao',
      reason: { kind: 'historico', times: 2 },
    });
    // A mais usada foi arquivada: vale a outra do histórico, nunca a que não serve.
    expect(c.suggest('Padaria Estrela', (id) => id !== 'alimentacao')?.categoryId).toBe('lazer');
  });

  it('[IA-001] palavras parecidas sugerem a categoria e dizem quais palavras pesaram', () => {
    const c = trainCategorizer([
      ex('Padaria Estrela', 'alimentacao'),
      ex('Padaria Sol', 'alimentacao'),
      ex('Mercado Bom Preço', 'alimentacao'),
      ex('Posto Avenida', 'transporte'),
      ex('Posto Shell Centro', 'transporte'),
    ]);
    const s = c.suggest('Padaria Pão Quente', todas);
    expect(s?.categoryId).toBe('alimentacao');
    expect(s?.reason).toMatchObject({ kind: 'palavras', words: ['padaria'] });
    expect(c.suggest('Posto Ipiranga', todas)?.categoryId).toBe('transporte');
  });

  it('[IA-001] sem confiança ou sem palavra conhecida, não sugere nada', () => {
    const c = trainCategorizer([
      ex('Loja Centro', 'compras'),
      ex('Loja Norte', 'compras'),
      ex('Loja Sul', 'lazer'),
      ex('Loja Leste', 'lazer'),
    ]);
    expect(c.suggest('Loja Oeste', todas)).toBeUndefined();
    expect(c.suggest('Cinema', todas)).toBeUndefined();
    expect(c.suggest('', todas)).toBeUndefined();
    expect(trainCategorizer([]).suggest('Qualquer', todas)).toBeUndefined();
    // Categoria com um exemplo só ainda não entra no modelo de palavras.
    expect(
      trainCategorizer([ex('Farmácia Centro', 'saude')]).suggest('Farmácia Popular', todas),
    ).toBeUndefined();
  });

  it('[IA-001] propriedade: nunca sugere categoria que não serve, e a confiança fica acima do limiar', () => {
    forAll('categorizador só sugere categoria que serve', (rng) => {
      const cats = ['a', 'b', 'c', 'd'];
      const palavras = ['padaria', 'posto', 'mercado', 'farmacia', 'cinema', 'loja', 'uber'];
      const exemplos = Array.from({ length: rng.int(0, 30) }, () =>
        ex(`${rng.pick(palavras)} ${rng.pick(palavras)}`, rng.pick(cats)),
      );
      const serve = new Set(cats.filter(() => rng.bool()));
      const s = trainCategorizer(exemplos).suggest(`${rng.pick(palavras)} centro`, (id) => serve.has(id));
      if (s) {
        expect(serve.has(s.categoryId)).toBe(true);
        if (s.reason.kind === 'palavras') expect(s.reason.confidence).toBeGreaterThanOrEqual(MIN_CONFIDENCE);
      }
    });
  });

  it('[IA-001] avaliação: 2 semanas de uso sintético e 80% ou mais de acerto nas seguintes', () => {
    // Gerador determinístico (congruencial), para o resultado ser sempre o mesmo.
    let semente = 20261127;
    const proximo = () => {
      semente = (semente * 1103515245 + 12345) % 2147483648;
      return semente / 2147483648;
    };
    const escolher = <T>(xs: readonly T[]): T => xs[Math.floor(proximo() * xs.length)] as T;
    const lojas: Record<string, readonly string[]> = {
      alimentacao: [
        'Padaria Estrela',
        'Padaria Sol',
        'Mercado Bom Preço',
        'Mercado Central',
        'Açougue Boi Gordo',
      ],
      restaurantes: [
        'Restaurante Sabor',
        'iFood *Pedido',
        'iFood *Lanche',
        'Pizzaria Napoli',
        'Restaurante Mar',
      ],
      transporte: ['Posto Avenida', 'Posto Shell', 'Uber *Viagem', 'Uber *Trip', '99 Corrida'],
      saude: ['Farmácia Pague Menos', 'Farmácia Popular', 'Drogaria São João', 'Laboratório Vida'],
      casa: ['Enel Conta de Luz', 'Cagece Água', 'Internet Fibra', 'Condomínio Bloco A'],
      lazer: ['Cinema Shopping', 'Netflix', 'Spotify', 'Teatro Municipal'],
    };
    const cats = Object.keys(lojas);
    const gerar = (n: number) =>
      Array.from({ length: n }, () => {
        const c = escolher(cats);
        const base = escolher(lojas[c] ?? []);
        // Variações do mundo real: caixa alta, número de pedido, sufixo de cidade.
        const variacao = escolher(['', ' 123', ' Quixadá', ' *A1B2', '']);
        const texto = proximo() < 0.3 ? `${base}${variacao}`.toUpperCase() : `${base}${variacao}`;
        return ex(texto, c);
      });
    const duasSemanas = gerar(60);
    const depois = gerar(500);
    const treinados: TrainingExample[] = [...duasSemanas];
    let certos = 0;
    for (const e of depois) {
      const s = trainCategorizer(treinados).suggest(e.description, todas);
      if (s?.categoryId === e.categoryId) certos += 1;
      treinados.push(e);
    }
    expect(certos / depois.length).toBeGreaterThanOrEqual(0.8);
  });
});
