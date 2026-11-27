// O código de recuperação na tela, em 4 grupos, com copiar e salvar em arquivo. Usado no primeiro acesso
// e quando um código novo é gerado (D-054).
import { useState } from 'react';
import { recoveryGroups } from '@/application/format';
import { Button } from './ds';

export function CodeBox({ code }: { code: string }) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const grupos = recoveryGroups(code);
  const texto = grupos.join('-');
  const copiar = () => {
    navigator.clipboard.writeText(texto).then(
      () => {
        setCopiado('Código copiado. Cole num lugar seguro, fora deste aparelho.');
      },
      () => {
        setCopiado('Não foi possível copiar. Anote o código à mão.');
      },
    );
  };
  const salvar = () => {
    const conteudo = `O Razão: código de recuperação do cofre\n\n${texto}\n\nGuarde este arquivo fora deste aparelho. Quem tiver o código consegue abrir o cofre.\n`;
    const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'razao-codigo-de-recuperacao.txt';
    a.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };
  return (
    <>
      <div
        className="rz-card rz-code"
        aria-label={`Código de recuperação: ${grupos.join(', ')}`}
        data-testid="codigo"
      >
        {grupos.map((g) => (
          <span key={g}>{g}</span>
        ))}
      </div>
      <div className="rz-two">
        <Button icon="copy" onClick={copiar}>
          Copiar
        </Button>
        <Button icon="download" onClick={salvar}>
          Salvar arquivo
        </Button>
      </div>
      {copiado ? (
        <p className="rz-help" role="status">
          {copiado}
        </p>
      ) : null}
    </>
  );
}
