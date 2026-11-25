// Página de medição (Volume 09, orçamentos de desempenho; D-040 e D-041), publicada em /medicao/ na prévia.
// Mede no próprio aparelho: o Argon2id e, com 24 meses e 10 mil lançamentos sintéticos, desbloquear,
// salvar uma transferência e gerar e conferir um backup. Usa um banco próprio ("razao-medicao"),
// apagado no fim; não toca no cofre de verdade, não guarda resultado e não envia nada.
import { argon2id } from 'hash-wasm';
import { createRazaoApp } from '@/application/app';
import { summarize } from '@/application/backup';
import { createBackupFilePort } from '@/infra/backup/file';
import { browserClock } from '@/infra/clock';
import { uuidv7 } from '@/infra/ids';
import { noUpdates } from '@/infra/pwa';
import { createVaultPort } from '@/infra/vault-adapter';
import { MEDICAO_WS, montarEspaco } from './dados';
import './medicao.css';

const DB = 'razao-medicao';
const SENHA = 'senha de medição sintética';
const LANCAMENTOS = 10_000;

const mediana = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
const ms = (x: number) => `${x.toFixed(0)} ms`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, texto?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (texto) e.textContent = texto;
  return e;
}

async function argon(): Promise<string> {
  const tempos: number[] = [];
  for (let i = 0; i < 6; i++) {
    const t = performance.now();
    await argon2id({
      password: SENHA,
      salt: crypto.getRandomValues(new Uint8Array(16)),
      parallelism: 1,
      iterations: 1,
      memorySize: 65536,
      hashLength: 32,
      outputType: 'binary',
    });
    if (i > 0) tempos.push(performance.now() - t);
  }
  return `Argon2id (64 MiB, 1 iteração, D-041): mediana ${ms(mediana(tempos))}, máximo ${ms(Math.max(...tempos))}`;
}

function apagarBanco(): Promise<void> {
  return new Promise((ok) => {
    const r = indexedDB.deleteDatabase(DB);
    r.onsuccess =
      r.onerror =
      r.onblocked =
        () => {
          ok();
        };
  });
}

async function desempenho(log: (l: string) => void): Promise<string[]> {
  await apagarBanco();
  const local = new Map<string, string>();
  const kv = {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  };
  const vault = createVaultPort({
    dbName: DB,
    local: kv,
    nowIso: () => browserClock.nowIso(),
    nowMs: () => browserClock.nowMs(),
  });
  const app = createRazaoApp({
    vault,
    clock: browserClock,
    ids: { newId: () => uuidv7(Date.now()) },
    file: createBackupFilePort(),
    prefs: kv,
    updates: noUpdates,
  });
  const out: string[] = [];
  try {
    log('Criando o cofre de medição e 10 mil lançamentos sintéticos…');
    const s0 = await (await app.prepareVault(SENHA, SENHA)).confirm();
    const hoje = browserClock.today('America/Fortaleza');
    const espaco = montarEspaco(hoje, LANCAMENTOS);
    // Grava pelo mesmo caminho da restauração: sela cada registro, encadeia a auditoria e reconta tudo.
    const criadoEm = browserClock.nowIso();
    await s0.restoreBackup({
      header: {
        format: 'razao-backup',
        formatVersion: 1,
        schemaVersion: 1,
        createdAt: criadoEm,
        appVersion: 'medicao',
        scope: { kind: 'cofre' },
      },
      manifest: { backupId: uuidv7(Date.now()), createdAt: criadoEm, workspaces: [summarize(espaco)] },
      content: [espaco],
    });
    s0.lock();
    out.push(
      `Lançamentos no cofre: ${String(espaco.journal.reduce((n, p) => n + p.entries.length, 0))} em ${String(espaco.journal.length)} meses`,
    );

    log('Medindo o desbloqueio…');
    let t = performance.now();
    const s = await app.unlock({ password: SENHA });
    const v = await s.view(MEDICAO_WS);
    const desbloqueio = performance.now() - t;
    out.push(
      `Desbloquear e mostrar o saldo: ${ms(desbloqueio)} (orçamento: 2.000 ms no computador, 3.000 ms no celular)`,
    );
    if (v.accounts.length !== 10) throw new Error('O espaço de medição não abriu completo.');

    log('Medindo salvar uma transferência…');
    const salvar: number[] = [];
    for (let i = 0; i < 5; i++) {
      t = performance.now();
      await s.transfer(MEDICAO_WS, {
        fromId: 'conta-0',
        toId: 'conta-1',
        amountCents: 100,
        feeCents: 0,
        date: hoje,
        operationId: s.newOperationId(),
      });
      await s.view(MEDICAO_WS);
      salvar.push(performance.now() - t);
    }
    out.push(
      `Salvar uma transferência e atualizar o saldo: mediana ${ms(mediana(salvar))}, máximo ${ms(Math.max(...salvar))} (orçamento: 200 ms)`,
    );

    log('Medindo gerar e conferir o backup…');
    t = performance.now();
    const b = await s.createBackup({ kind: 'cofre' }, SENHA, SENHA);
    out.push(
      `Gerar e conferir o backup: ${ms(performance.now() - t)}, arquivo de ${(b.text.length / 1_048_576).toFixed(1)} MB (orçamento: 5.000 ms)`,
    );

    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    out.push(
      mem
        ? `Memória JavaScript em uso: ${(mem.usedJSHeapSize / 1_048_576).toFixed(0)} MB (orçamento: 300 MB)`
        : 'Memória: este navegador não informa.',
    );
    s.lock();
  } finally {
    await vault.close();
    await apagarBanco();
  }
  return out;
}

function montar(): void {
  const raiz = document.body;
  raiz.append(el('h1', 'O Razão — medição de desempenho'));
  raiz.append(
    el(
      'p',
      'Mede neste aparelho o Argon2id e, com 24 meses e 10 mil lançamentos inventados, desbloquear, salvar e fazer backup. Usa um banco separado, apagado no fim; o seu cofre não é tocado e nada é enviado. Deixe só esta aba aberta.',
    ),
  );
  const nav = navigator as Navigator & { deviceMemory?: number };
  const info = [
    `Navegador: ${navigator.userAgent}`,
    `Núcleos lógicos: ${String(navigator.hardwareConcurrency)}`,
    `Memória informada: ${nav.deviceMemory ? `${String(nav.deviceMemory)} GB` : 'não informada'}`,
  ].join('\n');
  const botao = el('button', 'Medir');
  botao.type = 'button';
  const copiar = el('button', 'Copiar resultado');
  copiar.type = 'button';
  copiar.disabled = true;
  const saida = el('pre', `${info}\n\nAguardando.`);
  saida.setAttribute('aria-live', 'polite');
  raiz.append(botao, copiar, saida);

  botao.addEventListener('click', () => {
    botao.disabled = true;
    copiar.disabled = true;
    void (async () => {
      const linhas = [info, ''];
      const log = (l: string) => {
        saida.textContent = [...linhas, l].join('\n');
      };
      try {
        log('Medindo o Argon2id…');
        linhas.push(await argon());
        linhas.push(...(await desempenho(log)));
      } catch (erro) {
        console.error(erro);
        linhas.push(`Falhou: ${erro instanceof Error ? erro.message : String(erro)}`);
      }
      saida.textContent = linhas.join('\n');
      saida.dataset['pronto'] = '1';
      botao.disabled = false;
      copiar.disabled = false;
    })();
  });
  copiar.addEventListener('click', () => {
    void navigator.clipboard.writeText(saida.textContent);
  });
}

montar();
