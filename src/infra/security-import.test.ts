// I-08 da Alpha 2a com o cofre real (IndexedDB simulado) e dados sintéticos: trocar a senha (COF-003),
// código de recuperação novo, troca depois de abrir pelo código (D-042), restaurar como espaço novo (D-046)
// e importar da beta.20 (BKP-008, D-054). Os arquivos da beta.20 foram gerados pelo código da tag v1.22.0-beta.20.
import { describe, expect, it } from 'vitest';
import { beta20Checksum } from '@/application/beta20-file';
import { ENTITY } from '@/application/model';
import type { VaultSession } from '@/application/session';
import { montar } from './test-helpers';
import beta20Texto from './backup/fixtures/beta20-backup.json?raw';
import beta20V1Texto from './backup/fixtures/beta20-backup-v1.json?raw';

const SENHA = 'uma frase bem longa';
const NOVA = 'outra frase ainda mais longa';
const SENHA_BACKUP = 'senha do backup longa';
const fixture = (nome: string) => (nome === 'beta20-backup.json' ? beta20Texto : beta20V1Texto);

async function cofre() {
  const m = montar();
  const pendente = await m.app.prepareVault(SENHA, SENHA);
  const s = await pendente.confirm();
  const ws = await s.createWorkspace({ kind: 'PF', name: 'Pessoal' });
  await s.createAccount(ws.id, {
    name: 'Banco Azul',
    kind: 'corrente',
    openingCents: 100000,
    operationId: s.newOperationId(),
  });
  return { m, s, ws, codigo: pendente.recoveryCode };
}

const ultimos4 = (c: string) => c.replace(/-/g, '').slice(-4);

describe('[COF-003] trocar a senha do cofre', () => {
  it('a senha nova abre, a antiga não, e os dados continuam lá', async () => {
    const { m, s } = await cofre();
    await expect(
      s.security.changePassword({ current: 'senha errada qualquer', next: NOVA, repeat: NOVA }),
    ).rejects.toThrow('A senha atual não confere. Nada foi trocado.');
    await expect(
      s.security.changePassword({ current: SENHA, next: NOVA, repeat: 'diferente' }),
    ).rejects.toThrow('As duas senhas novas não são iguais.');
    await expect(
      s.security.changePassword({ current: SENHA, next: 'curta', repeat: 'curta' }),
    ).rejects.toThrow();
    await s.security.changePassword({ current: SENHA, next: NOVA, repeat: NOVA });
    s.lock();
    await expect(m.app.unlock({ password: SENHA })).rejects.toThrow(
      'Senha ou código de recuperação incorreto.',
    );
    m.avancar(60);
    const de = await m.app.unlock({ password: NOVA });
    expect((await de.workspaces()).length).toBe(1);
    expect((await de.view((await de.workspaces())[0]?.id ?? '')).total).toBe(100000);
  });
});

describe('[COF-003, D-054] código de recuperação novo', () => {
  it('confere a senha antes de mostrar; só troca com os 4 últimos certos; o antigo para de abrir', async () => {
    const { m, s, codigo } = await cofre();
    await expect(s.security.newRecoveryCode('senha errada qualquer')).rejects.toThrow(
      'A senha atual não confere',
    );
    const p = await s.security.newRecoveryCode(SENHA);
    expect(p.code).not.toBe(codigo);
    await expect(p.confirm('ZZZZ')).rejects.toThrow('Os 4 últimos caracteres não conferem');
    // Nada mudou ainda: o código antigo continua abrindo.
    s.lock();
    const s2 = await m.app.unlock({ recoveryCode: codigo });
    const p2 = await s2.security.newRecoveryCode(SENHA);
    await p2.confirm(ultimos4(p2.code).toLowerCase());
    s2.lock();
    m.avancar(60);
    await expect(m.app.unlock({ recoveryCode: codigo })).rejects.toThrow();
    m.avancar(60);
    const s3 = await m.app.unlock({ recoveryCode: p2.code });
    expect(s3.security.openedByRecovery).toBe(true);
    s3.lock();
    await m.app.unlock({ password: SENHA });
  });

  it('[D-042] depois de abrir pelo código: senha e código novos juntos; o código usado para de abrir', async () => {
    const { m, s, codigo } = await cofre();
    s.lock();
    const pela = await m.app.unlock({ recoveryCode: codigo });
    expect(pela.security.openedByRecovery).toBe(true);
    const p = await pela.security.secureAfterRecovery({ next: NOVA, repeat: NOVA });
    await p.confirm(ultimos4(p.code));
    expect(pela.security.openedByRecovery).toBe(false);
    pela.lock();
    await expect(m.app.unlock({ password: SENHA })).rejects.toThrow();
    m.avancar(60);
    await expect(m.app.unlock({ recoveryCode: codigo })).rejects.toThrow();
    m.avancar(120);
    expect((await m.app.unlock({ password: NOVA })).security.openedByRecovery).toBe(false);
    m.avancar(60);
    await m.app.unlock({ recoveryCode: p.code });
  });

  it('"Agora não" esquece o código usado; aberto pela senha, não há oferta', async () => {
    const { m, s, codigo } = await cofre();
    expect(s.security.openedByRecovery).toBe(false);
    s.lock();
    const pela = await m.app.unlock({ recoveryCode: codigo });
    pela.security.dismissRecoveryOffer();
    expect(pela.security.openedByRecovery).toBe(false);
    await expect(pela.security.secureAfterRecovery({ next: NOVA, repeat: NOVA })).rejects.toThrow();
  });
});

/** Todos os identificadores de um espaço, para conferir que nenhum se repete no espaço restaurado. */
async function idsDe(s: VaultSession, ws: string): Promise<Set<string>> {
  const snap = await (
    s as unknown as { port: { load(id: string): Promise<{ items: { id: string }[] }> } }
  ).port.load(ws);
  return new Set(snap.items.map((i) => i.id));
}

describe('[D-046] restaurar como espaço novo', () => {
  it('o espaço do backup entra ao lado, com ids novos, mesmos saldos e trilha nova; o atual fica igual', async () => {
    const { s, ws } = await cofre();
    const mercado = (await s.entries.categories(ws.id)).find((c) => c.name === 'Mercado')?.id ?? '';
    const banco = (await s.view(ws.id)).accounts[0]?.account.id ?? '';
    await s.entries.create(ws.id, {
      kind: 'despesa',
      accountId: banco,
      parts: [{ categoryId: mercado, amountCents: 4590 }],
      date: '2027-03-08',
      status: 'realizado',
      description: 'Feira',
      operationId: s.newOperationId(),
    });
    const backup = await s.createBackup({ kind: 'espaco', workspaceId: ws.id }, SENHA_BACKUP, SENHA_BACKUP);
    // Depois do backup, o atual muda: o restaurado não pode mexer nele.
    await s.createAccount(ws.id, {
      name: 'Carteira',
      kind: 'carteira',
      openingCents: 5000,
      operationId: s.newOperationId(),
    });
    const [novo] = await s.restoreAsNew(await s.openBackup(backup.text, SENHA_BACKUP));
    const lista = await s.workspaces();
    expect(lista.map((w) => w.name)).toEqual(['Pessoal', 'Pessoal (restaurado em 10/03)']);
    expect(lista[1]?.id).toBe(novo);
    expect(lista[1]?.origin?.kind).toBe('backup');
    expect((await s.view(ws.id)).total).toBe(100000 - 4590 + 5000);
    expect((await s.view(novo ?? '')).total).toBe(100000 - 4590);
    expect((await s.entries.list(novo ?? '')).map((r) => r.description)).toEqual(['Feira']);
    const comuns = [...(await idsDe(s, novo ?? ''))].filter((id) => backup.text.includes(id));
    expect(comuns).toEqual([]);
    const r = await s.checkIntegrity();
    expect(r.ok).toBe(true);
    // O espaço restaurado aceita lançamento novo normalmente.
    await s.createAccount(novo ?? '', {
      name: 'Poupança',
      kind: 'poupanca',
      openingCents: 1,
      operationId: s.newOperationId(),
    });
    // E o Pessoal de sempre continua sendo o único "Pessoal" para criar.
    await expect(s.createWorkspace({ kind: 'PF', name: 'Pessoal' })).rejects.toThrow(
      'Já existe um espaço Pessoal',
    );
  });
});

describe('[BKP-008] importar da beta.20', () => {
  it('prévia com saldos que batem, quarentena com o motivo e cancelados contados; importa e confere', async () => {
    const { s } = await cofre();
    const plano = s.previewBeta20(fixture('beta20-backup.json'));
    expect(plano.spaces.map((e) => e.name)).toEqual(['Pessoal (beta.20)', 'Negócio (beta.20)']);
    const pf = plano.spaces[0];
    const pj = plano.spaces[1];
    expect(pf?.accounts).toEqual([
      { name: 'Banco Azul', beta20Cents: 722260, razaoCents: 722260 },
      { name: 'Carteira', beta20Cents: 23000, razaoCents: 23000 },
    ]);
    expect(pj?.accounts).toEqual([{ name: 'Conta da empresa', beta20Cents: 608000, razaoCents: 608000 }]);
    expect(pf?.pending).toBe(1);
    expect(pf?.transfers).toBe(1);
    expect(pf?.invoicePayments).toBe(1);
    expect(pf?.categoriesCreated).toEqual(['Pets']);
    expect(pj?.categoriesCreated).toEqual(['Fornecedores']);
    expect(plano.cancelled).toBe(1);
    expect(plano.quarantine.map((q) => q.label.replace(/\s/g, ' '))).toEqual([
      'Cartão "Cartão Roxo"',
      'Recorrência "Aluguel"',
      'Orçamento da beta.20',
      'Lançamento "Restaurante no cartão" · R$ 87,50 · 12/10/2026',
      'Lançamento "Conta que não existe mais" · R$ 50,00 · 07/10/2026',
    ]);
    expect(plano.quarantine[3]?.reason).toMatch(/Compra no cartão/);

    await s.importBeta20(plano);
    const lista = await s.workspaces();
    expect(lista.map((w) => w.name)).toEqual(['Pessoal', 'Pessoal (beta.20)', 'Negócio (beta.20)']);
    const novoPf = lista[1]?.id ?? '';
    expect((await s.view(novoPf)).total).toBe(722260 + 23000);
    expect((await s.view(lista[2]?.id ?? '')).total).toBe(608000);
    const linhas = await s.entries.list(novoPf);
    expect(linhas.map((l) => l.description).sort()).toEqual(
      [
        'Conta de luz',
        'Mercado do bairro',
        'Pagamento da fatura',
        'Ração e banho',
        'Salário de outubro',
      ].sort(),
    );
    expect(linhas.find((l) => l.description === 'Conta de luz')?.status).toBe('pendente');
    const snap = await (
      s as unknown as { port: { load(id: string): Promise<{ items: { type: string }[] }> } }
    ).port.load(novoPf);
    expect(snap.items.filter((i) => i.type === ENTITY.importQuarantine)).toHaveLength(5);
    expect((await s.checkIntegrity()).ok).toBe(true);
  });

  it('esquema 1 (valor em reais) vira centavos sem arredondar', async () => {
    const { s } = await cofre();
    const texto = fixture('beta20-backup-v1.json');
    const bruto = JSON.parse(texto) as {
      payload: { state: { accounts: { initialBalanceCents: number }[] } };
    };
    const inicial = bruto.payload.state.accounts[0]?.initialBalanceCents ?? 0;
    const plano = s.previewBeta20(texto);
    expect(plano.schemaVersion).toBe(1);
    expect(plano.spaces[0]?.accounts[0]?.razaoCents).toBe(inicial - 4590 + 12000);
    expect(plano.spaces[0]?.accounts[0]?.beta20Cents).toBe(inicial - 4590 + 12000);
  });

  it('arquivo mexido, de outro formato ou de esquema desconhecido é recusado sem gravar nada', async () => {
    const { s } = await cofre();
    const original = fixture('beta20-backup.json');
    const mexido = original.replace('"amountCents": 18990', '"amountCents": 1899');
    expect(() => s.previewBeta20(mexido)).toThrow('A soma de verificação do arquivo não confere');
    expect(() => s.previewBeta20('{"format":"outra-coisa"}')).toThrow('não é um backup da beta.20');
    expect(() => s.previewBeta20('não é json')).toThrow('não é um backup da beta.20');
    const env = JSON.parse(original) as { payload: { schemaVersion: number }; checksum: string };
    env.payload.schemaVersion = 9;
    env.checksum = beta20Checksum(env.payload);
    expect(() => s.previewBeta20(JSON.stringify(env))).toThrow('esquema deste arquivo');
    expect((await s.workspaces()).length).toBe(1);
  });
});
