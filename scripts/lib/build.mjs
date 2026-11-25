// Funções da verificação do build (SEC-03 e orçamento de tamanho do Volume 09).
import { gzipSync } from 'node:zlib';

// Endereços que aparecem como texto dentro de bibliotecas, mas nunca são carregados:
// nomes de espaço do SVG/XML e o link de explicação das mensagens de erro do React.
export const TEXTOS_PERMITIDOS = [
  /^http:\/\/www\.w3\.org\//,
  /^https:\/\/react\.dev\/errors\//,
  /^https:\/\/reactjs\.org\/docs\/error-decoder/,
];

const PADRAO_URL = /\bhttps?:\/\/[^\s"'`)<>\\]+/g;

/** Lista os endereços externos de um texto que não estão na lista de permitidos. */
export function urlsExternas(texto) {
  const achados = texto.match(PADRAO_URL) ?? [];
  return [...new Set(achados)].filter((url) => !TEXTOS_PERMITIDOS.some((p) => p.test(url)));
}

/** Tamanho comprimido (gzip), em bytes, como o navegador recebe. */
export function tamanhoComprimido(conteudo) {
  return gzipSync(conteudo, { level: 9 }).length;
}

export const LIMITE_JS_INICIAL = 250 * 1024;
