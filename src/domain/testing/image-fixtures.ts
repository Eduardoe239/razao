// Imagens sintéticas com metadados de localização, para os testes de PRIV-08. Nenhuma foto real.
// O EXIF traz um GPS falso (3°43' S, 38°32' O) e um aparelho falso; os textos de marca deixam fácil
// conferir que nada sobrou.

export const MARCA_GPS = 'RAZAO-GPS-TESTE';
export const MARCA_APARELHO = 'RAZAO-CAMERA-TESTE';

const enc = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const u16 = (n: number) => [(n >> 8) & 0xff, n & 0xff];
const u32 = (n: number) => [(n >>> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];

/** TIFF big-endian com IFD0 (Make + ponteiro de GPS) e IFD de GPS (referências, latitude e um texto). */
function tiffComGps(): number[] {
  const make = [...enc(MARCA_APARELHO), 0];
  const gpsTexto = [...enc(MARCA_GPS), 0];
  // Posições: cabeçalho 8; IFD0 com 2 entradas = 2 + 24 + 4 = 30 → 38; Make em 38.
  const makeAt = 38;
  const gpsIfdAt = makeAt + make.length;
  // IFD de GPS com 3 entradas = 2 + 36 + 4 = 42; latitude (3 racionais = 24 bytes) logo depois.
  const latAt = gpsIfdAt + 42;
  const textoAt = latAt + 24;
  const out: number[] = [
    ...enc('MM'),
    ...u16(42),
    ...u32(8),
    ...u16(2),
    ...u16(0x010f),
    ...u16(2),
    ...u32(make.length),
    ...u32(makeAt),
    ...u16(0x8825),
    ...u16(4),
    ...u32(1),
    ...u32(gpsIfdAt),
    ...u32(0),
    ...make,
    ...u16(3),
    ...u16(0x0001),
    ...u16(2),
    ...u32(2),
    ...enc('S'),
    0,
    0,
    0,
    ...u16(0x0002),
    ...u16(5),
    ...u32(3),
    ...u32(latAt),
    ...u16(0x001b),
    ...u16(7),
    ...u32(gpsTexto.length),
    ...u32(textoAt),
    ...u32(0),
    ...u32(3),
    ...u32(1),
    ...u32(43),
    ...u32(1),
    ...u32(0),
    ...u32(1),
    ...gpsTexto,
  ];
  return out;
}

/** Segmento APP1 (EXIF) pronto para entrar logo depois do FFD8 de um JPEG. */
export function exifApp1(): Uint8Array {
  const corpo = [...enc('Exif'), 0, 0, ...tiffComGps()];
  return new Uint8Array([0xff, 0xe1, ...u16(corpo.length + 2), ...corpo]);
}

/** Põe EXIF com GPS (e um comentário) num JPEG de verdade, logo depois do início. */
export function comGps(jpeg: Uint8Array): Uint8Array {
  const com = [...enc(`comentario ${MARCA_GPS}`)];
  const coment = new Uint8Array([0xff, 0xfe, ...u16(com.length + 2), ...com]);
  const app1 = exifApp1();
  const out = new Uint8Array(jpeg.length + app1.length + coment.length);
  out.set(jpeg.subarray(0, 2));
  out.set(app1, 2);
  out.set(coment, 2 + app1.length);
  out.set(jpeg.subarray(2), 2 + app1.length + coment.length);
  return out;
}

/** JPEG mínimo bem formado (sem decodificar): JFIF, tabela, quadro, início da imagem e fim. */
export function jpegMinimo(): Uint8Array {
  const jfif = [0xff, 0xe0, ...u16(16), ...enc('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const dqt = [0xff, 0xdb, ...u16(67), 0, ...new Array<number>(64).fill(1)];
  const sof = [0xff, 0xc0, ...u16(11), 8, 0, 1, 0, 1, 1, 1, 0x11, 0];
  const sos = [0xff, 0xda, ...u16(8), 1, 1, 0, 0, 63, 0];
  return new Uint8Array([0xff, 0xd8, ...jfif, ...dqt, ...sof, ...sos, 0x12, 0x34, 0xff, 0xd9]);
}

/** PNG 1×1 com um pedaço de texto e um EXIF. O CRC não é conferido pela limpeza. */
export function pngComTexto(): Uint8Array {
  const pedaco = (tipo: string, dados: number[]) => [
    ...u32(dados.length),
    ...enc(tipo),
    ...dados,
    0,
    0,
    0,
    0,
  ];
  return new Uint8Array([
    0x89,
    ...enc('PNG'),
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...pedaco('IHDR', [...u32(1), ...u32(1), 8, 2, 0, 0, 0]),
    ...pedaco('tEXt', [...enc('Comment'), 0, ...enc(MARCA_GPS)]),
    ...pedaco('eXIf', [...enc('MM'), ...u16(42), ...u32(8), ...enc(MARCA_APARELHO)]),
    ...pedaco('IDAT', [0x78, 0x9c, 0x63, 0, 0, 0, 2, 0, 1]),
    ...pedaco('IEND', []),
  ]);
}

/** WebP com VP8X marcando EXIF e XMP, e os dois pedaços. */
export function webpComExif(): Uint8Array {
  const le32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
  const pedaco = (tipo: string, dados: number[]) => {
    const p = [...enc(tipo), ...le32(dados.length), ...dados];
    return dados.length % 2 ? [...p, 0] : p;
  };
  const corpo = [
    ...pedaco('VP8X', [0x0c, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    ...pedaco('VP8 ', [1, 2, 3, 4]),
    ...pedaco('EXIF', enc(MARCA_GPS)),
    ...pedaco('XMP ', enc(MARCA_APARELHO)),
  ];
  return new Uint8Array([...enc('RIFF'), ...le32(4 + corpo.length), ...enc('WEBP'), ...corpo]);
}

/** O texto aparece em algum lugar dos bytes? */
export function contem(bytes: Uint8Array, texto: string): boolean {
  const alvo = enc(texto);
  outer: for (let i = 0; i + alvo.length <= bytes.length; i++) {
    for (let j = 0; j < alvo.length; j++) if (bytes[i + j] !== alvo[j]) continue outer;
    return true;
  }
  return false;
}
