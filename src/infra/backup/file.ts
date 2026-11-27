// Arquivo de backup .razao (Volume 05, seção 7.1): cabeçalho em claro, resumo e conteúdo cifrados.
// Uma chave aleatória cifra o arquivo e vai embrulhada pela senha do backup, com o mesmo Argon2id do cofre.
// O cabeçalho entra nos dados associados (AAD): mudar data, escopo ou versão faz a decifração falhar.
import { z } from 'zod';
import { AppError } from '@/application/errors';
import type { BackupFilePort, BackupHeader, BackupOpened, BackupWorkspace } from '@/application/ports';
import { fromBase64Strict, fromUtf8, randomBytes, toBase64, utf8 } from '../crypto/bytes';
import { VaultError } from '../crypto/errors';
import type { KdfOptions } from '../crypto/vault-keys';
import { unwrap, wrap } from '../crypto/vault-keys';
import { chooseKdf, validKdfParams } from '../crypto/kdf';
import { auditEventSchema, entitySchema, journalEntrySchema, operationRecordSchema } from '../storage/schema';

/** Limite do arquivo aceito: 200 MB de texto (SEC-06). */
export const MAX_BACKUP_CHARS = 200_000_000;

const id = z.string().min(1).max(200);
const scopeSchema = z.union([
  z.object({ kind: z.literal('cofre') }),
  z.object({ kind: z.literal('espaco'), workspaceId: id }),
]);
const headerSchema = z.object({
  format: z.literal('razao-backup'),
  formatVersion: z.number().int(),
  schemaVersion: z.number().int().positive(),
  createdAt: z.string().max(40),
  appVersion: z.string().max(40),
  scope: scopeSchema,
});
const sealedSchema = z.object({ iv: z.string().max(40), ct: z.string().min(1).max(MAX_BACKUP_CHARS) });
const fileSchema = z.object({
  header: headerSchema,
  key: z.object({ kdf: z.unknown(), wrappedDek: z.string().max(200) }),
  manifest: sealedSchema,
  content: sealedSchema,
});

const workspaceSchema = z.object({
  workspaceId: id,
  entities: z.array(entitySchema.omit({ workspaceId: true })).max(1_000_000),
  journal: z.array(
    z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), entries: z.array(journalEntrySchema).max(100_000) }),
  ),
  audit: z.array(
    z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), events: z.array(auditEventSchema).max(1_000_000) }),
  ),
  operations: z.array(operationRecordSchema.omit({ workspaceId: true })).max(10_000_000),
  // LAN-009: opcional, porque backups anteriores ao I-07 não têm comprovantes.
  attachments: z
    .array(z.object({ id, data: z.string().min(4).max(7_200_000) }))
    .max(100_000)
    .optional(),
});
const contentSchema = z.object({
  workspaces: z.array(workspaceSchema).max(10),
  contentHash: z.string().length(64),
});

async function sha256Hex(texto: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', utf8(texto));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}

const aad = (parte: string, header: BackupHeader) => utf8(JSON.stringify(['razao-backup-v1', parte, header]));

async function cifrar(key: CryptoKey, parte: string, header: BackupHeader, valor: unknown) {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad(parte, header) },
    key,
    utf8(JSON.stringify(valor)),
  );
  return { iv: toBase64(iv), ct: toBase64(new Uint8Array(ct)) };
}

async function decifrar(
  key: CryptoKey,
  parte: string,
  header: BackupHeader,
  s: { iv: string; ct: string },
): Promise<unknown> {
  const iv = fromBase64Strict(s.iv);
  const ct = fromBase64Strict(s.ct);
  if (iv?.length !== 12 || !ct) throw adulterado();
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: aad(parte, header) },
      key,
      ct,
    );
    return JSON.parse(fromUtf8(new Uint8Array(plain))) as unknown;
  } catch {
    throw adulterado();
  }
}

const adulterado = () =>
  new AppError(
    'INVALID',
    'O arquivo foi alterado ou está danificado. Nada foi restaurado; use outra cópia do backup.',
  );

function cabecalho(header: BackupHeader): BackupHeader {
  // Só os campos conhecidos, na ordem fixa: o AAD precisa ser igual na escrita e na leitura.
  const scope =
    header.scope.kind === 'cofre'
      ? { kind: 'cofre' as const }
      : { kind: 'espaco' as const, workspaceId: header.scope.workspaceId };
  return {
    format: 'razao-backup',
    formatVersion: 1,
    schemaVersion: header.schemaVersion,
    createdAt: header.createdAt,
    appVersion: header.appVersion,
    scope,
  };
}

function lerJson(text: string): unknown {
  if (text.length > MAX_BACKUP_CHARS)
    throw new AppError('INVALID', 'O arquivo é grande demais para ser um backup do Razão.');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AppError(
      'INVALID',
      'Este arquivo não é um backup do Razão ou está incompleto. Nada foi restaurado.',
    );
  }
}

export function createBackupFilePort(options: KdfOptions = {}): BackupFilePort {
  const peek = (text: string): BackupHeader => {
    const bruto = lerJson(text) as { header?: { format?: unknown; formatVersion?: unknown } } | null;
    if (bruto?.header?.format !== 'razao-backup') {
      throw new AppError('INVALID', 'Este arquivo não é um backup do Razão. Nada foi restaurado.');
    }
    if (bruto.header.formatVersion !== 1) {
      throw new AppError(
        'INVALID',
        'Este backup é de uma versão mais nova do Razão. Atualize o app antes de restaurar.',
      );
    }
    const r = fileSchema.safeParse(bruto);
    if (!r.success)
      throw new AppError('INVALID', 'O backup está incompleto ou fora do formato. Nada foi restaurado.');
    return cabecalho(r.data.header as BackupHeader);
  };

  return {
    peek,

    async write({ header, manifest, content, password }) {
      const h = cabecalho(header);
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
        'encrypt',
        'decrypt',
      ]);
      const slot = await wrap(key, password, options.kdf ? await options.kdf() : await chooseKdf());
      const corpo = { workspaces: content };
      const contentHash = await sha256Hex(JSON.stringify(corpo));
      const texto = JSON.stringify({
        header: h,
        key: slot,
        manifest: await cifrar(key, 'manifest', h, { manifest, contentHash }),
        content: await cifrar(key, 'content', h, { ...corpo, contentHash }),
      });
      if (texto.length > MAX_BACKUP_CHARS) {
        throw new AppError(
          'INVALID',
          'O backup passaria de 200 MB, o limite do arquivo, por causa dos comprovantes. Faça o backup de um espaço por vez. Nada foi gerado.',
        );
      }
      return texto;
    },

    async read(text, password): Promise<BackupOpened> {
      const header = peek(text);
      const arquivo = fileSchema.parse(lerJson(text));
      if (!validKdfParams(arquivo.key.kdf)) throw adulterado();
      let key: CryptoKey;
      try {
        key = await unwrap({ kdf: arquivo.key.kdf, wrappedDek: arquivo.key.wrappedDek }, password, false);
      } catch (e) {
        if (e instanceof VaultError && e.code === 'WRONG_SECRET') {
          throw new AppError('WRONG_SECRET', 'Senha do backup incorreta. Nada foi restaurado.');
        }
        throw adulterado();
      }
      const man = (await decifrar(key, 'manifest', header, arquivo.manifest)) as {
        manifest?: unknown;
        contentHash?: unknown;
      };
      const bruto = (await decifrar(key, 'content', header, arquivo.content)) as {
        workspaces?: unknown;
        contentHash?: unknown;
      };
      // O hash confirma que o conteúdo é o mesmo que o resumo descreve, inteiro (Volume 05, seção 7.1).
      // É calculado sobre o texto como foi gravado, antes da validação, que pode reordenar campos.
      const hash = await sha256Hex(JSON.stringify({ workspaces: bruto.workspaces }));
      if (man.contentHash !== hash || bruto.contentHash !== hash) {
        throw new AppError(
          'INVALID',
          'O backup está incompleto: o conteúdo não confere com o resumo. Nada foi restaurado.',
        );
      }
      const conteudo = contentSchema.safeParse(bruto);
      if (!conteudo.success)
        throw new AppError('INVALID', 'O conteúdo do backup está fora do formato. Nada foi restaurado.');
      const { workspaces } = conteudo.data;
      const content: BackupWorkspace[] = workspaces.map(({ attachments, ...w }) => ({
        ...w,
        entities: w.entities.map((e) => ({ type: e.type, id: e.id, data: e.data })),
        ...(attachments ? { attachments } : {}),
      }));
      return { header, manifest: man.manifest, content };
    },
  };
}
