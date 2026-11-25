// Gerador de testes de propriedade próprio, com semente registrada (D-015).
// Só os testes usam este arquivo. A semente sai do vitest.setup.ts e aparece em toda falha,
// para o caso poder ser repetido exatamente: PROP_SEED=<semente> npm test.

export interface PropConfig {
  readonly seed: number;
  readonly runs: number;
}

function config(): PropConfig {
  const g = globalThis as { __RAZAO_PROP__?: PropConfig };
  return g.__RAZAO_PROP__ ?? { seed: 20261125, runs: 1000 };
}

/** Gerador pseudoaleatório mulberry32: rápido, determinístico e bom o bastante para testes. */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Inteiro entre min e max, inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  bool(): boolean {
    return this.next() < 0.5;
  }

  pick<T>(items: readonly T[]): T {
    const item = items[this.int(0, items.length - 1)];
    if (item === undefined) throw new Error('pick em lista vazia');
    return item;
  }

  /** Valores em centavos com mais chance de casos de borda (0, 1, limites). */
  cents(max: number): number {
    const r = this.next();
    if (r < 0.05) return 1;
    if (r < 0.1) return max;
    if (r < 0.4) return this.int(1, 10_000);
    return this.int(1, max);
  }
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Roda a propriedade em `runs` casos. Cada caso tem semente própria, derivada da semente global e do nome,
 * e a mensagem de falha mostra a semente e o caso para repetir.
 */
export function forAll(name: string, property: (rng: Rng, index: number) => void, runs?: number): void {
  const { seed, runs: padrao } = config();
  const total = runs ?? padrao;
  const base = (seed ^ hash(name)) >>> 0;
  for (let i = 0; i < total; i++) {
    const rng = new Rng((base + Math.imul(i, 0x9e3779b1)) >>> 0);
    try {
      property(rng, i);
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : String(erro);
      throw new Error(
        `Propriedade "${name}" falhou no caso ${String(i)} (PROP_SEED=${String(seed)}): ${motivo}`,
        {
          cause: erro,
        },
      );
    }
  }
}
