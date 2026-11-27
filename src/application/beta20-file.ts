// BKP-008: leitura do arquivo de backup JSON da beta.20 (formato "orazao-backup"). Confere o envelope e a soma de
// verificação do jeito que a própria beta.20 fazia, e converte os valores dos esquemas 1 a 4 para centavos.
// Nada aqui grava: o resultado é só a leitura, para a prévia.
import { AppError } from './errors';

/** A beta.20 recusava arquivo acima de 25 MB; aqui também. */
export const BETA20_MAX_BYTES = 25 * 1024 * 1024;

type Registro = Record<string, unknown>;

const ehRegistro = (v: unknown): v is Registro => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** JSON com as chaves em ordem, igual ao `stableStringify` da beta.20. */
function estavel(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(estavel).join(',')}]`;
  if (ehRegistro(v)) {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${estavel(v[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
}

/** FNV-1a de 32 bits, a soma de verificação da beta.20 (detecta arquivo cortado ou mexido sem querer). */
export function beta20Checksum(payload: unknown): string {
  const texto = estavel(payload);
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export interface Beta20State {
  /** Data em que a beta.20 gerou o arquivo. */
  readonly createdAt: string;
  readonly schemaVersion: number;
  readonly checksum: string;
  readonly accounts: readonly Registro[];
  readonly cards: readonly Registro[];
  readonly categories: readonly Registro[];
  readonly transactions: readonly Registro[];
  readonly recurring: readonly Registro[];
  readonly budgets: Registro;
  /** Itens das listas que nem objeto eram: vão para a quarentena como "fora do formato". */
  readonly malformed: number;
}

const NAO_E = 'Este arquivo não é um backup da beta.20 do Razão. Nada foi importado.';

const lista = (v: unknown, nome: string): Registro[] => {
  if (v === undefined) return [];
  if (!Array.isArray(v))
    throw new AppError('INVALID', `A lista de ${nome} do arquivo está fora do formato. Nada foi importado.`);
  return v.filter(ehRegistro);
};

/** Lê, confere o envelope e a soma de verificação. Lança AppError com o motivo; nunca grava nada. */
export function readBeta20(text: string): Beta20State {
  if (text.length > BETA20_MAX_BYTES) {
    throw new AppError('INVALID', 'O arquivo passa de 25 MB, o limite da beta.20. Nada foi importado.');
  }
  let bruto: unknown;
  try {
    bruto = JSON.parse(text);
  } catch {
    throw new AppError('INVALID', NAO_E);
  }
  if (!ehRegistro(bruto) || bruto['format'] !== 'orazao-backup') throw new AppError('INVALID', NAO_E);
  if (bruto['formatVersion'] !== 1) {
    throw new AppError('INVALID', 'A versão deste arquivo da beta.20 não é conhecida. Nada foi importado.');
  }
  const createdAt = bruto['createdAt'];
  const payload = bruto['payload'];
  const checksum = bruto['checksum'];
  if (typeof createdAt !== 'string' || Number.isNaN(Date.parse(createdAt)) || !ehRegistro(payload)) {
    throw new AppError('INVALID', NAO_E);
  }
  if (typeof checksum !== 'string' || beta20Checksum(payload) !== checksum) {
    throw new AppError(
      'INVALID',
      'A soma de verificação do arquivo não confere: ele pode estar incompleto ou ter sido mexido. Nada foi importado.',
    );
  }
  const versao = payload['schemaVersion'];
  if (typeof versao !== 'number' || !Number.isInteger(versao) || versao < 1 || versao > 4) {
    throw new AppError(
      'INVALID',
      'O esquema deste arquivo da beta.20 não é conhecido (1 a 4). Nada foi importado.',
    );
  }
  const state = payload['state'];
  if (!ehRegistro(state)) throw new AppError('INVALID', NAO_E);
  // Versões internas divergentes: a beta.20 recusava, e aqui também.
  for (const campo of ['version', 'schemaVersion']) {
    const v = state[campo];
    if (v !== undefined && v !== null && v !== versao) {
      throw new AppError(
        'INVALID',
        'O arquivo declara versões de esquema diferentes entre si. Nada foi importado.',
      );
    }
  }
  const listas = ['accounts', 'cards', 'categories', 'transactions', 'recurring'];
  const malformed = listas.reduce((n, k) => {
    const v = state[k];
    return n + (Array.isArray(v) ? v.filter((x) => !ehRegistro(x)).length : 0);
  }, 0);
  const accounts = lista(state['accounts'], 'contas');
  const transactions = lista(state['transactions'], 'lançamentos');
  if (!Array.isArray(state['accounts']) || !Array.isArray(state['transactions'])) {
    throw new AppError('INVALID', 'O arquivo não traz contas e lançamentos. Nada foi importado.');
  }
  return {
    createdAt: new Date(createdAt).toISOString(),
    schemaVersion: versao,
    checksum,
    accounts,
    cards: lista(state['cards'], 'cartões'),
    categories: lista(state['categories'], 'categorias'),
    transactions,
    recurring: lista(state['recurring'], 'recorrências'),
    budgets: ehRegistro(state['budgets']) ? state['budgets'] : {},
    malformed,
  };
}

/**
 * O valor em centavos, pelas regras de migração da beta.20: no esquema 1, `amount` era em reais; no 2,
 * `amountCents` vale e, sem ele, `amount` inteiro já era centavos e fracionário era reais; do 3 em diante,
 * só `amountCents`. Devolve null quando o valor é ambíguo ou tem mais precisão que centavos (vai para a quarentena).
 */
export function beta20Cents(tx: Registro, schemaVersion: number): number | null {
  const ok = (n: number) => (Number.isSafeInteger(n) && n > 0 ? n : null);
  const cents = tx['amountCents'];
  if (cents !== undefined) return typeof cents === 'number' ? ok(cents) : null;
  const amount = tx['amount'];
  if (schemaVersion >= 3 || typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) return null;
  if (schemaVersion === 2 && Number.isInteger(amount)) return ok(amount);
  const calculado = amount * 100;
  const arredondado = Math.round(calculado);
  return Math.abs(calculado - arredondado) > 1e-6 ? null : ok(arredondado);
}
