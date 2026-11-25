// Regra local do ESLint: garante as fronteiras entre camadas do Volume 06, seção 2.
// As dependências só apontam para dentro: ui → application → domain.
// Também limita quais pacotes externos cada camada pode usar.
import path from 'node:path';

const CAMADAS = ['domain', 'application', 'infra', 'ai', 'ui'];

// Quem cada camada pode importar dentro de src/.
export const PERMITIDAS = {
  domain: ['domain'],
  application: ['domain', 'application'],
  infra: ['domain', 'application', 'infra'],
  ai: ['domain', 'application', 'ai'],
  ui: ['application', 'ui'],
  // A raiz (main.tsx) monta o app e pode ligar todas as camadas.
  raiz: ['domain', 'application', 'infra', 'ai', 'ui', 'raiz'],
};

function camadaDoArquivo(arquivo, raizSrc) {
  const rel = path.relative(raizSrc, arquivo);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  const primeira = rel.split(path.sep)[0];
  return CAMADAS.includes(primeira) ? primeira : 'raiz';
}

function nomeDoPacote(origem) {
  const partes = origem.split('/');
  return origem.startsWith('@') ? partes.slice(0, 2).join('/') : partes[0];
}

/** @type {import('eslint').Rule.RuleModule} */
export const regraCamadas = {
  meta: {
    type: 'problem',
    docs: { description: 'Fronteiras entre camadas e pacotes permitidos por camada' },
    schema: [
      {
        type: 'object',
        properties: {
          raizSrc: { type: 'string' },
          pacotes: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } },
        },
        required: ['raizSrc', 'pacotes'],
        additionalProperties: false,
      },
    ],
    messages: {
      camada: 'A camada "{{de}}" não pode importar a camada "{{para}}" (Volume 06, seção 2).',
      pacote: 'A camada "{{de}}" não pode usar o pacote "{{pacote}}". Pacotes permitidos: {{lista}}.',
    },
  },
  create(context) {
    const { raizSrc, pacotes } = context.options[0];
    const arquivo = context.filename;
    const de = camadaDoArquivo(arquivo, raizSrc);
    if (!de) return {};

    function verificar(no, origem) {
      if (typeof origem !== 'string') return;
      let alvo = null;
      if (origem.startsWith('@/')) alvo = path.join(raizSrc, origem.slice(2));
      else if (origem.startsWith('.')) alvo = path.resolve(path.dirname(arquivo), origem);

      if (alvo) {
        const para = camadaDoArquivo(alvo, raizSrc) ?? 'fora de src';
        if (!PERMITIDAS[de].includes(para)) {
          context.report({ node: no, messageId: 'camada', data: { de, para } });
        }
        return;
      }
      // Arquivos de estilo e de fonte não são código, então não contam como dependência de camada.
      const pacote = nomeDoPacote(origem);
      const permitidos = pacotes[de] ?? [];
      if (de !== 'raiz' && !permitidos.includes(pacote)) {
        context.report({
          node: no,
          messageId: 'pacote',
          data: { de, pacote, lista: permitidos.length ? permitidos.join(', ') : 'nenhum' },
        });
      }
    }

    return {
      ImportDeclaration: (no) => verificar(no, no.source.value),
      ExportNamedDeclaration: (no) => no.source && verificar(no, no.source.value),
      ExportAllDeclaration: (no) => verificar(no, no.source.value),
      ImportExpression: (no) => no.source.type === 'Literal' && verificar(no, no.source.value),
    };
  },
};

export default { rules: { camadas: regraCamadas } };
