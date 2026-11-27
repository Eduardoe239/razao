// PRIV-08, primeira barreira: a foto é redesenhada num canvas antes de ir para o cofre. O que sai do canvas
// é só a imagem: sem localização, sem modelo do aparelho, sem data. A rotação do EXIF é aplicada antes,
// para a foto não ficar deitada. A aplicação ainda limpa e confere de novo antes de gravar.
import { AppError } from '@/application/errors';
import { MAX_ATTACHMENT_BYTES } from '@/application/attachment-ops';
import { MIME, sniffKind } from '@/application/image-metadata';

/** Foto de celular costuma passar de 5 MB antes de ser reduzida; acima disto nem tenta. */
const MAX_ENTRADA = 30 * 1024 * 1024;
const LADO_MAIOR = 2560;

async function codificar(canvas: HTMLCanvasElement, tipo: string, q?: number): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((r) => {
    canvas.toBlob(r, tipo, q);
  });
  if (!blob) throw new AppError('INVALID', 'Não deu para preparar esta imagem. Tente outra foto.');
  return new Uint8Array(await blob.arrayBuffer());
}

/** Os bytes que vão para a aplicação: foto redesenhada e reduzida; PDF (ou o que não for imagem) como veio. */
export async function readAttachmentFile(file: File): Promise<Uint8Array> {
  if (file.size > MAX_ENTRADA) {
    throw new AppError('INVALID', 'O arquivo é grande demais. Use uma foto ou um PDF de até 5 MB.');
  }
  const bruto = new Uint8Array(await file.arrayBuffer());
  const kind = sniffKind(bruto);
  if (kind === null || kind === 'pdf') return bruto;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(new Blob([bruto], { type: MIME[kind] }), {
      imageOrientation: 'from-image',
    });
  } catch {
    throw new AppError(
      'INVALID',
      'Não deu para abrir esta imagem. Tire a foto de novo ou use outro arquivo.',
    );
  }
  const escala = Math.min(1, LADO_MAIOR / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * escala));
  canvas.height = Math.max(1, Math.round(bitmap.height * escala));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new AppError('INVALID', 'Não deu para preparar esta imagem. Tente outra foto.');
  // Fundo branco: se o PNG precisar virar JPEG para caber, a transparência não vira preto.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const tentativas: [string, number | undefined][] =
    kind === 'png'
      ? [
          ['image/png', undefined],
          ['image/jpeg', 0.85],
          ['image/jpeg', 0.7],
        ]
      : [
          ['image/jpeg', 0.85],
          ['image/jpeg', 0.72],
          ['image/jpeg', 0.6],
        ];
  let ultimo: Uint8Array = new Uint8Array();
  for (const [tipo, q] of tentativas) {
    ultimo = await codificar(canvas, tipo, q);
    if (ultimo.length <= MAX_ATTACHMENT_BYTES) return ultimo;
  }
  return ultimo;
}

/** Baixa o arquivo decifrado com o nome guardado. A URL temporária some logo depois. */
export function downloadBytes(bytes: Uint8Array, name: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60_000);
}
