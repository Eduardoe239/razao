// PRIV-08: comprovante sem metadados. Reconhece o tipo pelos primeiros bytes (nunca pelo nome ou pelo
// tipo que o navegador diz) e tira de JPEG, PNG e WebP tudo o que não é a imagem: EXIF com localização,
// XMP, comentários e textos. A tela já redesenha a foto antes; esta limpeza é a segunda barreira,
// e `imageMetadata` confere o resultado antes de qualquer gravação.

export type FileKind = 'jpeg' | 'png' | 'webp' | 'pdf';

export const MIME: Record<FileKind, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

const ascii = (b: Uint8Array, at: number, len: number) => String.fromCharCode(...b.subarray(at, at + len));

/** O tipo de verdade do arquivo, pelos bytes do começo. null se não for um dos aceitos. */
export function sniffKind(b: Uint8Array): FileKind | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length >= 8 && ascii(b, 1, 3) === 'PNG' && b[0] === 0x89) return 'png';
  if (b.length >= 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp';
  if (b.length >= 5 && ascii(b, 0, 5) === '%PDF-') return 'pdf';
  return null;
}

// JPEG: APP0 (JFIF), APP2 (perfil de cor) e APP14 (Adobe, conversão de cor) ficam; o resto dos APPn e o
// comentário saem. EXIF e XMP moram no APP1.
const JPEG_FICA = new Set([0xe0, 0xe2, 0xee]);
const jpegTira = (m: number) => (m >= 0xe1 && m <= 0xef && !JPEG_FICA.has(m)) || m === 0xfe;

/** Segmentos do cabeçalho do JPEG até o começo da imagem (SOS). Lança se a estrutura não fecha. */
function jpegSegmentos(b: Uint8Array): { marker: number; start: number; end: number }[] | 'sem-sos' {
  const out: { marker: number; start: number; end: number }[] = [];
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) throw new Error('JPEG malformado');
    const marker = b[i + 1] ?? 0;
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    const len = ((b[i + 2] ?? 0) << 8) | (b[i + 3] ?? 0);
    if (len < 2 || i + 2 + len > b.length) throw new Error('JPEG malformado');
    out.push({ marker, start: i, end: i + 2 + len });
    if (marker === 0xda) return out;
    i += 2 + len;
  }
  return 'sem-sos';
}

function jpegLimpo(b: Uint8Array): Uint8Array {
  const segs = jpegSegmentos(b);
  if (segs === 'sem-sos') throw new Error('JPEG sem imagem');
  const partes: Uint8Array[] = [b.subarray(0, 2)];
  for (const s of segs) if (!jpegTira(s.marker)) partes.push(b.subarray(s.start, s.end));
  const sos = segs[segs.length - 1];
  partes.push(b.subarray(sos?.end ?? 2));
  return juntar(partes);
}

// PNG: só os pedaços de texto, data e EXIF saem; os críticos e os de cor ficam.
const PNG_TIRA = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);

function pngPedacos(b: Uint8Array): { type: string; start: number; end: number }[] {
  const out: { type: string; start: number; end: number }[] = [];
  let i = 8;
  while (i + 12 <= b.length) {
    const len = new DataView(b.buffer, b.byteOffset + i, 4).getUint32(0, false);
    const end = i + 12 + len;
    if (end > b.length) throw new Error('PNG malformado');
    const type = ascii(b, i + 4, 4);
    out.push({ type, start: i, end });
    i = end;
    if (type === 'IEND') return out;
  }
  throw new Error('PNG sem fim');
}

function pngLimpo(b: Uint8Array): Uint8Array {
  const partes: Uint8Array[] = [b.subarray(0, 8)];
  for (const p of pngPedacos(b)) if (!PNG_TIRA.has(p.type)) partes.push(b.subarray(p.start, p.end));
  return juntar(partes);
}

// WebP: os pedaços EXIF e "XMP " saem, e as marcas deles no VP8X são apagadas.
function webpPedacos(b: Uint8Array): { type: string; start: number; end: number }[] {
  const out: { type: string; start: number; end: number }[] = [];
  let i = 12;
  while (i + 8 <= b.length) {
    const len = new DataView(b.buffer, b.byteOffset + i + 4, 4).getUint32(0, true);
    const end = i + 8 + len + (len % 2);
    if (i + 8 + len > b.length) throw new Error('WebP malformado');
    out.push({ type: ascii(b, i, 4), start: i, end: Math.min(end, b.length) });
    i = end;
  }
  return out;
}

function webpLimpo(b: Uint8Array): Uint8Array {
  const partes: Uint8Array[] = [];
  for (const p of webpPedacos(b)) {
    if (p.type === 'EXIF' || p.type === 'XMP ') continue;
    const pedaco = b.slice(p.start, p.end);
    if (p.type === 'VP8X' && pedaco.length > 8) pedaco[8] = (pedaco[8] ?? 0) & ~0x0c;
    partes.push(pedaco);
  }
  const corpo = juntar(partes);
  const out = new Uint8Array(12 + corpo.length);
  out.set(b.subarray(0, 12));
  const tam = 4 + corpo.length;
  new DataView(out.buffer).setUint32(4, tam, true);
  out.set(corpo, 12);
  return out;
}

function juntar(partes: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(partes.reduce((s, p) => s + p.length, 0));
  let at = 0;
  for (const p of partes) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** A imagem sem metadados. Lança Error se a estrutura do arquivo não fecha. PDF não passa por aqui. */
export function stripImageMetadata(b: Uint8Array, kind: Exclude<FileKind, 'pdf'>): Uint8Array {
  if (kind === 'jpeg') return jpegLimpo(b);
  if (kind === 'png') return pngLimpo(b);
  return webpLimpo(b);
}

/** Os metadados que sobraram na imagem (nomes dos segmentos). Vazio quando está limpa. */
export function imageMetadata(b: Uint8Array, kind: Exclude<FileKind, 'pdf'>): string[] {
  if (kind === 'jpeg') {
    const segs = jpegSegmentos(b);
    if (segs === 'sem-sos') return ['estrutura'];
    return segs
      .filter((s) => jpegTira(s.marker))
      .map((s) => (s.marker === 0xfe ? 'COM' : `APP${String(s.marker - 0xe0)}`));
  }
  if (kind === 'png')
    return pngPedacos(b)
      .filter((p) => PNG_TIRA.has(p.type))
      .map((p) => p.type);
  return webpPedacos(b)
    .filter((p) => p.type === 'EXIF' || p.type === 'XMP ')
    .map((p) => p.type.trim());
}
