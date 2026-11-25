// PERS-06: o navegador tinha um cofre e ele sumiu. A tela pede o backup e nunca cria cofre novo por cima.
import { Alert } from '../components/ds';

export function VaultMissing() {
  return (
    <main className="rz-auth">
      <div className="rz-auth-col rz-auth-center">
        <img className="rz-logo" src="/favicon.png" alt="O Razão" width={64} height={64} />
        <div className="rz-ob-intro">
          <h1 className="rz-ob-title">Não encontramos o seu cofre</h1>
          <p className="rz-ob-lead">
            Este navegador já teve um cofre do Razão, mas os dados não estão mais aqui. Isso acontece quando o
            navegador limpa o armazenamento do site. Para recuperar, você vai precisar do arquivo de backup.
          </p>
        </div>
        <Alert tone="warning" title="Nenhum cofre novo foi criado">
          O Razão não cria um cofre vazio por cima para não esconder o problema. A restauração pelo arquivo de
          backup ainda não está disponível nesta versão de teste.
        </Alert>
      </div>
    </main>
  );
}
