// PRIV-08 e LAN-009 sem cofre: tipo pelos bytes, limpeza de metadados e limites do comprovante.
import { describe, expect, it } from 'vitest';
import {
  MARCA_APARELHO,
  MARCA_GPS,
  comGps,
  contem,
  jpegMinimo,
  pngComTexto,
  webpComExif,
} from '@/domain/testing/image-fixtures';
import { MAX_ATTACHMENT_BYTES, cleanName, prepareAttachment, rootFinder } from './attachment-ops';
import { imageMetadata, sniffKind, stripImageMetadata } from './image-metadata';
import type { JournalEntry } from '@/domain/ledger';

const semMarcas = (b: Uint8Array) =>
  !contem(b, MARCA_GPS) && !contem(b, MARCA_APARELHO) && !contem(b, 'Exif');

describe('[PRIV-08] comprovante sem metadados de imagem', () => {
  it('JPEG com localização sai sem EXIF, sem comentário e com a imagem intacta', () => {
    const original = comGps(jpegMinimo());
    expect(contem(original, MARCA_GPS)).toBe(true);
    expect(imageMetadata(original, 'jpeg')).toEqual(['APP1', 'COM']);
    const limpo = stripImageMetadata(original, 'jpeg');
    expect(semMarcas(limpo)).toBe(true);
    expect(imageMetadata(limpo, 'jpeg')).toEqual([]);
    // Tirar o que foi posto devolve o JPEG de antes, byte a byte.
    expect([...limpo]).toEqual([...jpegMinimo()]);
  });

  it('PNG perde os pedaços de texto e EXIF e mantém os da imagem', () => {
    const limpo = stripImageMetadata(pngComTexto(), 'png');
    expect(semMarcas(limpo)).toBe(true);
    expect(imageMetadata(limpo, 'png')).toEqual([]);
    expect(contem(limpo, 'IHDR') && contem(limpo, 'IDAT') && contem(limpo, 'IEND')).toBe(true);
  });

  it('WebP perde EXIF e XMP, as marcas do VP8X e o tamanho do RIFF continua certo', () => {
    const limpo = stripImageMetadata(webpComExif(), 'webp');
    expect(semMarcas(limpo)).toBe(true);
    expect(imageMetadata(limpo, 'webp')).toEqual([]);
    expect(new DataView(limpo.buffer).getUint32(4, true)).toBe(limpo.length - 8);
    expect((limpo[20] ?? 0) & 0x0c).toBe(0);
  });

  it('prepareAttachment entrega a imagem limpa e confere antes de qualquer gravação', () => {
    const r = prepareAttachment(comGps(jpegMinimo()));
    expect(r.kind).toBe('jpeg');
    expect(semMarcas(r.bytes)).toBe(true);
  });
});

describe('[LAN-009] tipo e tamanho do comprovante', () => {
  it('reconhece o tipo pelos bytes, não pelo nome', () => {
    expect(sniffKind(jpegMinimo())).toBe('jpeg');
    expect(sniffKind(pngComTexto())).toBe('png');
    expect(sniffKind(webpComExif())).toBe('webp');
    expect(sniffKind(new TextEncoder().encode('%PDF-1.7\n'))).toBe('pdf');
    expect(sniffKind(new TextEncoder().encode('<html><script>'))).toBeNull();
    expect(sniffKind(new Uint8Array())).toBeNull();
  });

  it('recusa o que não é foto nem PDF, imagem quebrada e arquivo acima de 5 MB', () => {
    expect(() => prepareAttachment(new TextEncoder().encode('MZ executável'))).toThrow(/JPG, PNG ou WebP/);
    expect(() => prepareAttachment(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff]))).toThrow(
      /ler esta imagem/,
    );
    const grande = new Uint8Array(MAX_ATTACHMENT_BYTES + 1);
    grande.set(new TextEncoder().encode('%PDF-1.4'));
    expect(() => prepareAttachment(grande)).toThrow(/5 MB/);
    const noLimite = grande.subarray(0, MAX_ATTACHMENT_BYTES);
    expect(prepareAttachment(noLimite).kind).toBe('pdf');
  });

  it('PDF fica como veio', () => {
    const pdf = new TextEncoder().encode('%PDF-1.7\n/Producer (Banco Teste)\n%%EOF');
    expect([...prepareAttachment(pdf).bytes]).toEqual([...pdf]);
  });

  it('o nome guardado não tem caminho nem caractere estranho e leva a extensão de verdade', () => {
    expect(cleanName('C:\\fotos\\..\\recibo<1>.png', 'jpeg')).toBe('recibo1.jpg');
    expect(cleanName('nota\u202efdp.exe', 'pdf')).toBe('notafdp.pdf');
    expect(cleanName('', 'png')).toBe('comprovante.png');
    expect(cleanName('a'.repeat(300), 'pdf').length).toBeLessThanOrEqual(120);
  });

  it('a corrente de edições volta sempre ao primeiro lançamento, mesmo com ciclo adulterado', () => {
    const e = (entryId: string, replaces?: string) =>
      ({ entryId, links: replaces ? { replaces } : {} }) as unknown as JournalEntry;
    const raiz = rootFinder([e('a'), e('b', 'a'), e('c', 'b'), e('x', 'y'), e('y', 'x')]);
    expect(raiz('c')).toBe('a');
    expect(raiz('b')).toBe('a');
    expect(raiz('a')).toBe('a');
    expect(['x', 'y']).toContain(raiz('x'));
  });
});
