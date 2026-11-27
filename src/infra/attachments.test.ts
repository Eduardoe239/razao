// Comprovantes (LAN-009, PRIV-08), verificação de integridade (BKP-007) e encerrar conta (CON-007),
// com o cofre real (IndexedDB simulado) e dados sintéticos.
import { describe, expect, it } from 'vitest';
import type { FlowEntryInput } from '@/application/entry-ops';
import type { VaultSession } from '@/application/session';
import { MARCA_APARELHO, MARCA_GPS, comGps, contem, jpegMinimo } from '@/domain/testing/image-fixtures';
import { fromBase64, toBase64 } from './crypto/bytes';
import { openRazaoDb } from './storage/db';
import { cofreAberto } from './test-helpers';

const SENHA = 'uma frase bem longa';
const SENHA_BACKUP = 'senha do backup longa';
const PDF = new TextEncoder().encode('%PDF-1.7\n% recibo sintético\n%%EOF');

async function preparar() {
  const { s, m } = await cofreAberto();
  const ws = await s.createWorkspace({ kind: 'PF', name: 'Pessoal' });
  const op = () => s.newOperationId();
  await s.createAccount(ws.id, {
    name: 'Banco Azul',
    kind: 'corrente',
    openingCents: 100000,
    operationId: op(),
  });
  await s.createAccount(ws.id, { name: 'Carteira', kind: 'carteira', openingCents: 0, operationId: op() });
  const contas = Object.fromEntries(
    (await s.view(ws.id)).accounts.map((a) => [a.account.name, a.account.id]),
  );
  const mercado = (await s.entries.categories(ws.id)).find((c) => c.name === 'Mercado')?.id ?? '';
  const banco = contas['Banco Azul'] ?? '';
  const carteira = contas['Carteira'] ?? '';
  const despesa = (extra: Partial<FlowEntryInput> = {}): FlowEntryInput => ({
    kind: 'despesa',
    accountId: banco,
    parts: [{ categoryId: mercado, amountCents: 4590 }],
    date: '2027-03-08',
    status: 'realizado',
    description: 'Feira',
    operationId: op(),
    ...extra,
  });
  await s.entries.create(ws.id, despesa());
  const entryId = (await s.entries.list(ws.id))[0]?.entryId ?? '';
  return { s, m, ws, op, banco, carteira, mercado, despesa, entryId };
}

const anexar = (s: VaultSession, ws: string, entryId: string, bytes: Uint8Array, name = 'recibo.jpg') =>
  s.entries.attach(ws, { entryId, name, bytes, operationId: s.newOperationId() });

/** Todos os registros brutos do conjunto de anexos, como estão no disco. */
async function anexosNoDisco(dbName: string) {
  const db = await openRazaoDb(dbName);
  const keys = await db.getAllKeys('attachments');
  const vals = await db.getAll('attachments');
  db.close();
  return keys.map((k, i) => ({ key: k, value: vals[i] }));
}

describe('[LAN-009, PRIV-08] comprovante anexado', () => {
  it('foto com localização é guardada cifrada e sem nenhum metadado', async () => {
    const b = await preparar();
    const foto = comGps(jpegMinimo());
    const { result, attachmentId } = await anexar(b.s, b.ws.id, b.entryId, foto);
    expect(result).toBe('gravada');
    const [info] = await b.s.entries.attachments(b.ws.id, b.entryId);
    expect(info).toMatchObject({ id: attachmentId, name: 'recibo.jpg', mime: 'image/jpeg' });
    const aberto = await b.s.entries.openAttachment(b.ws.id, attachmentId);
    expect(contem(aberto.bytes, MARCA_GPS) || contem(aberto.bytes, MARCA_APARELHO)).toBe(false);
    expect(contem(aberto.bytes, 'Exif')).toBe(false);
    // No disco: chave "espaço/id" e só conteúdo cifrado, sem nada da imagem em claro.
    const disco = await anexosNoDisco(b.m.dbName);
    expect(disco.map((d) => d.key)).toEqual([`${b.ws.id}/${attachmentId}`]);
    const cifrado = fromBase64((disco[0]?.value as { sealed: { ct: string } }).sealed.ct);
    expect(contem(cifrado, 'JFIF')).toBe(false);
    expect((await b.s.entries.list(b.ws.id))[0]?.attachments).toBe(1);
  });

  it('PDF entra como veio; tipo errado e lançamento de fora são recusados sem gravar nada', async () => {
    const b = await preparar();
    const { attachmentId } = await anexar(b.s, b.ws.id, b.entryId, PDF, 'nota.pdf');
    expect([...(await b.s.entries.openAttachment(b.ws.id, attachmentId)).bytes]).toEqual([...PDF]);
    await expect(anexar(b.s, b.ws.id, b.entryId, new TextEncoder().encode('<svg onload=x>'))).rejects.toThrow(
      /JPG, PNG ou WebP/,
    );
    await expect(anexar(b.s, b.ws.id, 'nao-existe', PDF)).rejects.toThrow(/não encontrado/);
    expect(await b.s.entries.attachments(b.ws.id, b.entryId)).toHaveLength(1);
  });

  it('o mesmo clique duas vezes grava uma vez só (LAN-012)', async () => {
    const b = await preparar();
    const operationId = b.s.newOperationId();
    const input = { entryId: b.entryId, name: 'n.pdf', bytes: PDF, operationId };
    expect((await b.s.entries.attach(b.ws.id, input)).result).toBe('gravada');
    expect((await b.s.entries.attach(b.ws.id, input)).result).toBe('repetida');
    expect(await b.s.entries.attachments(b.ws.id, b.entryId)).toHaveLength(1);
  });

  it('continua no lançamento depois de editar, de excluir e desfazer, e de reabrir o cofre', async () => {
    const b = await preparar();
    await anexar(b.s, b.ws.id, b.entryId, PDF, 'nota.pdf');
    await b.s.entries.edit(
      b.ws.id,
      b.entryId,
      b.despesa({ parts: [{ categoryId: b.mercado, amountCents: 5000 }] }),
    );
    const editado = (await b.s.entries.list(b.ws.id))[0];
    expect(editado?.entryId).not.toBe(b.entryId);
    expect(editado?.attachments).toBe(1);
    const { undo } = await b.s.entries.remove(b.ws.id, {
      entryId: editado?.entryId ?? '',
      operationId: b.op(),
    });
    if (!undo) throw new Error('sem desfazer');
    await b.s.entries.undoRemove(b.ws.id, { undo, operationId: b.op() });
    b.s.lock();
    const s = await b.m.app.unlock({ password: SENHA });
    const linha = (await s.entries.list(b.ws.id))[0];
    expect(await s.entries.attachments(b.ws.id, linha?.entryId ?? '')).toHaveLength(1);
  });

  it('remover apaga o arquivo do disco', async () => {
    const b = await preparar();
    const { attachmentId } = await anexar(b.s, b.ws.id, b.entryId, PDF);
    await b.s.entries.removeAttachment(b.ws.id, { attachmentId, operationId: b.op() });
    expect(await b.s.entries.attachments(b.ws.id, b.entryId)).toEqual([]);
    expect(await anexosNoDisco(b.m.dbName)).toEqual([]);
    expect((await b.s.entries.attachmentUsage(b.ws.id)).count).toBe(0);
  });

  it('vai no backup e volta igual; excluir o espaço apaga os comprovantes dele', async () => {
    const b = await preparar();
    const { attachmentId } = await anexar(b.s, b.ws.id, b.entryId, comGps(jpegMinimo()));
    const antes = (await b.s.entries.openAttachment(b.ws.id, attachmentId)).bytes;
    const backup = await b.s.createBackup({ kind: 'cofre' }, SENHA_BACKUP, SENHA_BACKUP);
    expect(backup.manifest.workspaces[0]?.counts.attachments).toBe(1);
    await b.s.entries.removeAttachment(b.ws.id, { attachmentId, operationId: b.op() });
    await b.s.restoreBackup(await b.s.openBackup(backup.text, SENHA_BACKUP));
    expect([...(await b.s.entries.openAttachment(b.ws.id, attachmentId)).bytes]).toEqual([...antes]);
    expect(b.s.safeMode).toBe(false);
    await b.s.deleteWorkspace(b.ws.id, 'EXCLUIR');
    expect(await anexosNoDisco(b.m.dbName)).toEqual([]);
  });
});

describe('[BKP-007] verificação de integridade', () => {
  it('tudo certo num cofre sem problema', async () => {
    const b = await preparar();
    await anexar(b.s, b.ws.id, b.entryId, PDF);
    const r = await b.s.checkIntegrity();
    expect(r.ok).toBe(true);
    expect(r.workspaces[0]?.items.every((i) => i.ok)).toBe(true);
    expect(r.workspaces[0]?.items.find((i) => i.id === 'comprovantes')?.detail).toMatch(/1 arquivo abriu/);
  });

  it('página do diário devolvida de uma versão antiga é mostrada, e nada é corrigido', async () => {
    const b = await preparar();
    const db = await openRazaoDb(b.m.dbName);
    const chave: [string, string] = [b.ws.id, '2027-03'];
    const velha = await db.get('journal', chave);
    db.close();
    await b.s.entries.create(b.ws.id, b.despesa({ description: 'Depois' }));
    const db2 = await openRazaoDb(b.m.dbName);
    const atual = await db2.get('journal', chave);
    if (!velha || !atual) throw new Error('página não encontrada');
    await db2.put('journal', { ...velha, rev: atual.rev }, chave);
    db2.close();

    const r = await b.s.checkIntegrity();
    expect(r.ok).toBe(false);
    expect(r.safeMode).toBe(true);
    expect(r.workspaces[0]?.items.find((i) => i.id === 'paginas')).toMatchObject({ ok: false });
    // Nada corrigido: a página adulterada continua no disco como estava, e o cofre não grava.
    const db3 = await openRazaoDb(b.m.dbName);
    expect(await db3.get('journal', chave)).toEqual({ ...velha, rev: atual.rev });
    db3.close();
    await expect(b.s.entries.create(b.ws.id, b.despesa())).rejects.toThrow(/modo seguro/);
  });

  it('comprovante trocado ou apagado no disco aparece como divergência', async () => {
    const b = await preparar();
    const a1 = (await anexar(b.s, b.ws.id, b.entryId, PDF)).attachmentId;
    const a2 = (await anexar(b.s, b.ws.id, b.entryId, PDF, 'outro.pdf')).attachmentId;
    const db = await openRazaoDb(b.m.dbName);
    const r1 = await db.get('attachments', `${b.ws.id}/${a1}`);
    if (!r1) throw new Error('anexo não encontrado');
    const ct = fromBase64(r1.sealed.ct);
    ct[0] = (ct[0] ?? 0) ^ 1;
    await db.put('attachments', { ...r1, sealed: { ...r1.sealed, ct: toBase64(ct) } }, `${b.ws.id}/${a1}`);
    await db.delete('attachments', `${b.ws.id}/${a2}`);
    db.close();
    const r = await b.s.checkIntegrity();
    const item = r.workspaces[0]?.items.find((i) => i.id === 'comprovantes');
    expect(item?.ok).toBe(false);
    expect(item?.detail).toMatch(/1 arquivo faltando; 1 arquivo diferente do guardado/);
    await expect(b.s.entries.openAttachment(b.ws.id, a1)).rejects.toThrow(/não abriu/);
  });
});

describe('[CON-007] encerrar conta', () => {
  it('com saldo positivo transfere para a conta escolhida e encerra numa operação só', async () => {
    const b = await preparar();
    const prev = await b.s.previewClose(b.ws.id, b.banco);
    expect(prev.balanceCents).toBe(100000 - 4590);
    expect(prev.targets.map((t) => t.id)).toEqual([b.carteira]);
    await expect(b.s.closeAccount(b.ws.id, { accountId: b.banco, operationId: b.op() })).rejects.toThrow(
      /ainda tem saldo/,
    );
    await b.s.closeAccount(b.ws.id, { accountId: b.banco, toAccountId: b.carteira, operationId: b.op() });
    const v = await b.s.view(b.ws.id);
    const banco = v.accounts.find((a) => a.account.id === b.banco);
    expect(banco?.balance).toBe(0);
    expect(banco?.account).toMatchObject({ archived: true, closedAt: '2027-03-10' });
    expect(v.accounts.find((a) => a.account.id === b.carteira)?.balance).toBe(100000 - 4590);
  });

  it('com saldo negativo o dinheiro vem da outra conta; com saldo zero encerra direto', async () => {
    const b = await preparar();
    await b.s.entries.create(
      b.ws.id,
      b.despesa({ accountId: b.carteira, parts: [{ categoryId: b.mercado, amountCents: 700 }] }),
    );
    await b.s.closeAccount(b.ws.id, { accountId: b.carteira, toAccountId: b.banco, operationId: b.op() });
    let v = await b.s.view(b.ws.id);
    expect(v.accounts.find((a) => a.account.id === b.carteira)?.balance).toBe(0);
    expect(v.accounts.find((a) => a.account.id === b.banco)?.balance).toBe(100000 - 4590 - 700);
    await b.s.setAccountArchived(b.ws.id, { accountId: b.carteira, archived: false, operationId: b.op() });
    v = await b.s.view(b.ws.id);
    expect(v.accounts.find((a) => a.account.id === b.carteira)?.account.closedAt).toBeUndefined();
    await b.s.closeAccount(b.ws.id, { accountId: b.carteira, operationId: b.op() });
    v = await b.s.view(b.ws.id);
    expect(v.accounts.find((a) => a.account.id === b.carteira)?.account.archived).toBe(true);
  });

  it('lançamento a vencer bloqueia, e o bloqueio diz o que fazer', async () => {
    const b = await preparar();
    await b.s.entries.create(b.ws.id, b.despesa({ status: 'pendente', date: '2027-03-20' }));
    await expect(
      b.s.closeAccount(b.ws.id, { accountId: b.banco, toAccountId: b.carteira, operationId: b.op() }),
    ).rejects.toThrow(/1 lançamento a vencer. Confirme ou exclua/);
    expect((await b.s.view(b.ws.id)).accounts.find((a) => a.account.id === b.banco)?.account.archived).toBe(
      false,
    );
  });
});
