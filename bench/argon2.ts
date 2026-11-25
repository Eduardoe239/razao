// Página de medição do Argon2id (Volume 05, seção 3; Volume 09; D-040).
// Mede quanto tempo a derivação da senha leva neste aparelho, com os parâmetros aprovados e duas alternativas.
// Não guarda nada e não envia nada: o resultado só aparece na tela para ser copiado.
import { argon2id } from 'hash-wasm';

interface Config {
  nome: string;
  memoriaKiB: number;
  iteracoes: number;
}

const CONFIGS: Config[] = [
  { nome: 'Aprovado (64 MiB, 3 iterações)', memoriaKiB: 65536, iteracoes: 3 },
  { nome: 'Alternativa (46 MiB, 1 iteração)', memoriaKiB: 47104, iteracoes: 1 },
  { nome: 'Mínimo OWASP (19 MiB, 2 iterações)', memoriaKiB: 19456, iteracoes: 2 },
];
const RODADAS = 5;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, texto?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (texto) e.textContent = texto;
  return e;
}

async function medir(c: Config): Promise<number> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const inicio = performance.now();
  await argon2id({
    password: 'senha-de-teste-sintetica',
    salt,
    parallelism: 1,
    iterations: c.iteracoes,
    memorySize: c.memoriaKiB,
    hashLength: 32,
    outputType: 'binary',
  });
  return performance.now() - inicio;
}

const mediana = (xs: number[]): number => {
  const o = [...xs].sort((a, b) => a - b);
  return o[Math.floor(o.length / 2)] ?? 0;
};

function montar(): void {
  const raiz = document.body;
  raiz.append(el('h1', 'O Razão — medição do Argon2id'));
  raiz.append(
    el(
      'p',
      'Rode duas vezes: uma normal e outra com a CPU desacelerada 4 vezes (DevTools → Performance → CPU: 4x slowdown). Deixe só esta aba aberta.',
    ),
  );
  const info = el('pre');
  const nav = navigator as Navigator & { deviceMemory?: number };
  info.textContent = [
    `Navegador: ${navigator.userAgent}`,
    `Núcleos lógicos: ${String(navigator.hardwareConcurrency)}`,
    `Memória informada: ${nav.deviceMemory ? `${String(nav.deviceMemory)} GB` : 'não informada'}`,
  ].join('\n');
  raiz.append(info);

  const botao = el('button', 'Medir');
  const copiar = el('button', 'Copiar resultado');
  copiar.disabled = true;
  const saida = el('pre', 'Aguardando.');
  raiz.append(botao, copiar, saida);

  botao.addEventListener('click', () => {
    botao.disabled = true;
    copiar.disabled = true;
    void (async () => {
      const linhas = [
        info.textContent ?? '',
        `Rodadas por configuração: ${String(RODADAS)} (mais 1 de aquecimento)`,
        '',
      ];
      try {
        for (const c of CONFIGS) {
          saida.textContent = `Medindo: ${c.nome}…`;
          await medir(c);
          const tempos: number[] = [];
          for (let i = 0; i < RODADAS; i++) tempos.push(await medir(c));
          linhas.push(
            `${c.nome}: mediana ${mediana(tempos).toFixed(0)} ms, máximo ${Math.max(...tempos).toFixed(0)} ms`,
          );
        }
      } catch (erro) {
        linhas.push(`Falhou: ${erro instanceof Error ? erro.message : String(erro)}`);
      }
      saida.textContent = linhas.join('\n');
      botao.disabled = false;
      copiar.disabled = false;
    })();
  });

  copiar.addEventListener('click', () => {
    void navigator.clipboard.writeText(saida.textContent ?? '');
  });
}

montar();
